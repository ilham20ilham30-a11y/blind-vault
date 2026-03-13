"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone, FileRejection } from "react-dropzone"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, File as FileIcon, Link as LinkIcon, UploadCloud, X, Plus, Music, Image as ImageIcon, Archive, FileText, CheckCircle2, History, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { createVaultAction, addFilesRecordsAction } from "@/app/actions/vault"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type VaultItem = 
  | { type: "file"; file: File; id: string }
  | { type: "link"; url: string; title: string; id: string }

type VaultHistory = {
  slug: string
  date: string
  itemCount: number
}

// Reusable Button Light Mode
const Button = ({ children, onClick, disabled, variant = "primary", className, type = "button" }: any) => {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
  const variants = {
    primary: "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20 px-4 py-2",
    secondary: "bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-4 py-2 shadow-sm",
    ghost: "bg-transparent hover:bg-stone-100 text-stone-600 px-4 py-2",
    icon: "p-2 bg-transparent hover:bg-stone-100 text-stone-500 rounded-lg",
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(base, variants[variant as keyof typeof variants], className)}>
      {children}
    </button>
  )
}

// Reusable Input Light Mode
const Input = ({ className, ...props }: any) => (
  <input 
    className={cn("flex h-12 w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-800 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-stone-800 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50", className)}
    {...props} 
  />
)

