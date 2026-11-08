'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CircleAlert, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <div className="sys-pg">
      {/* Ikon error */}
      <div className="sys-ic bad">
        <CircleAlert className="i" />
      </div>

      <h1>Terjadi kesalahan</h1>
      <p>Aplikasi mengalami error yang tidak terduga. Coba muat ulang halaman.</p>

      {/* Detail error (dev only) */}
      {process.env.NODE_ENV === 'development' && error?.message && (
        <pre>{error.message}</pre>
      )}

      <div className="sys-acts">
        <Button onClick={reset}>
          <RotateCw className="i" />
          Coba Lagi
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Ke Beranda</Link>
        </Button>
      </div>
    </div>
  )
}
