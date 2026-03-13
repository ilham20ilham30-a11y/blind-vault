import { Uploader } from "@/components/uploader"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FAF8F5] w-full relative overflow-hidden flex flex-col items-center">
      {/* Background Ornamen Lembut */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-100/60 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-rose-100/60 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container max-w-4xl mx-auto px-4 py-16 relative z-10 flex flex-col items-center min-h-screen">
        
        {/* Header / Hero */}
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white border border-stone-100 rounded-2xl mb-4 shadow-sm">
            <span className="text-3xl">🗃️</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-stone-800">
            Blind <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">Vault</span>
          </h1>
          <p className="text-base text-stone-500 max-w-lg mx-auto leading-relaxed">
            Simpan dan bagikan file, gambar, lagu, atau link secara rahasia. 
            Isi filemu aman tersembunyi di balik sandi rahasia.
          </p>
        </div>

        {/* Uploader Component */}
        <div className="w-full">
          <Uploader />
        </div>
        
      </div>
    </main>
  )
}
