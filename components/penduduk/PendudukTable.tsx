'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { User } from 'lucide-react'
import type { Penduduk } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

interface PendudukTableProps {
  data: Penduduk[]
  loading: boolean
  page: number
  pageSize: number
}

import { hitungUmur as calcUmur } from '@/lib/dateUtils'

function hitungUmur(tanggalLahir: string): string {
  const umur = calcUmur(tanggalLahir)
  if (umur < 0) return '—'
  return `${umur} th`
}

export function PendudukTable({ data, loading, page, pageSize }: PendudukTableProps) {
  const router = useRouter()

  // Hooks harus dipanggil sebelum semua early return (Rules of Hooks)
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const start = (page - 1) * pageSize
  const paged = data.slice(start, start + pageSize)

  // Scroll ke baris terakhir yang diklik (restore state setelah back dari detail)
  useEffect(() => {
    try {
      const lastId = sessionStorage.getItem('penduduk_last_row')
      if (!lastId || !tbodyRef.current) return
      const row = tbodyRef.current.querySelector(`[data-id="${lastId}"]`) as HTMLElement | null
      if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'instant' })
      }
    } catch { /* ignore */ }
  }, [paged])

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#0d1424] flex items-center justify-center">
          <User size={24} className="text-slate-600" />
        </div>
        <p className="text-sm text-slate-500">Tidak ada data penduduk</p>
      </div>
    )
  }

  // Warna bg untuk sticky cells — harus sama dengan container
  const stickyBg = 'bg-[#0d1424]'
  const thSticky = `text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 sticky top-0 z-20 ${stickyBg} border-b border-white/[0.06]`
  const thNormal = `text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 sticky top-0 z-10 ${stickyBg} border-b border-white/[0.06]`

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[60dvh] -mx-4 px-4 relative">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            {/* No — sticky kiri + sticky atas */}
            <th className={`${thSticky} w-8 left-0 z-30`}>No</th>
            {/* Nama — sticky kiri kedua + sticky atas */}
            <th className={`${thSticky} left-8 z-30 min-w-[160px]`}>Nama Lengkap</th>
            <th className={thNormal}>NIK</th>
            <th className={thNormal}>No. KK</th>
            <th className={`${thNormal} w-12`}>JK</th>
            <th className={`${thNormal} w-14`}>Umur</th>
            <th className={`${thNormal} w-16`}>RT/RW</th>
            <th className={thNormal}>Hub. Keluarga</th>
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {paged.map((p, idx) => (
            <tr
              key={p.id}
              data-id={p.id}
              onClick={() => {
                try { sessionStorage.setItem('penduduk_last_row', p.id) } catch { /* ignore */ }
                router.push(`/penduduk/${p.id}`)
              }}
              className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              {/* No — sticky kiri */}
              <td className={`py-3 px-2 text-xs text-slate-600 sticky left-0 z-10 ${stickyBg}`}>{start + idx + 1}</td>
              {/* Nama — sticky kiri kedua */}
              <td className={`py-3 px-2 sticky left-8 z-10 ${stickyBg}`}>
                <p className="text-sm text-slate-200 group-hover:text-sky-400 transition-colors font-medium">{p.nama_lengkap}</p>
                <p className="text-[10px] text-slate-600">{p.pekerjaan}</p>
              </td>
              <td className="py-3 px-2 text-xs text-slate-400 tabular-nums">{p.nik}</td>
              <td className="py-3 px-2 text-xs text-slate-400 tabular-nums">{p.no_kk}</td>
              <td className="py-3 px-2">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                  p.jenis_kelamin === 'Laki-laki'
                    ? 'bg-sky-500/10 text-sky-400'
                    : 'bg-pink-500/10 text-pink-400'
                }`}>
                  {p.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                </span>
              </td>
              <td className="py-3 px-2 text-xs text-slate-400">{hitungUmur(p.tanggal_lahir)}</td>
              <td className="py-3 px-2 text-xs text-slate-400">{p.rt}/{p.rw}</td>
              <td className="py-3 px-2 text-xs text-slate-400">{p.hubungan_keluarga}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
