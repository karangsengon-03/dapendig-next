'use client'

import { useState } from 'react'
import {
  Check,
  ChevronDown,
  Layers,
  ListChecks,
  MapPin,
  Search,
  SlidersHorizontal,
  UserCheck,
  X,
  type LucideIcon,
  VenusAndMars,
  HeartHandshake,
  Briefcase,
  MapPinned,
  Hourglass,
  GraduationCap,
  Tags,
} from 'lucide-react'
import { STATUS_PERKAWINAN } from '@/lib/penduduk-constants'
import { KATEGORI_UMUR, KLASIFIKASI_UMUR, kunciRentang, labelKunciRentang, labelKlasifikasi, labelNamaKlasifikasi } from '@/lib/umur'
import { useDusunAktif } from '@/hooks/useDusunAktif'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PopLayer, hitungPos, type PopPos } from './PopLayer'

export interface FilterState {
  search: string
  rt: string
  /** Nama dusun (Pengaturan → Dusun, RT, dan RW); dicocokkan lewat RT penduduk. */
  dusun: string
  jenisKelamin: string
  /** Kunci rentang umur "min-maks" (lib/umur.ts), mis. "0-4" atau "60-999". */
  umur: string
  /** Nama klasifikasi umur (lib/umur.ts): Balita, Anak-anak, Remaja, Dewasa, Pra-lansia, Lansia. */
  klasifikasi: string
  agama: string
  statusPerkawinan: string
  pekerjaan: string
  pendidikan: string
  sortBy: 'rt_kk' | 'nama_lengkap' | 'nik' | 'rt' | 'tanggal_lahir'
  sortDir: 'asc' | 'desc'
  status: string
}

// Daftar semua filter yang bisa di-toggle tampil/sembunyikan
const ALL_FILTERS = [
  { key: 'rt',               label: 'RT' },
  { key: 'dusun',            label: 'Dusun' },
  { key: 'jenisKelamin',     label: 'Jenis kelamin' },
  { key: 'umur',             label: 'Umur' },
  { key: 'klasifikasi',      label: 'Klasifikasi umur' },
  { key: 'agama',            label: 'Agama' },
  { key: 'statusPerkawinan', label: 'Status perkawinan' },
  { key: 'pendidikan',       label: 'Pendidikan' },
  { key: 'pekerjaan',        label: 'Pekerjaan' },
  { key: 'status',           label: 'Status penduduk' },
  { key: 'sort',             label: 'Urutan' },
] as const

type FilterKey = typeof ALL_FILTERS[number]['key']
type ChipKey = Exclude<FilterKey, 'sort'>

// v2: Dusun, Umur, dan Pendidikan ikut menjadi filter; kunci baru supaya ketiganya tampil bawaan (pilihan lama tidak dipakai lagi).
const FILTER_VIS_KEY = 'dapendig_filter_visible_v2'

const CHIPS: { key: ChipKey; label: string; icon: LucideIcon }[] = [
  { key: 'rt',               label: 'RT',            icon: MapPin },
  { key: 'dusun',            label: 'Dusun',         icon: MapPinned },
  { key: 'jenisKelamin',     label: 'Jenis kelamin', icon: VenusAndMars },
  { key: 'umur',             label: 'Umur',          icon: Hourglass },
  { key: 'klasifikasi',      label: 'Klasifikasi',   icon: Tags },
  { key: 'agama',            label: 'Agama',         icon: Layers },
  { key: 'statusPerkawinan', label: 'Status kawin',  icon: HeartHandshake },
  { key: 'pendidikan',       label: 'Pendidikan',    icon: GraduationCap },
  { key: 'pekerjaan',        label: 'Pekerjaan',     icon: Briefcase },
  { key: 'status',           label: 'Status',        icon: UserCheck },
]

const OPSI_STATUS = [
  { value: 'aktif',         label: 'Aktif' },
  { value: 'tidak aktif',   label: 'Tidak aktif' },
  { value: 'meninggal',     label: 'Meninggal' },
  { value: 'mutasi-keluar', label: 'Mutasi keluar' },
  { value: '',              label: 'Semua status' },
]

const OPSI_URUT = [
  { value: 'rt_kk:asc',          label: 'RT → KK → Nama' },
  { value: 'nama_lengkap:asc',   label: 'Nama A–Z' },
  { value: 'nama_lengkap:desc',  label: 'Nama Z–A' },
  { value: 'nik:asc',            label: 'NIK ↑' },
  { value: 'rt:asc',             label: 'RT ↑' },
  { value: 'tanggal_lahir:asc',  label: 'Umur tertua' },
  { value: 'tanggal_lahir:desc', label: 'Umur termuda' },
]

export const FILTER_AWAL: FilterState = {
  search: '', rt: '', dusun: '', jenisKelamin: '', umur: '', klasifikasi: '', agama: '', statusPerkawinan: '', pekerjaan: '', pendidikan: '',
  sortBy: 'rt_kk', sortDir: 'asc', status: 'aktif',
}

