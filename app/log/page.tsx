'use client'

import { useState, useMemo } from 'react'
import {
  Activity, ArchiveRestore, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList,
  Info, Layers, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2, Undo2, X, type LucideIcon,
} from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useIsDesktop } from '@/components/layout/useIsDesktop'
import { PopLayer, hitungPos, type PopPos } from '@/components/penduduk/PopLayer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLogList, KOLEKSI_FILTER_OPTIONS } from '@/hooks/useLog'
import { cn } from '@/lib/utils'
import { hariIni, formatTanggalLokal } from '@/lib/tanggal-lokal'
import { OPSI_FILTER_AKSI, cocokAksi, infoBatasLog } from '@/lib/log-aksi'

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

// Lencana aksi: nilai aksi NYATA yang ditulis hook (huruf kecil). Hanya yang punya padanan di prototype
// (Tambah, Edit, Hapus, Pulihkan, Batal) berwarna; aksi lain tampil dari nilainya sendiri dengan lencana netral.
type Nada = 'ok' | 'info' | 'bad' | 'warn' | 'mute'
const AKSI_LOG: Record<string, { label: string; nada: Nada; Icon: LucideIcon }> = {
  tambah: { label: 'Tambah', nada: 'ok', Icon: Plus },
  edit: { label: 'Edit', nada: 'info', Icon: Pencil },
  hapus: { label: 'Hapus', nada: 'bad', Icon: Trash2 },
  restore: { label: 'Pulihkan', nada: 'ok', Icon: ArchiveRestore },
  rollback: { label: 'Batal', nada: 'warn', Icon: Undo2 },
}

function metaAksi(aksi: string | undefined) {
  const a = (aksi ?? '').trim()
  const m = AKSI_LOG[a.toLowerCase()]
  if (m) return m
  const t = a.replace(/_/g, ' ')
  return { label: t ? t.charAt(0).toUpperCase() + t.slice(1) : '—', nada: 'mute' as Nada, Icon: Activity }
}

// ── Bilah filter ──────────────────────────────────────────────────────────────

interface LogFilterState {
  search: string
  aksi: string
  koleksi: string
  dateFrom: string
  dateTo: string
}

type Opsi = { value: string; label: string }

