'use client'

import { useState, useMemo } from 'react'
import { ClipboardList, Search, X, SlidersHorizontal, RefreshCw } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/skeleton'
import { useLogList, AKSI_FILTER_OPTIONS, KOLEKSI_FILTER_OPTIONS } from '@/hooks/useLog'
import type { LogEntry } from '@/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatWaktu(ts: unknown): string {
  if (!ts) return '—'
  let d: Date
  if (ts instanceof Timestamp) {
    d = ts.toDate()
  } else if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    d = new Date((ts as { seconds: number }).seconds * 1000)
  } else {
    return '—'
  }
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatRelative(ts: unknown): string {
  if (!ts) return '—'
  let d: Date
  if (ts instanceof Timestamp) {
    d = ts.toDate()
  } else if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    d = new Date((ts as { seconds: number }).seconds * 1000)
  } else {
    return '—'
  }
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days < 7) return `${days} hari lalu`
  return formatWaktu(ts)
}

function tsToDate(ts: unknown): Date | null {
  if (!ts) return null
  if (ts instanceof Timestamp) return ts.toDate()
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return new Date((ts as { seconds: number }).seconds * 1000)
  }
  return null
}

function aksiColor(aksi: string): string {
  const a = aksi.toLowerCase()
  if (a.includes('tambah') || a.includes('catat') || a.includes('masuk')) {
    return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
  }
  if (a.includes('edit') || a.includes('update')) {
    return 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
  }
  if (a.includes('hapus') || a.includes('keluar') || a.includes('meninggal')) {
    return 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
  }
  if (a.includes('pindah')) {
    return 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
  }
  return 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
}

function koleksiBadge(koleksi: string | undefined): string | null {
  if (!koleksi) return null
  const map: Record<string, string> = {
    penduduk: 'Penduduk',
    lahir: 'Kelahiran',
    meninggal: 'Kematian',
    mutasi_keluar: 'Mutasi Keluar',
    mutasi_masuk: 'Mutasi Masuk',
  }
  return map[koleksi] ?? koleksi
}

// ── Komponen Filter ───────────────────────────────────────────────────────────

interface LogFilterState {
  search: string
  aksi: string
  koleksi: string
  dateFrom: string
  dateTo: string
}

interface LogFilterProps {
  filter: LogFilterState
  onChange: (f: LogFilterState) => void
  total: number
  filtered: number
  onRefresh: () => void
  isRefreshing: boolean
}

function LogFilter({ filter, onChange, total, filtered, onRefresh, isRefreshing }: LogFilterProps) {
  function set(patch: Partial<LogFilterState>) {
    onChange({ ...filter, ...patch })
  }

  const hasFilter = filter.search || filter.aksi || filter.koleksi || filter.dateFrom || filter.dateTo

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari nama, keterangan, email..."
          value={filter.search}
          onChange={(e) => set({ search: e.target.value })}
          className="w-full bg-[#0d1424] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-colors"
        />
        {filter.search && (
          <button onClick={() => set({ search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <SlidersHorizontal size={13} className="text-slate-500 flex-shrink-0" />

        {/* Aksi */}
        <select
          value={filter.aksi}
          onChange={(e) => set({ aksi: e.target.value })}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          {AKSI_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Koleksi */}
        <select
          value={filter.koleksi}
          onChange={(e) => set({ koleksi: e.target.value })}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          {KOLEKSI_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Tanggal dari */}
        <input
          type="date"
          value={filter.dateFrom}
          onChange={(e) => set({ dateFrom: e.target.value })}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        />

        {/* Tanggal sampai */}
        <input
          type="date"
          value={filter.dateTo}
          onChange={(e) => set({ dateTo: e.target.value })}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 cursor-pointer"
        />

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Muat ulang"
          className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
        </button>

        {/* Reset */}
        {hasFilter && (
          <button
            onClick={() => onChange({ search: '', aksi: '', koleksi: '', dateFrom: '', dateTo: '' })}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <X size={12} /> Reset
          </button>
        )}

        {/* Count */}
        <span className="text-xs text-slate-600 ml-auto">
          {filtered === total ? <>{total} log</> : <>{filtered}/{total} log</>}
        </span>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function LogPage() {
  const { data: allLogs = [], isLoading, refetch, isFetching } = useLogList()

  const [filter, setFilter] = useState<LogFilterState>({
    search: '',
    aksi: '',
    koleksi: '',
    dateFrom: '',
    dateTo: '',
  })
  const [page, setPage] = useState(1)

  function handleFilter(f: LogFilterState) {
    setFilter(f)
    setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = [...allLogs]

    // Filter aksi (partial match)
    if (filter.aksi) {
      const q = filter.aksi.toLowerCase()
      rows = rows.filter((r) => r.aksi?.toLowerCase().includes(q))
    }

    // Filter koleksi
    if (filter.koleksi) {
      rows = rows.filter((r) => r.koleksi === filter.koleksi)
    }

    // Filter search
    if (filter.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.nama?.toLowerCase().includes(q) ||
          r.keterangan?.toLowerCase().includes(q) ||
          r.oleh?.toLowerCase().includes(q) ||
          r.nik_target?.includes(q)
      )
    }

    // Filter tanggal dari
    if (filter.dateFrom) {
      const from = new Date(filter.dateFrom + 'T00:00:00')
      rows = rows.filter((r) => {
        const d = tsToDate(r.ts)
        return d ? d >= from : false
      })
    }

    // Filter tanggal sampai
    if (filter.dateTo) {
      const to = new Date(filter.dateTo + 'T23:59:59')
      rows = rows.filter((r) => {
        const d = tsToDate(r.ts)
        return d ? d <= to : false
      })
    }

    return rows
  }, [allLogs, filter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <AppShell title="Log Aktivitas">
      <div className="flex flex-col gap-4">
        {/* Sub-header */}
        <div className="flex items-center gap-2.5">
          <ClipboardList size={18} className="text-sky-400 shrink-0" />
          <h1 className="text-base font-semibold text-slate-100">Log Aktivitas</h1>
        </div>

        {/* Filter */}
        <LogFilter
          filter={filter}
          onChange={handleFilter}
          total={allLogs.length}
          filtered={filtered.length}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />

        {/* Table */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-3">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#0d1424] flex items-center justify-center">
                <ClipboardList size={24} className="text-slate-600" />
              </div>
              <p className="text-sm text-slate-500">Tidak ada log ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-8">No</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-28">Aksi</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2">Keterangan</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-28">Koleksi</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-32">Oleh</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-36">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((log, idx) => (
                    <tr
                      key={log.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-2 text-xs text-slate-600">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${aksiColor(log.aksi)}`}>
                          {log.aksi}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-xs text-slate-300 leading-snug">
                          {log.keterangan || log.nama || '—'}
                        </p>
                        {log.nik_target && (
                          <p className="text-[11px] text-slate-600 mt-0.5 font-mono">NIK {log.nik_target}</p>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {log.koleksi ? (
                          <span className="text-[10px] text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded">
                            {koleksiBadge(log.koleksi)}
                          </span>
                        ) : (
                          <span className="text-slate-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-400 truncate max-w-[128px]" title={log.oleh}>
                        {log.oleh}
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-[11px] text-slate-400">{formatWaktu(log.ts)}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{formatRelative(log.ts)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-slate-500">
              Hal {page} / {totalPages} · {filtered.length} log
            </span>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
