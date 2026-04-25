export default function Loading() {
  return (
    <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center gap-4">
      {/* Icon baru — balai desa, bersih tanpa border tambahan */}
      <div
        className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#16447a' }}
      >
        <img
          src="/icons/icon-192.png"
          alt="DaPenDig"
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-base font-semibold text-slate-100">Data Penduduk Digital</p>
        <p className="text-xs text-slate-500">Desa Karang Sengon</p>
      </div>
      <div className="w-5 h-5 border-2 border-white/[0.06] border-t-sky-500 rounded-full animate-spin mt-1" />
    </div>
  )
}
