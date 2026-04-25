import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center px-4 text-center">
      {/* Ikon desa */}
      <div className="w-20 h-20 rounded-3xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-6">
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
          <path d="M16 4L28 13H4L16 4Z" fill="#0ea5e9" fillOpacity="0.9" />
          <rect x="6" y="13" width="20" height="13" rx="1" fill="#0ea5e9" fillOpacity="0.2" />
          <rect x="13" y="19" width="6" height="7" rx="1" fill="#0ea5e9" fillOpacity="0.6" />
          <circle cx="16" cy="10" r="1.5" fill="#fff" fillOpacity="0.9" />
        </svg>
      </div>

      {/* Angka 404 */}
      <p className="text-8xl font-black text-slate-800 leading-none select-none">404</p>

      {/* Pesan */}
      <h1 className="mt-4 text-base font-semibold text-slate-200">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-xs">
        Halaman yang Anda cari tidak ada atau telah dipindahkan.
      </p>

      {/* Tombol */}
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-400 text-sm font-medium hover:bg-sky-500/25 transition-colors"
      >
        ← Kembali ke Beranda
      </Link>
    </div>
  )
}
