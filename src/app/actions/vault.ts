"use server"

import { supabaseAdmin } from "@/lib/supabase-server"
import { nanoid } from "nanoid"
import { hash } from "bcrypt-ts"

export async function createVaultAction(formData: FormData) {
  try {
    const password = formData.get("password") as string
    const hint = formData.get("hint") as string
    
    // Validasi basic
    if (!password || password.length < 4) {
      return { error: "Password minimal 4 karakter." }
    }

    // Hash the password
    const hashedPassword = await hash(password, 10)
    
    // Generate unique slug short ID
    const slug = nanoid(8)

    // Insert into 'vaults' table
    const { data: vault, error: vaultError } = await supabaseAdmin
      .from('vaults')
      .insert({
        slug,
        password_hash: hashedPassword,
        hint: hint || null
      })
      .select('id')
      .single()

    if (vaultError) {
      console.error("Vault Creation Error:", vaultError)
      return { error: "Gagal membuat brankas di database." }
    }

    return { vaultId: vault.id, slug }
  } catch (err) {
    console.error(err)
    return { error: "Terjadi kesalahan internal server." }
  }
}

// Untuk file uploads, lebih efektif menggunakan signed URLs untuk upload client-side, 
// ATAU mengirim URL public/private storage, ATAU file upload dihandle client ke bucket,
// dan kemudian baru manggil aksi record ke tabel `files`.
// Kita asumsikan client yang upload, lalu ID dan metadata dikirim kesini:

export async function addFilesRecordsAction(vaultId: string, filesMetadata: {
  file_type: string,
  file_name: string,
  file_path: string,
  size?: number
}[]) {
  try {
    // Siapkan data dengan menyisipkan vaultId
    const inserts = filesMetadata.map(file => ({
      ...file,
      vault_id: vaultId
    }))

    const { error } = await supabaseAdmin
      .from('files')
      .insert(inserts)

    if (error) {
      console.error("Files Record Error:", error)
      return { error: "Gagal menyimpan metadata file ke database." }
    }

    return { success: true }
  } catch (err) {
    console.error(err)
    return { error: "Terjadi kesalahan saat mencatat file." }
  }
}

import { compare } from "bcrypt-ts"

export async function unlockVaultAction(slug: string, passwordInput: string) {
  try {
    // Cari brankas berdasarkan slug
    const { data: vault, error: vaultErr } = await supabaseAdmin
      .from('vaults')
      .select('id, password_hash, hint')
      .eq('slug', slug)
      .single()

    if (vaultErr || !vault) {
      return { error: "Brankas tidak ditemukan." }
    }

    // Verifikasi password
    const isMatch = await compare(passwordInput, vault.password_hash)
    if (!isMatch) {
      return { error: "Sandi salah." }
    }

    // Ambil daftar file
    const { data: files, error: filesErr } = await supabaseAdmin
      .from('files')
      .select('id, file_type, file_name, file_path, size, created_at')
      .eq('vault_id', vault.id)
      .order('created_at', { ascending: true })

    if (filesErr) {
      return { error: "Gagal mengambil daftar file dalam brankas." }
    }

    // Untuk file fisik (bukan link), kita perlu men-generate signed URL agar bisa di-download / play media
    // Kita generate signed URL yang berlaku selama 1 jam (3600 detik)
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        if (file.file_type === "link") {
          return { ...file, url: file.file_path }
        } else {
          const { data } = await supabaseAdmin.storage
            .from('vault_files')
            .createSignedUrl(file.file_path, 3600)
          
          return {
            ...file,
            url: data?.signedUrl || null
          }
        }
      })
    )

    return { 
      success: true, 
      files: filesWithUrls 
    }
  } catch (err) {
    console.error(err)
    return { error: "Terjadi kesalahan internal." }
  }
}

export async function deleteVaultAction(slug: string, passwordInput: string) {
  try {
    // Cari brankas
    const { data: vault, error: vaultErr } = await supabaseAdmin
      .from('vaults')
      .select('id, password_hash')
      .eq('slug', slug)
      .single()

    if (vaultErr || !vault) return { error: "Brankas tidak ditemukan." }

    // Verifikasi sandi
    const isMatch = await compare(passwordInput, vault.password_hash)
    if (!isMatch) return { error: "Sandi salah untuk menghapus brankas." }

    // Ambil semua file path untuk dihapus di storage
    const { data: files } = await supabaseAdmin
      .from('files')
      .select('file_path, file_type')
      .eq('vault_id', vault.id)

    if (files && files.length > 0) {
      const storagePaths = files
        .filter(f => f.file_type !== 'link') // Jangan coba hapus link text dari storage
        .map(f => f.file_path)

      if (storagePaths.length > 0) {
        await supabaseAdmin.storage.from('vault_files').remove(storagePaths)
      }
    }

    // Hapus brankas dari tabel (tabel files terhapus otomatis karena CASCADE)
    const { error: delErr } = await supabaseAdmin.from('vaults').delete().eq('id', vault.id)

    if (delErr) return { error: "Gagal menghapus brankas dari database." }

    return { success: true }
  } catch (err) {
    console.error(err)
    return { error: "Kesalahan server saat menghapus." }
  }
}