/** Ada filter yang sedang dipakai (selain urutan)? Status bawaan "aktif" tidak dihitung. */
export function adaFilterAktif(f: FilterState): boolean {
  return Boolean(
    f.search || f.rt || f.dusun || f.jenisKelamin || f.umur || f.klasifikasi || f.agama || f.statusPerkawinan ||
    f.pekerjaan || f.pendidikan || f.status !== 'aktif'
  )
}

interface PendudukFilterProps {
  filter: FilterState
  onChange: (f: FilterState) => void
  total: number
  filtered: number
  agamaOptions?: string[]
  pekerjaanOptions?: string[]
  pendidikanOptions?: string[]
}

type PopState = { kunci: string; pos: PopPos; lebar: number } | null

export function PendudukFilter({
  filter, onChange, total, filtered,
  agamaOptions = [], pekerjaanOptions = [], pendidikanOptions = [],
}: PendudukFilterProps) {
  const { rtList, dusun } = useDusunAktif()
  // Filter mana saja yang ditampilkan — ingat di localStorage antar session
  const [visibleFilters, setVisibleFilters] = useState<Set<FilterKey>>(() => {
    if (typeof window === 'undefined') return new Set(ALL_FILTERS.map(f => f.key))
    try {
      const stored = localStorage.getItem(FILTER_VIS_KEY)
      if (stored) return new Set(JSON.parse(stored) as FilterKey[])
    } catch {}
    return new Set(ALL_FILTERS.map(f => f.key))
  })
  const [pop, setPop] = useState<PopState>(null)

  function set(patch: Partial<FilterState>) { onChange({ ...filter, ...patch }) }

  function toggleFilterVisibility(key: FilterKey) {
    setVisibleFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      // Simpan ke localStorage agar diingat antar session
      try { localStorage.setItem(FILTER_VIS_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function buka(kunci: string, el: HTMLElement, lebar = 230) {
    setPop({ kunci, pos: hitungPos(el, lebar), lebar })
  }

  function opsiChip(key: ChipKey): { value: string; label: string }[] {
    switch (key) {
      case 'rt':
        return [{ value: '', label: 'Semua RT' }, ...rtList.map(rt => ({ value: rt, label: `RT ${rt}` }))]
      case 'dusun':
        return [{ value: '', label: 'Semua dusun' }, ...dusun.map(d => ({ value: d.nama, label: `Dusun ${d.nama}` }))]
      case 'umur':
        return [{ value: '', label: 'Semua umur' }, ...KATEGORI_UMUR.map(k => { const v = kunciRentang(k.min, k.max); return { value: v, label: labelKunciRentang(v) } })]
      case 'klasifikasi':
        return [{ value: '', label: 'Semua klasifikasi' }, ...KLASIFIKASI_UMUR.map(k => ({ value: k.label, label: labelKlasifikasi(k) }))]
      case 'pendidikan':
        return [{ value: '', label: 'Semua pendidikan' }, ...pendidikanOptions.map(p => ({ value: p, label: p }))]
      case 'jenisKelamin':
        return [{ value: '', label: 'Semua jenis kelamin' }, { value: 'Laki-laki', label: 'Laki-laki' }, { value: 'Perempuan', label: 'Perempuan' }]
      case 'agama':
        return [{ value: '', label: 'Semua agama' }, ...agamaOptions.map(a => ({ value: a, label: a }))]
      case 'statusPerkawinan':
        return [{ value: '', label: 'Semua status kawin' }, ...STATUS_PERKAWINAN.map(s => ({ value: s, label: s }))]
      case 'pekerjaan':
        return [{ value: '', label: 'Semua pekerjaan' }, ...pekerjaanOptions.map(p => ({ value: p, label: p }))]
      case 'status':
        return OPSI_STATUS
    }
  }

  const nilaiUrut = `${filter.sortBy}:${filter.sortDir}`
  const labelUrut = OPSI_URUT.find(o => o.value === nilaiUrut)?.label ?? OPSI_URUT[0].label
  const aktif = adaFilterAktif(filter)

  function renderPop() {
    if (!pop) return null
    const tutup = () => setPop(null)

    if (pop.kunci === 'sort') {
      return (
        <PopLayer pos={pop.pos} lebar={pop.lebar} title="Urutkan" onClose={tutup}>
          {OPSI_URUT.map(o => (
            <button key={o.value} type="button" role="menuitemradio" aria-checked={o.value === nilaiUrut}
              className={`o${o.value === nilaiUrut ? ' on' : ''}`}
              onClick={() => {
                const [sortBy, sortDir] = o.value.split(':') as [FilterState['sortBy'], FilterState['sortDir']]
                set({ sortBy, sortDir })
                tutup()
              }}>
              {o.label}
              {o.value === nilaiUrut && <Check className="i ck" />}
            </button>
          ))}
        </PopLayer>
      )
    }

    if (pop.kunci === 'tampil') {
      return (
        <PopLayer pos={pop.pos} lebar={pop.lebar} title="Atur filter" onClose={tutup}>
          {ALL_FILTERS.map(f => {
            const on = visibleFilters.has(f.key)
            return (
              <button key={f.key} type="button" role="menuitemcheckbox" aria-checked={on}
                className="o" onClick={() => toggleFilterVisibility(f.key)}>
                <span className={`cbx${on ? ' on' : ''}`}><Check className="i" style={{ fontSize: 12 }} /></span>
                {f.label}
              </button>
            )
          })}
        </PopLayer>
      )
    }

    const chip = CHIPS.find(c => c.key === pop.kunci)
    if (!chip) return null
    const nilai = filter[chip.key]
    return (
      <PopLayer pos={pop.pos} lebar={pop.lebar} title={chip.label} onClose={tutup}>
        {opsiChip(chip.key).map(o => (
          <button key={o.value || '__semua'} type="button" role="menuitemradio" aria-checked={o.value === nilai}
            className={`o${o.value === nilai ? ' on' : ''}`}
            onClick={() => { set({ [chip.key]: o.value } as Partial<FilterState>); tutup() }}>
            {o.label}
            {o.value === nilai && <Check className="i ck" />}
          </button>
        ))}
      </PopLayer>
    )
  }

  const teksJumlah = filtered === total
    ? <><b>{total}</b> data</>
    : <><b>{filtered}</b>/{total} data</>

  return (
    <>
      {/* Baris cari + urutan + pemilih filter */}
      <div className="fbar">
        <div className="a-in srch">
          <Search className="i" />
          <input
            type="text"
            placeholder="Cari nama, NIK, atau No. KK"
            value={filter.search}
            onChange={e => set({ search: e.target.value })}
            autoComplete="off"
          />
          {filter.search && (
            <button type="button" className="pwt" aria-label="Hapus pencarian" onClick={() => set({ search: '' })}>
              <X className="i" />
            </button>
          )}
        </div>

        {visibleFilters.has('sort') && (
          <button type="button" className={cn('a-chip', (filter.sortBy !== FILTER_AWAL.sortBy || filter.sortDir !== FILTER_AWAL.sortDir) && 'on')}
            aria-haspopup="menu" aria-label="Urutkan" onClick={e => buka('sort', e.currentTarget)}>
            <SlidersHorizontal className="i" />Urut: {labelUrut}
          </button>
        )}

        <button type="button" className="a-chip" aria-haspopup="menu" title="Pilih filter yang ditampilkan"
          onClick={e => buka('tampil', e.currentTarget)}>
          <ListChecks className="i" />Atur filter
        </button>
      </div>

      {/* Chip filter */}
      <div className="chips-row">
        {/* Filter yang sedang dipakai selalu tampil, walau disembunyikan lewat "Atur filter" (mis. datang dari Beranda/Monografi) */}
        {CHIPS.filter(c => visibleFilters.has(c.key) || filter[c.key] !== (c.key === 'status' ? 'aktif' : '')).map(c => {
          const nilai = filter[c.key]
          const bawaan = c.key === 'status' ? 'aktif' : ''
          const on = nilai !== bawaan
          const Ikon = c.icon
          // Nilai di luar daftar pilihan (mis. rentang umur dari Monografi) tetap diberi label yang jelas
          const labelNilai = opsiChip(c.key).find(o => o.value === nilai)?.label ?? (c.key === 'umur' ? labelKunciRentang(nilai) : c.key === 'klasifikasi' ? labelNamaKlasifikasi(nilai) : nilai)
          return (
            <button key={c.key} type="button" className={`a-chip${on ? ' on' : ''}`} aria-haspopup="menu"
              onClick={e => buka(c.key, e.currentTarget, c.key === 'pekerjaan' || c.key === 'pendidikan' ? 270 : 230)}>
              {on ? (
                <>
                  {labelNilai}
                  <span className="x" role="button" aria-label={`Hapus filter ${c.label}`}
                    onClick={e => { e.stopPropagation(); set({ [c.key]: bawaan } as Partial<FilterState>) }}>
                    <X className="i" style={{ fontSize: 13 }} />
                  </span>
                </>
              ) : (
                <>
                  <Ikon className="i" />
                  {c.key === 'status' ? `Status: ${labelNilai}` : c.label}
                  <ChevronDown className="i" style={{ fontSize: 13 }} />
                </>
              )}
            </button>
          )
        })}

        {aktif && (
          <Button type="button" variant="ghost" size="sm" style={{ color: 'var(--lk)' }}
            onClick={() => onChange({ ...FILTER_AWAL })}>
            Hapus semua filter
          </Button>
        )}
        <span className="cnt">{teksJumlah}</span>
      </div>
      <div className="only-m cnt-m">{teksJumlah}</div>

      {renderPop()}
    </>
  )
}
