"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Lock, Unlock, Link as LinkIcon, Download, Music, Image as ImageIcon, Archive, FileText, ExternalLink, ShieldAlert, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { unlockVaultAction, deleteVaultAction } from "@/app/actions/vault"
import { cn } from "@/lib/utils"

type VaultItem = { id: string, file_type: string, file_name: string, url: string | null, size: number }

const Button = ({ children, onClick, disabled, variant = "primary", className, type = "button" }: any) => {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
  const variants = {
    primary: "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20 px-4 py-2",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/20 px-4 py-2",
    secondary: "bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-4 py-2 shadow-sm",
    ghost: "bg-transparent hover:bg-stone-100 text-stone-600 px-4 py-2",
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(base, variants[variant as keyof typeof variants], className)}>
      {children}
    </button>
  )
}

const Input = ({ className, ...props }: any) => (
  <input 
    className={cn("flex h-12 w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-800 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-50", className)}
    {...props} 
  />
)

export function VaultViewer({ slug, hint }: { slug: string, hint: string | null }) {
  const [password, setPassword] = useState("")
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [shake, setShake] = useState(false)
  const [items, setItems] = useState<VaultItem[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setIsUnlocking(true)
    const result = await unlockVaultAction(slug, password)
    
    if (result.error) {
      toast.error(result.error)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } else if (result.success && result.files) {
      setItems(result.files)
      setIsUnlocked(true)
      toast.success("Brankas berhasil dibuka!")
    }
    setIsUnlocking(false)
  }

  const handleDelete = async () => {
    if (!confirm("Peringatan: Kamu akan menghapus brankas ini DAN seluruh isi filenya untuk selamanya. Lanjutkan?")) return
    setIsDeleting(true)
    
    // Karena user sudah masuk (isUnlocked), "password" state masih tersimpan sebagai sandi yang benar
    const res = await deleteVaultAction(slug, password)
    if (res.error) {
      toast.error(res.error)
      setIsDeleting(false)
    } else {
      toast.success("Brankas telah dihancurkan secara permanen.")
      window.location.href = "/" // arahkan kembali ke beranda
    }
  }

  const getIcon = (type: string) => {
    if (type === "image") return <ImageIcon className="w-8 h-8 text-rose-400" />
    if (type === "audio") return <Music className="w-8 h-8 text-orange-400" />
    if (type === "archive") return <Archive className="w-8 h-8 text-amber-500" />
    if (type === "link") return <LinkIcon className="w-8 h-8 text-emerald-500" />
    return <FileText className="w-8 h-8 text-stone-400" />
  }

  if (isUnlocked) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full bg-white border border-stone-200 rounded-[2rem] p-6 sm:p-10 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-stone-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <Unlock className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-800">Brankas Terbuka</h2>
              <p className="text-stone-500 flex items-center gap-1">Kamu mengakses brankas <span className="font-mono text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded text-sm">{slug}</span></p>
            </div>
          </div>
          <Button variant="danger" disabled={isDeleting} onClick={handleDelete} className="gap-2 self-start sm:self-center">
            <Trash2 className="w-4 h-4" /> {isDeleting ? "Menghapus..." : "Hancurkan Brankas"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div key={item.id} className="bg-[#FAF8F5] hover:bg-stone-50 transition-colors border border-stone-200 rounded-2xl p-5 flex flex-col justify-between group">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2 bg-white shadow-sm border border-stone-100 rounded-lg group-hover:-translate-y-1 transition-transform">
                  {getIcon(item.file_type)}
                </div>
                <div className="overflow-hidden flex-1">
                  <h4 className="font-medium text-stone-700 truncate text-sm" title={item.file_name}>{item.file_name}</h4>
                  {item.file_type !== "link" && <p className="text-xs text-stone-400">{(item.size / 1024 / 1024).toFixed(2)} MB</p>}
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-stone-200/60">
                {item.file_type === "link" ? (
                  <Button variant="secondary" className="w-full gap-2" onClick={() => window.open(item.url!, "_blank", "noopener,noreferrer")}>
                    Buka Tautan <ExternalLink className="w-4 h-4" />
                  </Button>
                ) : item.file_type === "audio" ? (
                  <audio controls className="w-full h-10 outline-none">
                    <source src={item.url!} type="audio/mpeg" />
                  </audio>
                ) : (
                  <Button variant="primary" className="w-full gap-2" onClick={() => {
                    const a = document.createElement("a"); a.href = item.url!; a.download = item.file_name; a.target = "_blank"; a.click();
                  }}>
                    Unduh <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -20 }} className="w-full max-w-md mx-auto">
      <motion.div 
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}
        className="bg-white border border-stone-200 p-8 sm:p-10 rounded-[2rem] shadow-xl flex flex-col items-center text-center"
      >
        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-orange-100">
          <Lock className="w-10 h-10 text-orange-500" />
        </div>
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Brankas Terkunci</h1>
        <p className="text-stone-500 mb-8 px-2 text-sm">Seseorang membagikan brankas misterius kepadamu. Masukkan sandinya untuk membuka.</p>

        {hint && (
          <div className="bg-orange-50/50 border border-orange-100 w-full p-3.5 rounded-xl mb-6 flex items-start gap-3 text-left">
            <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Petunjuk</p>
              <p className="text-sm text-stone-700">{hint}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <Input 
            type="password" autoFocus placeholder="Masukkan Sandi Rahasia..." value={password} onChange={(e:any) => setPassword(e.target.value)}
            className="h-14 text-center text-lg shadow-inner bg-[#FAF8F5]"
          />
          <Button type="submit" disabled={isUnlocking} className="w-full h-14 text-lg bg-orange-500 rounded-xl" variant="primary">
            {isUnlocking ? "Memverifikasi..." : "Akses Sekarang"}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  )
}
