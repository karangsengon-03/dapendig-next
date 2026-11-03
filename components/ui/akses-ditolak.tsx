import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Kartu "akses ditolak" bersama (pola .a-empty). Dipakai di halaman yang aksinya dibatasi peran:
 * /pengaturan dan 8 utilitas migrasi (admin), /penduduk/[id]/edit (operator atau admin).
 * Bungkus sendiri dengan <AppShell> di halaman pemakai.
 */
export function AksesDitolak({
  judul, keterangan, href, label,
}: {
  judul: string
  keterangan: string
  href: string
  label: string
}) {
  return (
    <div className="a-card">
      <div className="a-empty" style={{ padding: '70px 24px' }}>
        <div className="em"><Lock className="i" style={{ fontSize: 30 }} /></div>
        <h3>{judul}</h3>
        <p>{keterangan}</p>
        <Button asChild style={{ marginTop: 10 }}>
          <Link href={href}>{label}</Link>
        </Button>
      </div>
    </div>
  )
}

/** Versi untuk halaman khusus Admin. */
export function AksesDitolakAdmin() {
  return (
    <AksesDitolak
      judul="Halaman ini hanya untuk Admin"
      keterangan="Hubungi admin untuk mengubah pengaturan"
      href="/dashboard"
      label="Ke beranda"
    />
  )
}
