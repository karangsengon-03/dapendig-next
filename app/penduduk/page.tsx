'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PendudukTable } from '@/components/penduduk/PendudukTable'
import { PendudukFilter, type FilterState } from '@/components/penduduk/PendudukFilter'
import { usePendudukList } from '@/hooks/usePenduduk'

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

const DEFAULT_FILTER: FilterState = {
  search: '',
  rt: '',
  jenisKelamin: '',
  agama: '',
  statusPerkawinan: '',
  pekerjaan: '',
  pendidikan: '',
  sortBy: 'rt_kk',
  sortDir: 'asc',
  status: 'aktif',
}

function PendudukContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: allData = [], isLoading } = usePendudukList()

  const [filter, setFilter] = useState<FilterState>(() => ({
    ...DEFAULT_FILTER,
    agama: searchParams.get('agama') ?? '',
    pekerjaan: searchParams.get('pekerjaan') ?? '',
    pendidikan: searchParams.get('pendidikan') ?? '',
    statusPerkawinan: searchParams.get('statusPerkawinan') ?? '',
    status: searchParams.get('status') ?? 'aktif',
  }))
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25)
  const [page, setPage] = useState(1)

  // Sync filter bila URL params berubah (navigasi dari monografi)
  useEffect(() => {
    setFilter({
      ...DEFAULT_FILTER,
      agama: searchParams.get('agama') ?? '',
      pekerjaan: searchParams.get('pekerjaan') ?? '',
      pendidikan: searchParams.get('pendidikan') ?? '',
      statusPerkawinan: searchParams.get('statusPerkawinan') ?? '',
      status: searchParams.get('status') ?? 'aktif',
    })
    setPage(1)
  }, [searchParams])

  // Dynamic options dari data aktif
  const baseData = useMemo(() => {
    if (!filter.status) return allData
    return allData.filter(r => r.status === filter.status)
  }, [allData, filter.status])

  const agamaOptions = useMemo(() => ([...new Set((baseData.map(r => r.agama) as string[]).filter(Boolean))]).sort(), [baseData])
  const pekerjaanOptions = useMemo(() => ([...new Set((baseData.map(r => r.pekerjaan) as string[]).filter(Boolean))]).sort(), [baseData])

  const filtered = useMemo(() => {
    let rows = [...allData]
    if (filter.status) rows = rows.filter((r) => r.status === filter.status)
    if (filter.rt) rows = rows.filter((r) => r.rt === filter.rt)
    if (filter.jenisKelamin) rows = rows.filter((r) => r.jenis_kelamin === filter.jenisKelamin)
    if (filter.agama) rows = rows.filter((r) => r.agama === filter.agama)
    if (filter.statusPerkawinan) rows = rows.filter((r) => r.status_perkawinan === filter.statusPerkawinan)
    if (filter.pekerjaan) rows = rows.filter((r) => r.pekerjaan === filter.pekerjaan)
    if (filter.pendidikan) rows = rows.filter((r) => r.pendidikan === filter.pendidikan)
    if (filter.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.nama_lengkap?.toLowerCase().includes(q) ||
          r.nik?.includes(q) ||
          r.no_kk?.includes(q) ||
          r.rt?.includes(q)
      )
    }
    if (filter.sortBy === 'rt_kk') {
      rows.sort((a, b) => {
        const rtCmp = (Number(a.rt) || 0) - (Number(b.rt) || 0)
        if (rtCmp !== 0) return rtCmp
        const kkCmp = (a.no_kk ?? '').localeCompare(b.no_kk ?? '')
        if (kkCmp !== 0) return kkCmp
        return (a.nama_lengkap ?? '').localeCompare(b.nama_lengkap ?? '')
      })
    } else {
      rows.sort((a, b) => {
        const k = filter.sortBy as keyof typeof a
        const av = a[k] ?? ''
        const bv = b[k] ?? ''
        const cmp = String(av).localeCompare(String(bv), 'id', { numeric: true })
        return filter.sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [allData, filter])

  const totalPages = Math.ceil(filtered.length / pageSize) || 1

  function handleFilter(f: FilterState) {
    setFilter(f)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <Users size={18} className="text-sky-400 shrink-0" />
        <h1 className="text-base font-semibold text-slate-100">Data Penduduk</h1>
      </div>

      <PendudukFilter
        filter={filter}
        onChange={handleFilter}
        total={allData.length}
        filtered={filtered.length}
        agamaOptions={agamaOptions}
        pekerjaanOptions={pekerjaanOptions}
      />

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-3">
        <PendudukTable data={filtered} loading={isLoading} page={page} pageSize={pageSize} />
      </div>

      {!isLoading && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-500">Tampil</span>
            {PAGE_SIZE_OPTIONS.map((s) => (
              <button key={s} onClick={() => { setPageSize(s); setPage(1) }}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  pageSize === s
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:text-slate-300'
                }`}
              >{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-500">Hal {page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PendudukPage() {
  return (
    <AppShell title="Data Penduduk">
      <Suspense fallback={<div className="text-slate-500 text-sm">Memuat...</div>}>
        <PendudukContent />
      </Suspense>
    </AppShell>
  )
}
