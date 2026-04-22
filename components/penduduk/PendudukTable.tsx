'use client'

import { useRouter } from 'next/navigation'
import { Eye, Pencil, Trash2, User } from 'lucide-react'
import type { Penduduk } from '@/types'
import type { UserRole } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

interface PendudukTableProps {
  data: Penduduk[]
  loading: boolean
  role: UserRole
  page: number
  pageSize: number
  onDelete: (p: Penduduk) => void
}

function hitungUmur(tanggalLahir: string): string {
  if (!tanggalLahir) return '—'
  const lahir = new Date(tanggalLahir + 'T00:00:00')
  const now = new Date()
  let umur = now.getFullYear() - lahir.getFullYear()
  const bln = now.getMonth() - lahir.getMonth()
  if (bln < 0 || (bln === 0 && now.getDate() < lahir.getDate())) umur--
  return `${umur} th`
}

export function PendudukTable({
  data,
  loading,
  role,
  page,
  pageSize,
  onDelete,
}: PendudukTableProps) {
  const router = useRouter()

  const canEdit = role === 'admin' || role === 'operator'
  const canDelete = role === 'admin'

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
        <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
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
      <table className="w-full min-w-[700px] border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-8">
              No
            </th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2">
              Nama Lengkap
            </th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2">
              NIK
            </th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2">
              No. KK
            </th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-12">
              JK
            </th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-14">
              Umur
            </th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-16">
              RT/RW
            </th>
            <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2">
              Hub. Keluarga
            </th>
            {(canEdit || canDelete) && (
              <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-2 px-2 w-24">
                Aksi
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {paged.map((p, idx) => (
            <tr
              key={p.id}
              className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
            >
              <td className="py-3 px-2 text-xs text-slate-600">
                {start + idx + 1}
              </td>
              <td className="py-3 px-2">
                <button
                  onClick={() => router.push(`/penduduk/${p.id}`)}
                  className="text-sm text-slate-200 hover:text-sky-400 transition-colors font-medium text-left"
                >
                  {p.nama_lengkap}
                </button>
                <p className="text-[10px] text-slate-600">{p.pekerjaan}</p>
              </td>
              <td className="py-3 px-2 text-xs text-slate-400 tabular-nums">
                {p.nik}
              </td>
              <td className="py-3 px-2 text-xs text-slate-400 tabular-nums">
                {p.no_kk}
              </td>
              <td className="py-3 px-2">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                    p.jenis_kelamin === 'Laki-laki'
                      ? 'bg-sky-500/10 text-sky-400'
                      : 'bg-pink-500/10 text-pink-400'
                  }`}
                >
                  {p.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                </span>
              </td>
              <td className="py-3 px-2 text-xs text-slate-400">
                {hitungUmur(p.tanggal_lahir)}
              </td>
              <td className="py-3 px-2 text-xs text-slate-400">
                {p.rt}/{p.rw}
              </td>
              <td className="py-3 px-2 text-xs text-slate-400">
                {p.hubungan_keluarga}
              </td>
              {(canEdit || canDelete) && (
                <td className="py-3 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => router.push(`/penduduk/${p.id}`)}
                      title="Detail"
                      className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <Eye size={13} />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => router.push(`/penduduk/${p.id}/edit`)}
                        title="Edit"
                        className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-amber-500/20 flex items-center justify-center text-slate-400 hover:text-amber-400 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => onDelete(p)}
                        title="Hapus"
                        className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
