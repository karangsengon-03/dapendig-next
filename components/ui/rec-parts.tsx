'use client'

import { useState } from 'react'
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, MapPin, Pencil, RotateCcw, Search, SlidersHorizontal, Trash2, Undo2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { InBox } from '@/components/ui/field'
import { PopLayer, hitungPos, type PopPos } from '@/components/penduduk/PopLayer'
import { parseDate } from '@/lib/dateUtils'
import { useDusunAktif } from '@/hooks/useDusunAktif'
import { OPSI_URUT_CATATAN, URUT_BAWAAN, type UrutCatatan } from '@/lib/saring-catatan'
import { cn } from '@/lib/utils'

/* ============================================================================
   Bagian bersama halaman catatan (Mutasi, Kelahiran & kematian) — padanan
   `recPage()` / `fcard()` / `formFoot()` prototype. Semua murni tampilan.
   ============================================================================ */

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/** Tanggal panjang untuk modal: "12 September 2026" (sama dengan halaman lama). */
export function tglPanjang(tgl?: string): string {
  if (!tgl) return '-'
  const d = parseDate(tgl)
  if (!d) return tgl
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** Tanggal ringkas untuk tabel: "12 Sep 2026". */
export function tglPendek(tgl?: string): string {
  if (!tgl) return '-'
  const d = parseDate(tgl)
  if (!d) return tgl
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "YYYY-MM" dari tanggal; kosong bila tidak terbaca. */
export function kunciBulan(tgl?: string): string {
  const d = tgl ? parseDate(tgl) : null
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : ''
}

export function labelBulan(ym: string): string {
  const [y, m] = ym.split('-')
  return `${NAMA_BULAN[Number(m) - 1] ?? m} ${y}`
}

/** "Okt 2026" untuk tombol filter yang sempit. */
export function labelBulanPendek(ym: string): string {
  const [y, m] = ym.split('-')
  return `${(NAMA_BULAN[Number(m) - 1] ?? m).slice(0, 3)} ${y}`
}

/** Bulan-bulan yang ada di data (terbaru dulu) untuk popover filter. */
export function daftarBulan(tanggal: (string | undefined)[]): string[] {
  return Array.from(new Set(tanggal.map(kunciBulan).filter(Boolean))).sort().reverse()
}

/** Pencarian nama/NIK/No. KK: aturannya ada di lib/saring-catatan.ts (multi-kata, nomor tanpa spasi/strip). */
export { cocokCari } from '@/lib/saring-catatan'

/* ---------- Tab jenis catatan ---------- */
export interface RecTabDef {
  key: string
  label: string
  icon: React.ReactNode
  count?: number
}

export function RecTabs({
  tabs, aktif, tone, onPilih, terkunci = false, onTerkunci,
}: {
  tabs: RecTabDef[]; aktif: string; tone: 'bad' | 'ok' | 'mute' | 'info'; onPilih: (key: string) => void
  /** Form Tambah/Edit sedang terbuka: tab lain tidak bisa dipilih sampai form ditutup (klik memanggil `onTerkunci`, bukan `onPilih`). */
  terkunci?: boolean
  onTerkunci?: () => void
}) {
  return (
    <div className={`a-seg tabs2 t-${tone}`} style={{ marginBottom: 16 }} role="group" aria-label="Jenis catatan">
      {tabs.map((t) => {
        const terkunciIni = terkunci && t.key !== aktif
        return (
        <button
          key={t.key}
          type="button"
          aria-pressed={t.key === aktif}
          aria-disabled={terkunciIni || undefined}
          title={terkunciIni ? 'Tutup form terlebih dahulu untuk pindah tab' : undefined}
          className={t.key === aktif ? 'on' : ''}
          onClick={() => (terkunciIni ? onTerkunci?.() : onPilih(t.key))}
        >
          {t.icon}
          {t.label}
          {t.count !== undefined && <span className="ct">{t.count}</span>}
        </button>
        )
      })}
    </div>
  )
}

/* ---------- Bilah cari + filter bulan/RT + urutan + jumlah ---------- */
type KunciPop = 'bulan' | 'rt' | 'urut'

export function RecToolbar({
  q, onQ, bulan, bulanOpsi, onBulan, jumlah, rt, onRt, urut, onUrut, adaUbahan, onReset,
}: {
  q: string
  onQ: (v: string) => void
  bulan: string
  bulanOpsi: string[]
  onBulan: (ym: string) => void
  jumlah: number
  /** RT terpilih ('' = semua) — chip RT tampil bila `onRt` diberikan. */
  rt?: string
  onRt?: (rt: string) => void
  /** Urutan terpilih — chip Urutkan tampil bila `onUrut` diberikan. */
  urut?: UrutCatatan
  onUrut?: (u: UrutCatatan) => void
  /** Ada pencarian/filter/urutan selain bawaan → tombol Reset tampil (bila `onReset` diberikan). */
  adaUbahan?: boolean
  onReset?: () => void
}) {
  const { rtList } = useDusunAktif()
  const [pop, setPop] = useState<{ kunci: KunciPop; pos: PopPos } | null>(null)
  const buka = (kunci: KunciPop, el: HTMLElement, lebar: number) => setPop({ kunci, pos: hitungPos(el, lebar) })
  const tutup = () => setPop(null)

  const opsiBulan = [{ v: '', l: 'Semua bulan' }, ...bulanOpsi.map((m) => ({ v: m, l: labelBulan(m) }))]
  const opsiRt = [{ v: '', l: 'Semua RT' }, ...rtList.map((r) => ({ v: r, l: `RT ${r}` }))]
  const urutAktif = urut ?? URUT_BAWAAN
  const labelUrut = OPSI_URUT_CATATAN.find((o) => o.nilai === urutAktif)?.label ?? OPSI_URUT_CATATAN[0].label

  // Fungsi biasa penghasil JSX (bukan komponen), supaya menu tidak dipasang ulang di tiap render.
  function menu(judul: string, lebar: number, opsi: { v: string; l: string }[], nilai: string, onPilih: (v: string) => void) {
    if (!pop) return null
    return (
      <PopLayer pos={pop.pos} lebar={lebar} title={judul} onClose={tutup}>
        {opsi.map((o) => (
          <button
            key={o.v || '__semua'}
            type="button"
            role="menuitemradio"
            aria-checked={o.v === nilai}
            className={`o${o.v === nilai ? ' on' : ''}`}
            onClick={() => { onPilih(o.v); tutup() }}
          >
            {o.l}
            {o.v === nilai && <Check className="i ck" />}
          </button>
        ))}
      </PopLayer>
    )
  }

  return (
    <div className="fbar" style={{ marginBottom: 12 }}>
      <div className="a-in srch">
        <Search className="i" />
        <input
          type="text"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Cari nama, NIK, atau No. KK"
          aria-label="Cari nama, NIK, atau No. KK"
          autoComplete="off"
        />
      </div>
      <div className="frow3">
        <button
          type="button"
          className={cn('a-chip', bulan && 'on')}
          aria-haspopup="menu"
          aria-label="Filter bulan"
          onClick={(e) => buka('bulan', e.currentTarget, 230)}
        >
          <Calendar className="i" />
          <span className="t">{bulan ? labelBulanPendek(bulan) : 'Bulan'}</span>
          <ChevronDown className="i cv" />
        </button>
        {onRt && (
          <button
            type="button"
            className={cn('a-chip', rt && 'on')}
            aria-haspopup="menu"
            aria-label="Filter RT"
            onClick={(e) => buka('rt', e.currentTarget, 200)}
          >
            <MapPin className="i" />
            <span className="t">{rt ? `RT ${rt}` : 'RT'}</span>
            <ChevronDown className="i cv" />
          </button>
        )}
        {onUrut && (
          <button
            type="button"
            className={cn('a-chip', urutAktif !== URUT_BAWAAN && 'on')}
            aria-haspopup="menu"
            aria-label="Urutkan"
            title={`Urut: ${labelUrut}`}
            onClick={(e) => buka('urut', e.currentTarget, 200)}
          >
            <SlidersHorizontal className="i" />
            <span className="t">{labelUrut}</span>
            <ChevronDown className="i cv" />
          </button>
        )}
      </div>
      <div className="fcnt">
        <span className="cnt"><b>{jumlah}</b> data</span>
        {onReset && adaUbahan && (
          <button type="button" className="a-chip" onClick={onReset}>
            <RotateCcw className="i" />
            Reset
          </button>
        )}
      </div>
      {pop?.kunci === 'bulan' && menu('Filter bulan', 230, opsiBulan, bulan, onBulan)}
      {pop?.kunci === 'rt' && onRt && menu('Filter RT', 200, opsiRt, rt ?? '', onRt)}
      {pop?.kunci === 'urut' && onUrut && menu(
        'Urutkan', 200, OPSI_URUT_CATATAN.map((o) => ({ v: o.nilai, l: o.label })), urutAktif, (v) => onUrut(v as UrutCatatan),
      )}
    </div>
  )
}

/* ---------- Sel nama di tabel (avatar + nama) ---------- */
export function NamaCell({ nama, jk }: { nama: string; jk?: string }) {
  return (
    <div className="nmi">
      <Avatar nama={nama} jk={jk} size={36} />
      <div className="n">{nama}</div>
    </div>
  )
}

/* ---------- Daftar kunci-nilai di modal Detail (`.a-kvm`) ---------- */
export type KvItem = [label: string, nilai: React.ReactNode, opsi?: { lebar?: boolean; mono?: boolean }]

export function KvList({ items }: { items: KvItem[] }) {
  return (
    <div className="a-kvm" style={{ padding: 0 }}>
      {items.map(([k, v, o]) => (
        <div key={k} className={cn('a-kv', o?.lebar && 'w')}>
          <p className="k">{k}</p>
          <p className={cn('v', o?.mono && 'mn')}>{v}</p>
        </div>
      ))}
    </div>
  )
}

/* ---------- Kartu isian form (`fcard`) dan bilah simpan lengket (`formFoot`) ---------- */
export function FormCard({
  icon, title, sub, children,
}: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="a-card">
      <div className="ch">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            className="a-avatar"
            style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--navy-100)', color: 'var(--navy-700)' }}
          >
            {icon}
          </div>
          <div>
            <h3>{title}</h3>
            {sub && <p>{sub}</p>}
          </div>
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

export function FormBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="a-sticky sbar">
      <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>
        Kolom bertanda <span style={{ color: 'var(--bad)' }}>*</span> wajib diisi
      </span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

/* ---------- Pemilih bawaan peramban (dengan baris kosong opsional) ---------- */
export function SelectBox({
  id, value, onChange, options, kosong, error,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  /** Label baris kosong (mis. "-- Pilih --"); tanpa nilai = tidak ada baris kosong. */
  kosong?: string
  error?: boolean
}) {
  // Nilai lama yang tidak ada di daftar tetap ditampilkan agar tidak tampak berganti sendiri.
  const asing = value !== '' && !options.includes(value)
  return (
    <InBox error={error}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {kosong !== undefined && <option value="">{kosong}</option>}
        {asing && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="i chev" />
    </InBox>
  )
}

/* ---------- Kaki modal Detail: Hapus di kiri, Batalkan, Edit (peran persis kode) ---------- */
export function DetailFoot({
  canEdit, canDelete, bisaBatal, onClose, onEdit, onRollback, onHapus, hapusNonaktif = false,
}: {
  canEdit: boolean
  canDelete: boolean
  /** Hapus ditampilkan tetapi dinonaktifkan (mis. penduduk masih berstatus pindah keluar/meninggal). */
  hapusNonaktif?: boolean
  /** Batalkan hanya untuk Pindah keluar dan Kematian. */
  bisaBatal: boolean
  onClose: () => void
  onEdit: () => void
  onRollback: () => void
  onHapus: () => void
}) {
  if (!canEdit && !canDelete) {
    return <Button type="button" variant="outline" onClick={onClose}>Tutup</Button>
  }
  return (
    <>
      {canDelete && (
        <Button type="button" variant="destructive" onClick={onHapus} disabled={hapusNonaktif} style={{ marginRight: 'auto' }}>
          <Trash2 className="i" />Hapus
        </Button>
      )}
      {canDelete && bisaBatal && (
        <Button type="button" variant="outline" onClick={onRollback}>
          <Undo2 className="i" />Batalkan
        </Button>
      )}
      {canEdit && (
        <Button type="button" onClick={onEdit}>
          <Pencil className="i" />Edit
        </Button>
      )}
    </>
  )
}

/* ---------- Pager tabel catatan (gaya halaman Log): Mutasi dan Vital ---------- */
export function RecPager({
  halaman, totalHalaman, total, satuan = 'catatan', mobile = false, onGanti,
}: {
  halaman: number
  totalHalaman: number
  total: number
  satuan?: string
  /** true = pager ringkas untuk kartu di HP */
  mobile?: boolean
  onGanti: (halaman: number) => void
}) {
  if (totalHalaman <= 1) return null
  if (mobile) {
    return (
      <div className="mpg">
        <Button type="button" variant="outline" size="sm" disabled={halaman <= 1} aria-label="Halaman sebelumnya"
          onClick={() => onGanti(Math.max(1, halaman - 1))}>
          <ChevronLeft className="i" />Sebelumnya
        </Button>
        <span>{halaman}/{totalHalaman}</span>
        <Button type="button" variant="outline" size="sm" disabled={halaman >= totalHalaman} aria-label="Halaman berikutnya"
          onClick={() => onGanti(Math.min(totalHalaman, halaman + 1))}>
          Berikutnya<ChevronRight className="i" />
        </Button>
      </div>
    )
  }
  return (
    <div className="a-pg">
      <span>
        Halaman <b style={{ color: 'var(--ink)' }}>{halaman}</b> dari <b style={{ color: 'var(--ink)' }}>{totalHalaman}</b>
        {' '}· {total.toLocaleString('id-ID')} {satuan}
      </span>
      <div className="pgs">
        <button type="button" className="ar" aria-label="Halaman sebelumnya" onClick={() => onGanti(Math.max(1, halaman - 1))} disabled={halaman <= 1}>
          <ChevronLeft className="i" style={{ fontSize: 15 }} />
        </button>
        <button type="button" className="ar" aria-label="Halaman berikutnya" onClick={() => onGanti(Math.min(totalHalaman, halaman + 1))} disabled={halaman >= totalHalaman}>
          <ChevronRight className="i" style={{ fontSize: 15 }} />
        </button>
      </div>
    </div>
  )
}