function LogFilter({
  filter, onChange, total, filtered, onRefresh, isRefreshing,
}: {
  filter: LogFilterState
  onChange: (f: LogFilterState) => void
  total: number
  filtered: number
  onRefresh: () => void
  isRefreshing: boolean
}) {
  const [pop, setPop] = useState<{ jenis: 'aksi' | 'koleksi'; pos: PopPos } | null>(null)

  function set(patch: Partial<LogFilterState>) {
    onChange({ ...filter, ...patch })
  }

  // Filter bawaan: tanpa kata kunci/aksi/koleksi, rentang tanggal = hari ini (lokal)
  const today = hariIni()
  const sudahBawaan = !filter.search && !filter.aksi && !filter.koleksi && filter.dateFrom === today && filter.dateTo === today

  function handleReset() {
    onChange({ search: '', aksi: '', koleksi: '', dateFrom: today, dateTo: today })
  }

  const opsiAksi: readonly Opsi[] = OPSI_FILTER_AKSI
  const opsiKoleksi: readonly Opsi[] = KOLEKSI_FILTER_OPTIONS
  const labelAksi = filter.aksi ? opsiAksi.find(o => o.value === filter.aksi)?.label ?? filter.aksi : 'Semua aksi'
  const labelKoleksi = filter.koleksi ? opsiKoleksi.find(o => o.value === filter.koleksi)?.label ?? filter.koleksi : 'Semua koleksi'
  const daftar = pop?.jenis === 'aksi' ? opsiAksi : opsiKoleksi
  const terpilih = pop?.jenis === 'aksi' ? filter.aksi : filter.koleksi

  return (
    <div className="fbar" style={{ marginBottom: 12 }}>
      <div className="a-in srch">
        <Search className="i" />
        <input
          type="text"
          placeholder="Cari nama, keterangan, NIK, atau petugas"
          aria-label="Cari log"
          value={filter.search}
          onChange={e => set({ search: e.target.value })}
          autoComplete="off"
        />
        {filter.search && (
          <button type="button" className="pwt" aria-label="Hapus pencarian" onClick={() => set({ search: '' })}>
            <X className="i" />
          </button>
        )}
      </div>

      <div className="chips-row">
        <button
          type="button"
          className={cn('a-chip', filter.aksi && 'on')}
          aria-haspopup="menu"
          onClick={e => setPop({ jenis: 'aksi', pos: hitungPos(e.currentTarget, 220) })}
        >
          <Activity className="i" />{labelAksi}<ChevronDown className="i" style={{ fontSize: 13 }} />
        </button>
        <button
          type="button"
          className={cn('a-chip', filter.koleksi && 'on')}
          aria-haspopup="menu"
          onClick={e => setPop({ jenis: 'koleksi', pos: hitungPos(e.currentTarget, 220) })}
        >
          <Layers className="i" />{labelKoleksi}<ChevronDown className="i" style={{ fontSize: 13 }} />
        </button>
      </div>

      <div className="dtr">
        <Calendar className="i" />
        <input
          type="date"
          className="dt-in"
          aria-label="Tanggal dari"
          value={filter.dateFrom}
          onChange={e => set({ dateFrom: e.target.value })}
        />
        <span>s/d</span>
        <input
          type="date"
          className="dt-in"
          aria-label="Tanggal sampai"
          value={filter.dateTo}
          onChange={e => set({ dateTo: e.target.value })}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Muat ulang data (filter tidak berubah)"
        aria-label="Segarkan"
      >
        <RefreshCw className="i" style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
        Segarkan
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleReset}
        disabled={sudahBawaan}
        title="Kembalikan filter ke bawaan"
        aria-label="Reset filter"
        style={sudahBawaan ? undefined : { color: 'var(--lk)' }}
      >
        <RotateCcw className="i" />
        Reset
      </Button>

      <span className="cnt" style={{ marginLeft: 'auto' }}>
        <b>{filtered.toLocaleString('id-ID')}</b>{filtered !== total && <> dari {total.toLocaleString('id-ID')}</>} entri
      </span>

      {pop && (
        <PopLayer pos={pop.pos} lebar={220} title={pop.jenis === 'aksi' ? 'Aksi' : 'Koleksi'} onClose={() => setPop(null)}>
          {daftar.map(o => (
            <button
              key={o.value || '__semua'}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === terpilih}
              className={`o${o.value === terpilih ? ' on' : ''}`}
              onClick={() => {
                set(pop.jenis === 'aksi' ? { aksi: o.value } : { koleksi: o.value })
                setPop(null)
              }}
            >
              {o.value === '' ? 'Semua' : o.label}
              {o.value === terpilih && <Check className="i ck" />}
            </button>
          ))}
        </PopLayer>
      )}
    </div>
  )
}

