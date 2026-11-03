import Link from 'next/link'
import { ArrowLeft, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="sys-pg">
      {/* Ikon desa */}
      <div className="sys-ic">
        <Landmark className="i" />
      </div>

      {/* Angka 404 */}
      <div className="sys-code" aria-hidden="true">404</div>

      {/* Pesan */}
      <h1>Halaman tidak ditemukan</h1>
      <p>Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>

      {/* Tombol */}
      <div className="sys-acts">
        <Button asChild>
          <Link href="/dashboard"><ArrowLeft className="i" />Kembali ke Beranda</Link>
        </Button>
      </div>
    </div>
  )
}
