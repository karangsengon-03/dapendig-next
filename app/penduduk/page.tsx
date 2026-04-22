'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PendudukTable } from '@/components/penduduk/PendudukTable'
import { PendudukFilter, type FilterState } from '@/components/penduduk/PendudukFilter'
import { DeleteDialog } from '@/components/penduduk/DeleteDialog'
import { usePendudukList, useDeletePenduduk } from '@/hooks/usePenduduk'
import { useAuthStore } from '@/store/authStore'
import type { Penduduk } from '@/types'

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

export default function PendudukPage() {
  const router = useRouter()
  const { data: allData = [], isLoading } = usePendudukList()
  const deleteMutation = useDeletePenduduk()
  const { isAdmin, isOperator } = useAuthStore()

  const [filter, setFilter] = useState<FilterState>({
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
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25)
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Penduduk | null>(null)

  const filtered = useMemo(() => {
    let rows = [...allData]

    // Status
    if (filter.status) rows = rows.filter((r) => r.status === filter.status)

    // RT
    if (filter.rt) rows = rows.filter((r) => r.rt === filter.rt)

    // JK
    if (filter.jenisKelamin)
      rows = rows.filter((r) => r.jenis_kelamin === filter.jenisKelamin)

    // Agama
    if (filter.agama)
      rows = rows.filter((r) => r.agama === filter.agama)

    // Status Perkawinan
    if (filter.statusPerkawinan)
      rows = rows.filter((r) => r.status_perkawinan === filter.statusPerkawinan)

    // Pekerjaan
    if (filter.pekerjaan)
      rows = rows.filter((r) => r.pekerjaan === filter.pekerjaan)

    // Search
    if (filter.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.nama_lengkap?.toLowerCase().includes(q) ||
          r.nik?.includes(q) ||
          r.no_kk?.includes(q) ||
          r.rt?.includes(q) ||
          r.rw?.includes(q)
      )
    }

    // Sort
    if (filter.sortBy === 'rt_kk') {
      rows.sort((a, b) => {
        const rtCmp = (a.rt ?? '').localeCompare(b.rt ?? '')
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

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync({ id: deleteTarget.id, nama: deleteTarget.nama_lengkap })
    setDeleteTarget(null)
  }

  const canAdd = isOperator()

  return (
    <AppShell title="Data Penduduk">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-slate-100">Data Penduduk</h1>
            <p className="text-xs text-slate-500">
              Desa Karang Sengon, Klabang, Bondowoso
            </p>
          </div>
          {canAdd && (
            <button
              onClick={() => router.push('/penduduk/tambah')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-500/90 hover:bg-sky-500 text-sm text-white font-medium transition-colors flex-shrink-0"
            >
              <UserPlus size={15} />
              <span className="hidden sm:inline">Tambah</span>
            </button>
          )}
        </div>

        {/* Filter */}
        <PendudukFilter
          filter={filter}
          onChange={handleFilter}
          total={allData.length}
          filtered={filtered.length}
        />

        {/* Table */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-3">
          <PendudukTable
            data={filtered}
            loading={isLoading}
            role={role}
            page={page}
            pageSize={pageSize}
            onDelete={setDeleteTarget}
          />
        </div>

        {/* Pagination */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Page size */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Tampil</span>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setPageSize(s); setPage(1) }}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    pageSize === s
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Page nav */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Hal {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <DeleteDialog
        open={!!deleteTarget}
        nama={deleteTarget?.nama_lengkap ?? ''}
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  )
}
