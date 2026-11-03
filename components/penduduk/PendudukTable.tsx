'use client'

import { useRouter } from 'next/navigation'
import { rt3 } from '@/lib/rt-rw'
import { useEffect, useRef } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { JkIkon } from '@/components/ui/jk-ikon'
import type { Penduduk } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { hitungUmur as calcUmur } from '@/lib/dateUtils'

interface PendudukTableProps {
  data: Penduduk[]
  loading: boolean
  page: number
  pageSize: number
  /** 'tabel' = tabel `.a-t` (desktop); 'kartu' = daftar kartu `.a-lc` (HP). Halaman merender keduanya; CSS memilih yang tampak. */
  tampilan?: 'tabel' | 'kartu'
  /** Bila diisi, keadaan kosong menampilkan tombol "Hapus semua filter". */
  onReset?: () => void
}

function hitungUmur(tanggalLahir: string): string {
  const umur = calcUmur(tanggalLahir)
  if (umur < 0) return '—'
  return `${umur} th`
}

const BADGE_STATUS: Record<string, { cls: string; label: string }> = {
  'aktif':         { cls: 'ok',   label: 'Aktif' },
  'meninggal':     { cls: 'bad',  label: 'Meninggal' },
  'mutasi-keluar': { cls: 'warn', label: 'Mutasi keluar' },
  'tidak aktif':   { cls: 'mute', label: 'Tidak aktif' },
}

function StatusBadge({ status }: { status: string }) {
  const b = BADGE_STATUS[status]
  if (!b) return null
  return <span className={`a-badge sm ${b.cls}`}>{b.label}</span>
}

function JkBadge({ jk }: { jk: string }) {
  const laki = jk === 'Laki-laki'
  return <span className={`jkb ${laki ? 'lk' : 'pr'}`}><JkIkon jk={laki ? 'L' : 'P'} size={11} />{laki ? 'L' : 'P'}</span>
}

export function PendudukTable({ data, loading, page, pageSize, tampilan = 'tabel', onReset }: PendudukTableProps) {
  const router = useRouter()

  const wadahRef = useRef<HTMLElement>(null)
  const start = (page - 1) * pageSize
  const paged = data.slice(start, start + pageSize)

  // Scroll ke baris terakhir yang diklik (restore state setelah back dari detail)
  useEffect(() => {
    try {
      const lastId = sessionStorage.getItem('penduduk_last_row')
      if (!lastId || !wadahRef.current) return
      const row = wadahRef.current.querySelector(`[data-id="${lastId}"]`) as HTMLElement | null
      if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'instant' })
      }
    } catch { /* ignore */ }
  }, [paged])

  function buka(id: string) {
    try { sessionStorage.setItem('penduduk_last_row', id) } catch { /* ignore */ }
    router.push(`/penduduk/${id}`)
  }

  if (loading) {
    return tampilan === 'tabel' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} style={{ height: 48, borderRadius: 10 }} />)}
      </div>
    ) : (
      <div className="a-card-list">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} style={{ height: 72, borderRadius: 14 }} />)}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="a-empty">
        <div className="em"><Search className="i" style={{ fontSize: 30 }} /></div>
        <h3>Tidak ada penduduk yang cocok</h3>
        <p>Coba kurangi filter atau periksa ejaan nama dan NIK yang dicari.</p>
        {onReset && <Button type="button" variant="secondary" onClick={onReset}>Hapus semua filter</Button>}
      </div>
    )
  }

  if (tampilan === 'kartu') {
    return (
      <div className="a-card-list" ref={wadahRef as React.RefObject<HTMLDivElement>}>
        {paged.map(p => (
          <div
            key={p.id}
            data-id={p.id}
            className="a-lc"
            role="link"
            tabIndex={0}
            onClick={() => buka(p.id)}
            onKeyDown={e => { if (e.key === 'Enter') buka(p.id) }}
          >
            <Avatar nama={p.nama_lengkap} jk={p.jenis_kelamin} size={46} />
            <div className="m">
              <b>{p.nama_lengkap}</b>
              <span>{p.hubungan_keluarga} · {hitungUmur(p.tanggal_lahir)} · RT {rt3(p.rt)}/RW {rt3(p.rw)}</span>
              <span className="mn">{p.nik}</span>
            </div>
            {p.status !== 'aktif' && <StatusBadge status={p.status} />}
            <ChevronRight className="i" style={{ fontSize: 18, color: 'var(--ink-4)' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <table className="a-t" style={{ minWidth: 980 }}>
      <thead>
        <tr>
          <th className="frz frz-no">No</th>
          <th className="frz frz-nm">Nama</th>
          <th>NIK</th>
          <th>No. KK</th>
          <th>JK</th>
          <th>Hubungan</th>
          <th>Umur</th>
          <th>RT/RW</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody ref={wadahRef as React.RefObject<HTMLTableSectionElement>}>
        {paged.map((p, idx) => (
          <tr
            key={p.id}
            data-id={p.id}
            className="row"
            tabIndex={0}
            onClick={() => buka(p.id)}
            onKeyDown={e => { if (e.key === 'Enter') buka(p.id) }}
          >
            <td className="frz frz-no">{start + idx + 1}</td>
            <td className="frz frz-nm nm2">
              <div className="nmi">
                <Avatar nama={p.nama_lengkap} jk={p.jenis_kelamin} size={36} />
                <div>
                  <div className="n">{p.nama_lengkap}</div>
                  <div className="s">{p.pekerjaan}</div>
                </div>
              </div>
            </td>
            <td className="mn">{p.nik}</td>
            <td className="mn">{p.no_kk}</td>
            <td><JkBadge jk={p.jenis_kelamin} /></td>
            <td>
              <span className={`a-badge sm nd ${p.hubungan_keluarga === 'Kepala Keluarga' ? 'info' : 'mute'}`}>
                {p.hubungan_keluarga}
              </span>
            </td>
            <td className="num">{hitungUmur(p.tanggal_lahir)}</td>
            <td className="num">RT {rt3(p.rt)}/RW {rt3(p.rw)}</td>
            <td><StatusBadge status={p.status} /></td>
            <td style={{ textAlign: 'right', color: 'var(--ink-4)' }}><ChevronRight className="i" style={{ fontSize: 17 }} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
