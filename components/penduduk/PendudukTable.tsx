'use client'

import { useRouter } from 'next/navigation'
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

  const start = (page - 1) * pageSize
  const paged = data.slice(start, start + pageSize)

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-8">No</th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2">Nama Lengkap</th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2">NIK</th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2">No. KK</th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-12">JK</th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-14">Umur</th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-16">RT/RW</th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2">Hub. Keluarga</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((p, idx) => (
            <tr
              key={p.id}
              onClick={() => router.push(`/penduduk/${p.id}`)}
              className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <td className="py-3 px-2 text-xs text-slate-600">{start + idx + 1}</td>
              <td className="py-3 px-2">
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
