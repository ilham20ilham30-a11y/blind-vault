import { supabaseAdmin } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import { VaultViewer } from "@/components/vault-viewer"

export const dynamic = 'force-dynamic'

export default async function VaultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Cek eksistensi brankas
  const { data: vault, error } = await supabaseAdmin
    .from('vaults')
    .select('hint')
    .eq('slug', slug)
    .single()

  if (error || !vault) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] w-full relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background Gradients Lembut */}
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-orange-100/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[600px] h-[600px] bg-rose-100/40 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">
        <VaultViewer slug={slug} hint={vault.hint} />
      </div>
    </main>
  )
}
