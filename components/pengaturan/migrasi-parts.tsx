'use client'

import { ArrowLeft, Check, CircleAlert, CircleCheck, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

/*
 * Bagian tampilan bersama halaman utilitas migrasi/perbaikan (Tahap 5B).
 * MURNI tampilan: tidak memanggil hook data; semua logika, urutan langkah, dan
 * teks tetap di masing-masing halaman.
 */

/** Kerangka halaman: kepala (tombol kembali + judul), kartu isi, dan catatan akses admin. */
export function MigLayout({
  title, desc, before, children,
}: { title: string; desc?: string; before?: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="pg-mig">
      <div className="mig-head">
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Kembali">
          <ArrowLeft className="i" />
        </Button>
        <div className="min-w-0">
          <h1>{title}</h1>
          {desc && <p>{desc}</p>}
        </div>
      </div>
      {before && <div style={{ marginBottom: 14 }}>{before}</div>}
      <div className="a-card p mig-card">{children}</div>
      <p className="mig-note">Hanya dapat diakses oleh admin.</p>
    </div>
  )
}

/** Kotak keterangan (cara kerja, daftar koleksi, hasil pemeriksaan). */
export function MigBox({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="mig-box">
      {title && <span className="ttl">{title}</span>}
      {children}
    </div>
  )
}

/** Tombol utama langkah awal (Scan / Cek) — lebar penuh. */
export function MigPrimary({
  onClick, disabled, icon, tone = 'default', children,
}: {
  onClick: () => void
  disabled?: boolean
  icon?: React.ReactNode
  tone?: 'default' | 'gold'
  children: React.ReactNode
}) {
  return (
    <Button variant={tone} className="w-full" onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </Button>
  )
}

/** Keadaan "tidak ada yang perlu diubah". */
export function MigEmpty({
  title, text, onBack, backLabel = 'Kembali',
}: { title: string; text?: string; onBack: () => void; backLabel?: string }) {
  return (
    <div className="mig-empty">
      <div className="em"><CircleCheck className="i" /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      <Button variant="secondary" onClick={onBack} style={{ marginTop: 6 }}>{backLabel}</Button>
    </div>
  )
}

/** Baris ringkasan di atas tabel pratinjau. */
export function MigSummary({ children }: { children: React.ReactNode }) {
  return <div className="mig-sum">{children}</div>
}

/** Pembungkus tabel pratinjau (bergulir; kepala menempel). `head` = isi <tr> kepala. */
export function MigTable({
  head, children, tinggi,
}: { head: React.ReactNode; children: React.ReactNode; tinggi?: number }) {
  return (
    <div className="mig-tw" style={tinggi ? { maxHeight: tinggi } : undefined}>
      <table className="a-t">
        <thead><tr>{head}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

/** Tombol aksi per baris + status selesai. */
export function MigRowBtn({
  done, loading, onClick, label, loadingLabel = 'Proses...', doneLabel = 'Selesai', tone = 'secondary', disabled = false,
}: {
  done: boolean
  loading: boolean
  onClick: () => void
  label: string
  loadingLabel?: string
  doneLabel?: string
  tone?: 'secondary' | 'destructive'
  /** Nonaktifkan tombol (mis. baris yang harus dicek manual dan tidak boleh diproses otomatis). */
  disabled?: boolean
}) {
  if (done) {
    return <span className="mig-ok"><Check className="i" style={{ fontSize: 13 }} />{doneLabel}</span>
  }
  return (
    <Button size="xs" variant={tone} onClick={onClick} disabled={loading || disabled}>
      {loading && <Loader2 className="i animate-spin" />}
      {loading ? loadingLabel : label}
    </Button>
  )
}

/** Kaki daftar: baris "Semua selesai" atau tombol Batal + aksi massal. */
export function MigFoot({
  selesai, selesaiText, onCancel, onAll, allLabel, allVariant = 'success', cancelLabel = 'Batal',
}: {
  selesai: boolean
  selesaiText: React.ReactNode
  onCancel: () => void
  onAll: () => void
  allLabel: string
  allVariant?: 'success' | 'danger' | 'gold' | 'default'
  cancelLabel?: string
}) {
  if (selesai) {
    return (
      <div className="a-alert ok" role="status">
        <CircleCheck className="i" />
        <div>{selesaiText}</div>
      </div>
    )
  }
  return (
    <div className="mig-ft">
      <Button variant="outline" onClick={onCancel}>{cancelLabel}</Button>
      <Button variant={allVariant} onClick={onAll}>{allLabel}</Button>
    </div>
  )
}

/** Layar hasil akhir: judul sukses, isi ringkasan, tombol kembali. */
export function MigDone({
  title, children, onBack, backLabel = 'Kembali ke Pengaturan',
}: { title: string; children: React.ReactNode; onBack: () => void; backLabel?: string }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="a-alert ok" role="status">
        <CircleCheck className="i" />
        <div><b>{title}</b></div>
      </div>
      {children}
      <Button variant="secondary" className="w-full" onClick={onBack}>{backLabel}</Button>
    </div>
  )
}

/** Kotak ringkasan hasil (angka tebal + keterangan). */
export function MigResultBox({ children }: { children: React.ReactNode }) {
  return <div className="mig-box">{children}</div>
}

/** Peringatan item yang gagal diproses ("n gagal"); tidak menampilkan apa pun bila daftar kosong. */
export function MigGagal({ daftar, maks = 5 }: { daftar: { nama: string; pesan: string }[]; maks?: number }) {
  if (daftar.length === 0) return null
  const tampil = daftar.slice(0, maks)
  const sisa = daftar.length - tampil.length
  return (
    <div className="a-alert bad" role="alert">
      <CircleAlert className="i" />
      <div>
        <strong>{daftar.length} gagal</strong>
        {tampil.map((g, i) => (
          <p key={i} style={{ margin: '2px 0 0' }}>{g.nama} — {g.pesan}</p>
        ))}
        {sisa > 0 && <p style={{ margin: '2px 0 0' }}>dan {sisa} lainnya</p>}
      </div>
    </div>
  )
}

/** Layar galat: pesan + "Coba lagi". */
export function MigError({
  title = 'Gagal', msg, onRetry, mono,
}: { title?: string; msg: string; onRetry: () => void; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="a-alert bad" role="alert">
        <CircleAlert className="i" />
        <div>
          <b>{title}</b>
          <p className={mono ? 'mig-err' : undefined} style={{ margin: 0 }}>{msg}</p>
        </div>
      </div>
      <Button variant="ghost" onClick={onRetry} style={{ alignSelf: 'center' }}>Coba lagi</Button>
    </div>
  )
}
