'use client'

import { Search, X, SlidersHorizontal } from 'lucide-react'
import { RT_LIST, AGAMA, STATUS_PERKAWINAN, PEKERJAAN } from '@/lib/penduduk-constants'

export interface FilterState {
  search: string
  rt: string
  jenisKelamin: string
  agama: string
  statusPerkawinan: string
  pekerjaan: string
  sortBy: 'rt_kk' | 'nama_lengkap' | 'nik' | 'rt' | 'tanggal_lahir'
  sortDir: 'asc' | 'desc'
  status: string
}

interface PendudukFilterProps {
  filter: FilterState
  onChange: (f: FilterState) => void
  total: number
  filtered: number
}

export function PendudukFilter({
  filter,
  onChange,
  total,
  filtered,
}: PendudukFilterProps) {
  function set(patch: Partial<FilterState>) {
    onChange({ ...filter, ...patch })
  }

  const hasFilter =
    filter.search ||
    filter.rt ||
    filter.jenisKelamin ||
    filter.agama ||
    filter.statusPerkawinan ||
    filter.pekerjaan ||
    filter.status !== 'aktif'

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Cari nama, NIK, No. KK…"
          value={filter.search}
          onChange={(e) => set({ search: e.target.value })}
          className="w-full bg-[#0d1424] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-colors"
        />
        {filter.search && (
          <button
            onClick={() => set({ search: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal size={13} className="text-slate-500 flex-shrink-0" />

        {/* RT */}
        <select
          value={filter.rt}
          onChange={(e) => set({ rt: e.target.value })}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          <option value="">Semua RT</option>
          {RT_LIST.map((rt) => (
            <option key={rt} value={rt}>
              RT {rt}
            </option>
          ))}
        </select>

        {/* Jenis Kelamin */}
        <select
          value={filter.jenisKelamin}
          onChange={(e) => set({ jenisKelamin: e.target.value })}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          <option value="">Semua JK</option>
          <option value="Laki-laki">Laki-laki</option>
          <option value="Perempuan">Perempuan</option>
        </select>

        {/* Agama */}
        <select
          value={filter.agama}
          onChange={(e) => set({ agama: e.target.value })}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          <option value="">Semua Agama</option>
          {AGAMA.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Status Perkawinan */}
        <select
          value={filter.statusPerkawinan}
          onChange={(e) => set({ statusPerkawinan: e.target.value })}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          <option value="">Semua Kawin</option>
          {STATUS_PERKAWINAN.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Pekerjaan */}
        <select
          value={filter.pekerjaan}
          onChange={(e) => set({ pekerjaan: e.target.value })}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          <option value="">Semua Pekerjaan</option>
          {PEKERJAAN.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filter.status}
          onChange={(e) => set({ status: e.target.value })}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          <option value="aktif">Aktif</option>
          <option value="tidak aktif">Tidak Aktif</option>
          <option value="meninggal">Meninggal</option>
          <option value="mutasi-keluar">Mutasi Keluar</option>
          <option value="">Semua</option>
        </select>

        {/* Sort */}
        <select
          value={`${filter.sortBy}:${filter.sortDir}`}
          onChange={(e) => {
            const [sortBy, sortDir] = e.target.value.split(':') as [
              FilterState['sortBy'],
              FilterState['sortDir']
            ]
            set({ sortBy, sortDir })
          }}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          <option value="rt_kk:asc">RT → KK → Nama (Default)</option>
          <option value="nama_lengkap:asc">Nama A–Z</option>
          <option value="nama_lengkap:desc">Nama Z–A</option>
          <option value="nik:asc">NIK ↑</option>
          <option value="rt:asc">RT ↑</option>
          <option value="tanggal_lahir:asc">Umur Tertua</option>
          <option value="tanggal_lahir:desc">Umur Termuda</option>
        </select>

        {/* Reset */}
        {hasFilter && (
          <button
            onClick={() =>
              onChange({
                search: '',
                rt: '',
                jenisKelamin: '',
                agama: '',
                statusPerkawinan: '',
                pekerjaan: '',
                sortBy: 'rt_kk',
                sortDir: 'asc',
                status: 'aktif',
              })
            }
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 ml-auto"
          >
            <X size={12} />
            Reset
          </button>
        )}

        {/* Count */}
        <span className="text-xs text-slate-600 ml-auto">
          {filtered === total ? (
            <>{total} data</>
          ) : (
            <>
              {filtered}/{total} data
            </>
          )}
        </span>
      </div>
    </div>
  )
}
