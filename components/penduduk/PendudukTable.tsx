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

  // Sticky header: z-20 untuk kolom biasa, z-30 untuk kolom freeze (No & Nama)
  // Sticky body: z-10 untuk kolom biasa, z-20 untuk kolom freeze
  // bg-[#0d1424] eksplisit di semua sticky cell agar tidak tembus konten scroll
  const thBase = 'text-left text-xs font-semibold uppercase tracking-wider text-slate-500 py-3 px-3 bg-[#0d1424] border-b border-white/[0.06] whitespace-nowrap'
  const thSticky  = `${thBase} sticky top-0 z-20`
  const thFreezeNo  = `${thBase} sticky top-0 left-0 z-30`
  const thFreezeNama = `${thBase} sticky top-0 left-9 z-30 min-w-[160px]`

  // Lebar kolom No = w-9 (36px), sesuai left-9
  const tdFreezeNo   = 'py-3 px-3 text-xs text-slate-500 sticky left-0 z-20 bg-[#0d1424] group-hover:bg-[#121a2e] transition-colors w-9'
  const tdFreezeNama = 'py-3 px-3 sticky left-9 z-20 bg-[#0d1424] group-hover:bg-[#121a2e] transition-colors min-w-[160px]'

  return (
    /* Wrapper: fill tinggi parent (flex-1 min-h-0), sticky berfungsi karena tidak ada negative margin */
    <div className="overflow-x-auto overflow-y-auto h-full rounded-xl">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            <th className={thFreezeNo}>No</th>
            <th className={thFreezeNama}>Nama Lengkap</th>
            <th className={thSticky}>NIK</th>
            <th className={thSticky}>No. KK</th>
            <th className={`${thSticky} w-12`}>JK</th>
            <th className={`${thSticky} w-14`}>Umur</th>
            <th className={`${thSticky} w-16`}>RT/RW</th>
            <th className={thSticky}>Hub. Keluarga</th>
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
              className="bg-[#0d1424] border-b border-white/[0.04] hover:bg-[#121a2e] transition-colors cursor-pointer group"
            >
              <td className={tdFreezeNo}>{start + idx + 1}</td>
              <td className={tdFreezeNama}>
                <p className="text-sm text-slate-200 group-hover:text-sky-400 transition-colors font-medium leading-snug">{p.nama_lengkap}</p>
                <p className="text-xs text-slate-600 mt-0.5">{p.pekerjaan}</p>
              </td>
              <td className="py-3 px-3 text-xs text-slate-400 tabular-nums">{p.nik}</td>
              <td className="py-3 px-3 text-xs text-slate-400 tabular-nums">{p.no_kk}</td>
              <td className="py-3 px-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                  p.jenis_kelamin === 'Laki-laki'
                    ? 'bg-sky-500/10 text-sky-400'
                    : 'bg-pink-500/10 text-pink-400'
                }`}>
                  {p.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                </span>
              </td>
              <td className="py-3 px-3 text-xs text-slate-400">{hitungUmur(p.tanggal_lahir)}</td>
              <td className="py-3 px-3 text-xs text-slate-400">{p.rt}/{p.rw}</td>
              <td className="py-3 px-3 text-xs text-slate-400">{p.hubungan_keluarga}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
