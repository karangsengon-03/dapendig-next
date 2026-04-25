'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log ke console untuk debugging
    console.error('[DaPenDig Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center px-4 text-center">
      {/* Ikon error */}
      <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h1 className="text-base font-semibold text-slate-200">Terjadi Kesalahan</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-xs">
        Aplikasi mengalami error yang tidak terduga. Coba muat ulang halaman.
      </p>

      {/* Detail error (dev only) */}
      {process.env.NODE_ENV === 'development' && error?.message && (
        <pre className="mt-4 max-w-sm w-full text-left text-xs bg-rose-950/40 border border-rose-800/40 text-rose-300 rounded-xl p-3 overflow-auto">
          {error.message}
        </pre>
      )}

      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-400 text-sm font-medium hover:bg-sky-500/25 transition-colors"
        >
          Coba Lagi
        </button>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-400 text-sm font-medium hover:text-slate-200 hover:bg-white/[0.08] transition-colors"
        >
          Ke Beranda
        </Link>
      </div>
    </div>
  )
}