// ── Halaman ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function LogPage() {
  const { data: allLogs = [], isLoading, refetch, isFetching } = useLogList()
  const isDesktop = useIsDesktop()

  // Tanggal hari ini (LOKAL, YYYY-MM-DD) untuk default filter
  const todayStr = hariIni()

  const [filter, setFilter] = useState<LogFilterState>({
    search: '',
    aksi: '',
    koleksi: '',
    dateFrom: todayStr,
    dateTo: todayStr,
  })
  const [page, setPage] = useState(1)

  function handleFilter(f: LogFilterState) {
    setFilter(f)
    setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = [...allLogs]

    // Filter aksi (pencocokan eksak; "Hapus" mencakup hapus dan hapus_permanen)
    if (filter.aksi) {
      rows = rows.filter((r) => cocokAksi(r.aksi, filter.aksi))
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

  // Log hanya memuat 500 entri terbaru (limit di hook); beri tahu bila hasil bisa belum lengkap
  const tertuaDate = allLogs.length > 0 ? tsToDate(allLogs[allLogs.length - 1].ts) : null
  const tertua = tertuaDate ? formatTanggalLokal(tertuaDate) : null
  const batas = infoBatasLog(allLogs.length, filter.dateFrom, tertua)

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const kosong = (
    <div className="a-empty">
      <div className="em"><ClipboardList className="i" style={{ fontSize: 30 }} /></div>
      <h3>Tidak ada log ditemukan</h3>
      <p>Coba ubah kata kunci, filter, atau rentang tanggal.</p>
      {batas.mulaiSebelumTertua && tertuaDate && (
        <p>Rentang tanggal dimulai sebelum entri tertua yang dimuat ({tertuaDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}); entri yang lebih lama tidak dimuat.</p>
      )}
    </div>
  )

  return (
    <AppShell title="Log Aktivitas">
      <PageHeader
        title="Log aktivitas"
        description={`Rekam jejak perubahan data oleh petugas · ${allLogs.length.toLocaleString('id-ID')} entri`}
      />

      <LogFilter
        filter={filter}
        onChange={handleFilter}
        total={allLogs.length}
        filtered={filtered.length}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      {!isLoading && batas.terpotong && (
        <div className="a-alert info" style={{ marginBottom: 12 }}>
          <Info className="i" />
          <div>
            Menampilkan 500 entri terbaru; entri yang lebih lama tidak dimuat.
            {batas.mulaiSebelumTertua && tertuaDate && (
              <> Rentang tanggal dimulai sebelum entri tertua yang dimuat ({tertuaDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}), jadi hasilnya bisa belum lengkap.</>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="a-tw">
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} style={{ height: 40 }} />)}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="a-tw">{kosong}</div>
      ) : isDesktop ? (
        <div className="a-tw">
          <div style={{ overflow: 'auto' }}>
            <table className="a-t" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th>Waktu</th>
                  <th>Aksi</th>
                  <th>Koleksi</th>
                  <th>Keterangan</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((log, idx) => {
                  const m = metaAksi(log.aksi)
                  return (
                    <tr key={log.id}>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="num">
                        <div style={{ color: 'var(--ink-2)' }}>{formatWaktu(log.ts)}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>{formatRelative(log.ts)}</div>
                      </td>
                      <td><span className={`a-badge ${m.nada}`}>{m.label}</span></td>
                      <td>{koleksiBadge(log.koleksi) ?? '—'}</td>
                      <td style={{ whiteSpace: 'normal', minWidth: 260, color: 'var(--ink)' }}>
                        {log.keterangan || log.nama || '—'}
                        {log.nik_target && <div className="mn" style={{ marginTop: 3, color: 'var(--ink-3)' }}>NIK {log.nik_target}</div>}
                      </td>
                      <td title={log.oleh}>{log.oleh}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > PAGE_SIZE && (
            <div className="a-pg">
              <span>
                Halaman <b style={{ color: 'var(--ink)' }}>{page}</b> dari <b style={{ color: 'var(--ink)' }}>{totalPages}</b>
                {' '}· {filtered.length.toLocaleString('id-ID')} log
              </span>
              <div className="pgs">
                <button type="button" className="ar" aria-label="Halaman sebelumnya"
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="i" style={{ fontSize: 15 }} />
                </button>
                <button type="button" className="ar" aria-label="Halaman berikutnya"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="i" style={{ fontSize: 15 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="a-card-list">
            {paged.map(log => {
              const m = metaAksi(log.aksi)
              return (
                <div key={log.id} className="a-lc" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                  <span
                    className="fi"
                    style={{
                      background: `var(--${m.nada}-bg)`, color: `var(--${m.nada})`,
                      width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                    }}
                  >
                    <m.Icon className="i" style={{ fontSize: 16 }} />
                  </span>
                  <div className="m">
                    <b style={{ fontSize: 13.5, whiteSpace: 'normal' }}>{log.keterangan || log.nama || '—'}</b>
                    <span>{m.label} · {koleksiBadge(log.koleksi) ?? '—'}</span>
                    <span>{formatWaktu(log.ts)} · {log.oleh}</span>
                    {log.nik_target && <span className="mn">NIK {log.nik_target}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          {filtered.length > PAGE_SIZE && (
            <div className="mpg">
              <Button type="button" variant="outline" size="sm" disabled={page === 1} aria-label="Halaman sebelumnya"
                onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft className="i" />Baru
              </Button>
              <span>{page}/{totalPages}</span>
              <Button type="button" variant="outline" size="sm" disabled={page === totalPages} aria-label="Halaman berikutnya"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Lama<ChevronRight className="i" />
              </Button>
            </div>
          )}
        </>
      )}
    </AppShell>
  )
}
