'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, SlidersHorizontal, Check } from 'lucide-react'
import { RT_LIST, STATUS_PERKAWINAN } from '@/lib/penduduk-constants'

export interface FilterState {
  search: string
  rt: string
  jenisKelamin: string
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
  { key: 'jenisKelamin',     label: 'Jenis Kelamin' },
  { key: 'agama',            label: 'Agama' },
  { key: 'statusPerkawinan', label: 'Status Perkawinan' },
  { key: 'pekerjaan',        label: 'Pekerjaan' },
  { key: 'status',           label: 'Status Penduduk' },
  { key: 'sort',             label: 'Urutan' },
] as const

type FilterKey = typeof ALL_FILTERS[number]['key']

interface PendudukFilterProps {
  filter: FilterState
  onChange: (f: FilterState) => void
  total: number
  filtered: number
  agamaOptions?: string[]
  pekerjaanOptions?: string[]
}

const FILTER_VIS_KEY = 'dapendig_filter_visible'

export function PendudukFilter({
  filter, onChange, total, filtered,
  agamaOptions = [], pekerjaanOptions = [],
}: PendudukFilterProps) {
  // Filter mana saja yang ditampilkan — ingat di localStorage antar session
  const [visibleFilters, setVisibleFilters] = useState<Set<FilterKey>>(() => {
    if (typeof window === 'undefined') return new Set(ALL_FILTERS.map(f => f.key))
    try {
      const stored = localStorage.getItem(FILTER_VIS_KEY)
      if (stored) return new Set(JSON.parse(stored) as FilterKey[])
    } catch {}
    return new Set(ALL_FILTERS.map(f => f.key))
  })
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Tutup popup saat klik di luar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false)
      }
    }
    if (showFilterMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showFilterMenu])

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

  const hasActiveFilter =
    filter.search || filter.rt || filter.jenisKelamin || filter.agama ||
    filter.statusPerkawinan || filter.pekerjaan || filter.pendidikan ||
    filter.status !== 'aktif'

  const selectCls = [
    'bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5',
    'text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer',
    'appearance-none pr-6',
  ].join(' ')

  // Wrapper select dengan chevron
  function Sel({ children, value, onChange: onCh, show }: {
    children: React.ReactNode; value: string
    onChange: (v: string) => void; show: boolean
  }) {
    if (!show) return null
    return (
      <div className="relative">
        <select value={value} onChange={e => onCh(e.target.value)} className={selectCls}>
          {children}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">▾</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari nama, NIK, No. KK…"
          value={filter.search}
          onChange={e => set({ search: e.target.value })}
          className="w-full bg-[#0d1424] border border-white/[0.08] rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-colors"
        />
        {filter.search && (
          <button onClick={() => set({ search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-start gap-2 flex-wrap">
        {/* Toggle filter visibility popup */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowFilterMenu(v => !v)}
            className={[
              'flex items-center justify-center w-8 h-8 rounded-lg border transition-colors shrink-0',
              showFilterMenu
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                : 'bg-[#0d1424] border-white/[0.08] text-slate-500 hover:text-slate-300',
            ].join(' ')}
            title="Atur filter yang ditampilkan"
          >
            <SlidersHorizontal size={14} />
          </button>

          {/* Popup checklist */}
          {showFilterMenu && (
            <div className="absolute left-0 top-10 z-50 bg-[#0d1424] border border-white/[0.10] rounded-xl shadow-2xl shadow-black/50 py-2 min-w-[180px]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-3 pb-1.5">Tampilkan Filter</p>
              {ALL_FILTERS.map(f => {
                const active = visibleFilters.has(f.key)
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleFilterVisibility(f.key)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <div className={[
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      active ? 'bg-sky-500 border-sky-500' : 'border-white/[0.15] bg-transparent',
                    ].join(' ')}>
                      {active && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-xs text-slate-300">{f.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Filter selects — hanya tampil jika dicentang */}
        <Sel show={visibleFilters.has('rt')} value={filter.rt} onChange={v => set({ rt: v })}>
          <option value="">Semua RT</option>
          {RT_LIST.map(rt => <option key={rt} value={rt}>RT {rt}</option>)}
        </Sel>

        <Sel show={visibleFilters.has('jenisKelamin')} value={filter.jenisKelamin} onChange={v => set({ jenisKelamin: v })}>
          <option value="">Semua JK</option>
          <option value="Laki-laki">Laki-laki</option>
          <option value="Perempuan">Perempuan</option>
        </Sel>

        <Sel show={visibleFilters.has('agama')} value={filter.agama} onChange={v => set({ agama: v })}>
          <option value="">Semua Agama</option>
          {agamaOptions.map(a => <option key={a} value={a}>{a}</option>)}
        </Sel>

        <Sel show={visibleFilters.has('statusPerkawinan')} value={filter.statusPerkawinan} onChange={v => set({ statusPerkawinan: v })}>
          <option value="">Semua Kawin</option>
          {STATUS_PERKAWINAN.map(s => <option key={s} value={s}>{s}</option>)}
        </Sel>

        <Sel show={visibleFilters.has('pekerjaan')} value={filter.pekerjaan} onChange={v => set({ pekerjaan: v })}>
          <option value="">Semua Pekerjaan</option>
          {pekerjaanOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </Sel>

        <Sel show={visibleFilters.has('status')} value={filter.status} onChange={v => set({ status: v })}>
          <option value="aktif">Aktif</option>
          <option value="tidak aktif">Tidak Aktif</option>
          <option value="meninggal">Meninggal</option>
          <option value="mutasi-keluar">Mutasi Keluar</option>
          <option value="">Semua Status</option>
        </Sel>

        {visibleFilters.has('sort') && (
          <div className="relative">
            <select
              value={`${filter.sortBy}:${filter.sortDir}`}
              onChange={e => {
                const [sortBy, sortDir] = e.target.value.split(':') as [FilterState['sortBy'], FilterState['sortDir']]
                set({ sortBy, sortDir })
              }}
              className={selectCls}
            >
              <option value="rt_kk:asc">RT → KK → Nama</option>
              <option value="nama_lengkap:asc">Nama A–Z</option>
              <option value="nama_lengkap:desc">Nama Z–A</option>
              <option value="nik:asc">NIK ↑</option>
              <option value="rt:asc">RT ↑</option>
              <option value="tanggal_lahir:asc">Umur Tertua</option>
              <option value="tanggal_lahir:desc">Umur Termuda</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">▾</span>
          </div>
        )}

        {/* Reset & count */}
        <div className="flex items-center gap-2.5 ml-auto">
          {hasActiveFilter && (
            <button
              onClick={() => onChange({ search: '', rt: '', jenisKelamin: '', agama: '', statusPerkawinan: '', pekerjaan: '', pendidikan: '', sortBy: 'rt_kk', sortDir: 'asc', status: 'aktif' })}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              <X size={11} />Reset
            </button>
          )}
          <span className="text-xs text-slate-600 whitespace-nowrap">
            {filtered === total ? `${total} data` : `${filtered}/${total} data`}
          </span>
        </div>
      </div>
    </div>
  )
}
