export default function Loading() {
  return (
    <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shadow-lg shadow-sky-500/10">
        <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
          <path d="M16 4L28 13H4L16 4Z" fill="#0ea5e9" fillOpacity="0.95" />
          <rect x="6" y="13" width="20" height="13" rx="1" fill="#0ea5e9" fillOpacity="0.25" />
          <rect x="13" y="19" width="6" height="7" rx="1" fill="#0ea5e9" fillOpacity="0.75" />
          <circle cx="9" cy="22" r="1.8" fill="#38bdf8" fillOpacity="0.85" />
          <circle cx="23" cy="22" r="1.8" fill="#38bdf8" fillOpacity="0.85" />
          <circle cx="16" cy="10" r="1.5" fill="#fff" fillOpacity="0.95" />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-base font-bold text-slate-100">DaPenDig Next</p>
        <p className="text-xs text-sky-400">Data Penduduk Digital</p>
      </div>
      <div className="w-6 h-6 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin mt-2" />
    </div>
  )
}