export function Uploader() {
  const [items, setItems] = useState<VaultItem[]>([])
  const [password, setPassword] = useState("")
  const [hint, setHint] = useState("")
  
  const [isUploading, setIsUploading] = useState(false)
  const [linkInput, setLinkInput] = useState("")
  const [linkTitle, setLinkTitle] = useState("")
  const [showLinkInput, setShowLinkInput] = useState(false)

  const [finishedSlug, setFinishedSlug] = useState<string | null>(null)
  
  // History Brankas (LocalStorage)
  const [history, setHistory] = useState<VaultHistory[]>([])

  useEffect(() => {
    const saved = localStorage.getItem("vault_history")
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch (e) { }
    }
  }, [])

  const saveToHistory = (slug: string, count: number) => {
    const newEntry = { slug, date: new Date().toLocaleDateString("id-ID"), itemCount: count }
    const updated = [newEntry, ...history].slice(0, 10) // simpan maks 10 terakhir
    setHistory(updated)
    localStorage.setItem("vault_history", JSON.stringify(updated))
  }

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      toast.error("Beberapa file ditolak (maksimal 50MB).")
    }
    const newItems: VaultItem[] = acceptedFiles.map(file => ({
      type: "file",
      file,
      id: Math.random().toString(36).substring(7)
    }))
    setItems(prev => [...prev, ...newItems])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxSize: 50 * 1024 * 1024 }) // 50MB maks

  const addLink = () => {
    if (!linkInput) return toast.error("URL tautan wajib diisi")
    let validUrl = linkInput
    if (!/^https?:\/\//i.test(validUrl)) validUrl = 'https://' + validUrl
    
    setItems(prev => [...prev, {
      type: "link",
      url: validUrl,
      title: linkTitle || validUrl,
      id: Math.random().toString(36).substring(7)
    }])
    setLinkInput("")
    setLinkTitle("")
    setShowLinkInput(false)
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleCreateVault = async () => {
    if (items.length === 0) return toast.error("Masukkan minimal 1 file atau link!")
    if (password.length < 4) return toast.error("Sandi minimal 4 karakter.")

    setIsUploading(true)
    const toastId = toast.loading("Merakit brankas rahasia...")

    try {
      const formData = new FormData()
      formData.append("password", password)
      formData.append("hint", hint)
      
      const vaultResult = await createVaultAction(formData)
      if (vaultResult.error || !vaultResult.vaultId) {
        throw new Error(vaultResult.error || "Gagal membuat brankas.")
      }
      
      const { vaultId, slug } = vaultResult
      toast.loading("Menyandi dan menyimpan file ke brankas...", { id: toastId })

      const filesMetadata = []

      for (const item of items) {
        if (item.type === "file") {
          const file = item.file
          const filePath = `${vaultId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`
          
          const { error: uploadErr } = await supabase.storage
            .from("vault_files")
            .upload(filePath, file)
            
          if (uploadErr) {
            console.error("Upload error:", uploadErr)
            throw new Error(`Gagal mengunggah file: ${file.name}`)
          }

          let fileType = "archive"
          if (file.type.startsWith("image/")) fileType = "image"
          else if (file.type.startsWith("audio/")) fileType = "audio"
          else if (file.type.startsWith("video/")) fileType = "video"

          filesMetadata.push({ file_type: fileType, file_name: file.name, file_path: filePath, size: file.size })
        } else if (item.type === "link") {
          filesMetadata.push({ file_type: "link", file_name: item.title, file_path: item.url, size: 0 })
        }
      }

      const recordResult = await addFilesRecordsAction(vaultId, filesMetadata)
      if (recordResult.error) throw new Error(recordResult.error)

      saveToHistory(slug || "", items.length)
      toast.success("Brankas berhasil dikunci!", { id: toastId })
      setFinishedSlug(slug || "")

    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan.", { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  const getIconForFile = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-rose-400" />
    if (file.type.startsWith("audio/")) return <Music className="w-5 h-5 text-orange-400" />
    if (file.type.includes("zip") || file.type.includes("rar")) return <Archive className="w-5 h-5 text-amber-500" />
    return <FileText className="w-5 h-5 text-stone-400" />
  }

  if (finishedSlug) {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/v/${finishedSlug}`
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-xl mx-auto bg-white p-8 rounded-3xl border border-stone-200 shadow-xl flex flex-col items-center text-center"
      >
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-stone-800 mb-2">Brankas Terkunci & Siap!</h2>
        <p className="text-stone-500 mb-6">
          Bagikan tautan ini ke orang yang ingin kamu tuju. Ingat, mereka butuh sandimu untuk membukanya.
        </p>

        <div className="w-full bg-stone-50 p-4 rounded-xl border border-stone-200 flex items-center justify-between gap-4 mb-8">
          <span className="text-stone-600 font-mono text-sm truncate select-all">{shareUrl}</span>
          <Button onClick={() => {
            navigator.clipboard.writeText(shareUrl)
            toast.success("Tautan disalin!")
          }} variant="secondary" className="whitespace-nowrap">
            Salin Link
          </Button>
        </div>

        <div className="flex gap-4">
          <Link href={`/v/${finishedSlug}`}>
            <Button variant="secondary">Lihat Sendiri</Button>
          </Link>
          <Button onClick={() => {
            setItems([]); setPassword(""); setHint(""); setFinishedSlug(null)
          }} variant="ghost">Bikin Lagi</Button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-10">
      
      {/* Box Utama Pembuatan Brankas */}
      <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-xl border border-stone-100 ring-1 ring-stone-900/5">
        
        {/* Zona Drop */}
        <div 
          {...getRootProps()} 
          className={cn(
            "relative overflow-hidden border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 group mb-8",
            isDragActive ? "border-orange-400 bg-orange-50/50" : "border-stone-200 hover:border-orange-300 hover:bg-stone-50/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-8 h-8 text-stone-400 group-hover:text-orange-400 transition-colors" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-stone-800 mb-1">Tarik file atau klik area ini</h3>
            <p className="text-sm text-stone-500">Gambar, lagu, video, file RAR/ZIP (Maks 50MB)</p>
          </div>
        </div>

        {/* Input Tautan Opsional */}
        <div className="mb-8 border-b border-stone-100 pb-8">
          {!showLinkInput ? (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setShowLinkInput(true)} className="rounded-full !py-2.5">
                <LinkIcon className="w-4 h-4 mr-2" /> Atau sisipkan Web Tautan (Link)
              </Button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row gap-3">
              <Input 
                placeholder="Judul tautan..." 
                value={linkTitle} 
                onChange={(e:any) => setLinkTitle(e.target.value)}
                className="bg-white"
              />
              <Input 
                placeholder="https://..." 
                value={linkInput} 
                onChange={(e:any) => setLinkInput(e.target.value)}
                className="bg-white sm:w-[150%]"
                autoFocus
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={addLink} className="w-full sm:w-auto">Sisipkan</Button>
                <Button variant="ghost" onClick={() => setShowLinkInput(false)} className="px-3 bg-stone-200/50"><X className="w-5 h-5 text-stone-600" /></Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* List File yang mau di lock */}
        {items.length > 0 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-stone-800 tracking-wide uppercase">Isi Brankas ({items.length})</h4>
              <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, scale: 0.95 }}
                      className="flex items-center justify-between bg-white border border-stone-100 p-3 rounded-xl shadow-sm"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-stone-50 rounded-lg">
                          {item.type === "file" ? getIconForFile(item.file) : <LinkIcon className="w-5 h-5 text-emerald-500" />}
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-stone-700 truncate max-w-[150px] sm:max-w-[250px]">
                            {item.type === "file" ? item.file.name : item.title}
                          </p>
                          {item.type === "file" && <p className="text-xs text-stone-400">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>}
                          {item.type === "link" && <p className="text-xs text-stone-400 truncate max-w-[150px] sm:max-w-xs">{item.url}</p>}
                        </div>
                      </div>
                      <Button variant="icon" onClick={() => removeItem(item.id)} className="text-stone-400 hover:text-red-500 hover:bg-red-50">
                        <X className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Set Sandi Section */}
            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Lock className="w-5 h-5" />
                <h4 className="font-semibold text-orange-800">Tahap Akhir: Kunci Brankas</h4>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-stone-500 ml-1 mb-1 block">Sandi (Minimal 4 huruf)</label>
                  <Input 
                    type="password" 
                    placeholder="Masukkan sandi..." 
                    value={password}
                    onChange={(e:any) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 ml-1 mb-1 block">Petunjuk agar gak lupa (Opsional)</label>
                  <Input 
                    type="text" 
                    placeholder="Cth: Tempat kencan pertama" 
                    value={hint}
                    onChange={(e:any) => setHint(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleCreateVault}
                disabled={isUploading}
                className="w-full text-base py-4 bg-orange-500 shadow-orange-500/30 hover:shadow-orange-500/50 hover:bg-orange-600 mt-2 hover:-translate-y-0.5 rounded-[1rem]"
              >
                {isUploading ? "Memproses..." : "Gembok & Dapatkan Tautan"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* History Area */}
      {history.length > 0 && !finishedSlug && (
        <div className="w-full max-w-xl mx-auto mt-12">
          <div className="flex items-center gap-2 mb-4 text-stone-500">
            <History className="w-5 h-5" />
            <h3 className="font-medium">Brankas yang pernah kamu buat</h3>
          </div>
          <div className="grid gap-3">
            {history.map((h, i) => (
              <div key={h.slug + i} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between group shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-stone-800 font-medium bg-stone-100 px-2 py-0.5 rounded-md text-sm">{h.slug}</span>
                    <span className="text-xs text-stone-400">• {h.date}</span>
                  </div>
                  <p className="text-sm text-stone-500">Berisi {h.itemCount} item rahasia</p>
                </div>
                <Link href={`/v/${h.slug}`}>
                  <Button variant="ghost" className="gap-2 group-hover:bg-stone-100">
                    Buka <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
