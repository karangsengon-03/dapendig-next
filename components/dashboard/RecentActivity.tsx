'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Timestamp } from 'firebase/firestore'
import type { LogEntry } from '@/types'

interface RecentActivityProps {
  logs: LogEntry[]
  loading?: boolean
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

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function aksiColor(aksi: string): string {
  if (aksi.includes('Tambah') || aksi.includes('Catat') || aksi.includes('Masuk')) {
    return 'bg-emerald-500/20 text-emerald-400'
  }
  if (aksi.includes('Edit') || aksi.includes('Update')) {
    return 'bg-sky-500/20 text-sky-400'
  }
  if (aksi.includes('Hapus') || aksi.includes('Keluar') || aksi.includes('Meninggal')) {
    return 'bg-rose-500/20 text-rose-400'
  }
  return 'bg-slate-500/20 text-slate-400'
}

export function RecentActivity({ logs, loading }: RecentActivityProps) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-4 flex flex-col gap-3">
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
        Aktivitas Terbaru
      </p>

      <div className="flex flex-col divide-y divide-white/[0.04]">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-3 flex items-start gap-3">
              <Skeleton className="w-16 h-5 rounded-full flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
            </div>
          ))
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-slate-600 text-sm">
            Belum ada aktivitas
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="py-3 flex items-start gap-3">
              <span
                className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${aksiColor(log.aksi)}`}
              >
                {log.aksi}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 leading-snug truncate">
                  {log.keterangan || `NIK ${log.nik_target}`}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {log.oleh} · {formatRelative(log.ts)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
