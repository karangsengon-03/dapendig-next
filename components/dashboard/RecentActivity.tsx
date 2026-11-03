'use client'

import Link from 'next/link'
import { Activity, ArchiveRestore, Pencil, Plus, Trash2, Undo2, type LucideIcon } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import type { LogEntry } from '@/types'

interface RecentActivityProps {
  logs: LogEntry[]
  loading?: boolean
  /** Konten tambahan di bawah daftar (mis. aksi cepat Beranda). */
  footer?: React.ReactNode
}

const BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function keTanggal(ts: unknown): Date | null {
  if (!ts) return null
  if (ts instanceof Timestamp) return ts.toDate()
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return new Date((ts as { seconds: number }).seconds * 1000)
  }
  return null
}

function formatWaktu(ts: unknown): string {
  const d = keTanggal(ts)
  if (!d) return '—'
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return `${String(d.getDate()).padStart(2, '0')} ${BLN3[d.getMonth()]} ${d.getFullYear()}`
}

// Ikon + warna token per jenis aksi (padanan logIcon prototype; nilai aksi zip beragam, jadi dicocokkan longgar).
function ikonAksi(aksi: string): [LucideIcon, 'ok' | 'info' | 'bad' | 'warn'] {
  const a = (aksi ?? '').toLowerCase()
  if (a.includes('pulih')) return [ArchiveRestore, 'ok']
  if (a.includes('batal')) return [Undo2, 'warn']
  if (a.includes('hapus') || a.includes('keluar') || a.includes('meninggal')) return [Trash2, 'bad']
  if (a.includes('tambah') || a.includes('catat') || a.includes('masuk') || a.includes('lahir')) return [Plus, 'ok']
  if (a.includes('edit') || a.includes('update') || a.includes('ubah')) return [Pencil, 'info']
  return [Activity, 'info']
}

export function RecentActivity({ logs, loading, footer }: RecentActivityProps) {
  return (
    <div className="a-card p">
      <div className="ch2">
        <h3>Aktivitas terbaru</h3>
        <Link href="/log" className="lnk2">Lihat semua</Link>
      </div>

      <div className="feed">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="fd">
              <Skeleton style={{ width: 32, height: 32, borderRadius: 10, flex: 'none' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton style={{ height: 13, width: '75%' }} />
                <Skeleton style={{ height: 11, width: '45%' }} />
              </div>
            </div>
          ))
        ) : logs.length === 0 ? (
          <p className="kosong">Belum ada aktivitas</p>
        ) : (
          logs.map(log => {
            const [Ikon, warna] = ikonAksi(log.aksi)
            return (
              <div key={log.id} className="fd">
                <span className="fi" style={{ background: `var(--${warna}-bg)`, color: `var(--${warna})` }}>
                  <Ikon className="i" style={{ fontSize: 15 }} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <b>{log.keterangan || `NIK ${log.nik_target}`}</b>
                  <span>{log.aksi} · {formatWaktu(log.ts)} · {log.oleh}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {footer}
    </div>
  )
}
