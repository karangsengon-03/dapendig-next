'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BarChart2, Settings2, X, Check } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useMonografi, useSaveKelompokUmurConfig, DEFAULT_KELOMPOK_UMUR_CONFIG, formatKelompokLabel, type KelompokUmurConfig, type KelompokUmurEntry } from '@/hooks/useMonografi'
import { Skeleton } from '@/components/ui/skeleton'

function StatCard({ label, value, sub, color = 'sky' }: {
  label: string; value: number | string; sub?: string
  color?: 'sky' | 'emerald' | 'rose' | 'amber'
}) {
  const colors = {
    sky:     { border: 'border-sky-500',     text: 'text-sky-400' },
    emerald: { border: 'border-emerald-500', text: 'text-emerald-400' },
    rose:    { border: 'border-rose-500',    text: 'text-rose-400' },
    amber:   { border: 'border-amber-500',   text: 'text-amber-400' },
  }[color]

  return (
    <div className={`rounded-xl border-l-4 ${colors.border} bg-[#0d1424] border border-white/[0.06] p-4`}>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

// ── Statistik Usia Produktif & Tanggungan ────────────────────────────────────
function UsiaTanggungan({
  data,
  kelompokConfig,
  total,
}: {
  data: { kelompok: string; laki: number; perempuan: number }[]
  kelompokConfig: import('@/hooks/useMonografi').KelompokUmurConfig
  total: number
}) {
  // Hitung 3 bucket dari konfigurasi piramida yang aktif
  let tanggunganMuda = 0  // 0–14
  let produktif = 0       // 15–64
  let tanggunganTua = 0   // 65+

  data.forEach((row, i) => {
    const cfg = kelompokConfig[i]
    if (!cfg) return
    const jumlah = row.laki + row.perempuan
    if (cfg.max <= 14) tanggunganMuda += jumlah
    else if (cfg.min >= 65) tanggunganTua += jumlah
    else produktif += jumlah
  })

  const totalTertanggungan = tanggunganMuda + tanggunganTua
  const rasio = produktif > 0
    ? Math.round((totalTertanggungan / produktif) * 100)
    : 0

  const pct = (n: number) =>
    total > 0 ? Math.round((n / total) * 100) : 0

  const buckets = [
    {
      label: 'Tanggungan Muda',
      sublabel: 'Usia 0–14 tahun',
      value: tanggunganMuda,
      persen: pct(tanggunganMuda),
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      bar: 'bg-amber-500',
    },
    {
      label: 'Usia Produktif',
      sublabel: 'Usia 15–64 tahun',
      value: produktif,
      persen: pct(produktif),
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      bar: 'bg-emerald-500',
    },
    {
      label: 'Tanggungan Tua',
      sublabel: 'Usia 65+ tahun',
      value: tanggunganTua,
      persen: pct(tanggunganTua),
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      bar: 'bg-rose-400',
    },
  ]

  return (
    <div className="bg-[#0d1424] rounded-xl p-4 border border-white/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-200">Komposisi Beban Tanggungan</h3>
        <span className="text-xs text-slate-500 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1">
          {total} jiwa aktif
        </span>
      </div>

      {/* 3 kartu bucket */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {buckets.map((b) => (
          <div key={b.label} className={`rounded-xl ${b.bg} border ${b.border} p-3 flex flex-col gap-1`}>
            <span className="text-xs text-slate-400 leading-tight">{b.label}</span>
            <span className={`text-2xl font-bold tabular-nums ${b.color}`}>{b.value}</span>
            <span className="text-xs text-slate-500">{b.persen}%</span>
            <span className="text-xs text-slate-600 leading-tight">{b.sublabel}</span>
          </div>
        ))}
      </div>

      {/* Bar perbandingan */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-3">
        {buckets.map((b) => (
          <div
            key={b.label}
            className={`${b.bar} transition-all`}
            style={{ width: `${b.persen}%` }}
            title={`${b.label}: ${b.value} jiwa (${b.persen}%)`}
          />
        ))}
      </div>

      {/* Rasio Beban Tanggungan */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div>
          <p className="text-sm font-semibold text-slate-300">Rasio Beban Tanggungan</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Per 100 jiwa produktif menanggung{' '}
            <span className="text-slate-300 font-medium">{rasio} jiwa</span>
          </p>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-bold tabular-nums ${
            rasio <= 50 ? 'text-emerald-400' :
            rasio <= 80 ? 'text-amber-400' : 'text-rose-400'
          }`}>{rasio}</span>
          <p className="text-xs text-slate-600 mt-0.5">
            {rasio <= 50 ? 'Rendah ✓' : rasio <= 80 ? 'Sedang' : 'Tinggi'}
          </p>
        </div>
      </div>
    </div>
  )
}

function BarRow({ label, value, total, color = 'bg-sky-500', onClick }: {
  label: string; value: number; total: number; color?: string; onClick?: () => void
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors group',
        onClick ? 'cursor-pointer hover:bg-white/[0.05] active:bg-white/[0.08]' : '',
      ].join(' ')}
      onClick={onClick}
      title={onClick ? `Klik untuk lihat ${value} penduduk` : undefined}
    >
      <span className={[
        'w-36 truncate text-sm shrink-0',
        onClick ? 'text-slate-200 group-hover:text-sky-400 transition-colors' : 'text-slate-400',
      ].join(' ')}>{label}</span>
      <div className="flex-1 bg-[#0d1424] rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={[
        'w-24 text-right text-sm shrink-0 tabular-nums flex items-center justify-end gap-1',
        onClick ? 'text-slate-300' : 'text-slate-500',
      ].join(' ')}>
        <span>{value} <span className="text-slate-500 text-xs">({pct}%)</span></span>
        {onClick && (
          <span className="text-sky-400 text-xs font-semibold bg-sky-500/10 border border-sky-500/20 rounded px-1 py-0.5 leading-none group-hover:bg-sky-500/20 transition-colors">
            →
          </span>
        )}
      </span>
    </div>
  )
}

function PiramidaUmur({ data }: { data: { kelompok: string; laki: number; perempuan: number }[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.laki, d.perempuan]), 1)
  return (
    <div className="bg-[#0d1424] rounded-xl p-4 border border-white/[0.06]">
      <h3 className="font-semibold text-slate-200 mb-4">Piramida Umur</h3>
      <div className="flex justify-center gap-6 mb-3 text-sm text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-500 inline-block" />Laki-laki</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-400 inline-block" />Perempuan</span>
      </div>
      <div className="space-y-1">
        {[...data].reverse().map((row) => {
          const lakiPct = (row.laki / maxVal) * 100
          const perPct = (row.perempuan / maxVal) * 100
          return (
            <div key={row.kelompok} className="flex items-center gap-1">
              {/* Bar kiri — laki */}
              <div className="flex-1 flex justify-end">
                <div
                  className="bg-sky-500 h-7 rounded-l flex items-center justify-end pr-1.5 text-white text-sm font-medium tabular-nums shrink-0"
                  style={{ width: `${lakiPct}%`, minWidth: row.laki > 0 ? '24px' : '0' }}
                >
                  {row.laki > 0 ? row.laki : ''}
                </div>
              </div>
              {/* Label kelompok umur — lebar tetap, no-wrap */}
              <div className="w-14 text-center text-sm text-slate-400 shrink-0 whitespace-nowrap font-mono leading-none">
                {row.kelompok}
              </div>
              {/* Bar kanan — perempuan */}
              <div className="flex-1 flex justify-start">
                <div
                  className="bg-rose-400 h-7 rounded-r flex items-center justify-start pl-1.5 text-white text-sm font-medium tabular-nums shrink-0"
                  style={{ width: `${perPct}%`, minWidth: row.perempuan > 0 ? '24px' : '0' }}
                >
                  {row.perempuan > 0 ? row.perempuan : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Klasifikasi umur sesuai ketentuan Angga
const KLASIFIKASI_UMUR = [
  { label: 'Balita', min: 0, max: 5, color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' },
  { label: 'Anak-anak', min: 6, max: 10, color: 'text-sky-400', border: 'border-sky-500/40', bg: 'bg-sky-500/10' },
  { label: 'Remaja', min: 11, max: 19, color: 'text-violet-400', border: 'border-violet-500/40', bg: 'bg-violet-500/10' },
  { label: 'Dewasa', min: 20, max: 44, color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10' },
  { label: 'Lansia', min: 45, max: 999, color: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-500/10' },
]

function KlasifikasiUmur({ byKlasifikasi }: { byKlasifikasi: Record<string, number> }) {
  return (
    <div className="bg-[#0d1424] rounded-xl p-4 border border-white/[0.06]">
      <h3 className="font-semibold text-slate-200 mb-3">Klasifikasi Umur</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {KLASIFIKASI_UMUR.map((k) => (
          <div key={k.label} className={`rounded-xl ${k.bg} border ${k.border} p-3 flex flex-col gap-1`}>
            <span className="text-xs text-slate-400 font-medium">{k.label}</span>
            <span className={`text-2xl font-bold ${k.color}`}>{byKlasifikasi[k.label] ?? 0}</span>
            <span className="text-sm text-slate-500">
              {k.min === 0 ? `0–${k.max} th` : k.max === 999 ? `${k.min}+ th` : `${k.min}–${k.max} th`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Card({ title, children, total, totalLabel = 'total data' }: {
  title: string; children: React.ReactNode; total?: number; totalLabel?: string
}) {
  return (
    <div className="bg-[#0d1424] rounded-xl p-4 border border-white/[0.06]">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">{title}</h3>
      {children}
      {total !== undefined && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-sm text-slate-500 uppercase tracking-wider">Total tercatat</span>
          <span className="text-sm font-semibold text-slate-400 tabular-nums">{total} {totalLabel}</span>
        </div>
      )}
    </div>
  )
}

// ── Modal Pengaturan Rentang Umur Piramida (Custom Bebas) ───────────────────
//
// User bisa definisikan kelompok umur sepenuhnya bebas:
//   - Tambah baris: isi min & max lalu klik Tambah
//   - Hapus baris yang tidak diinginkan
//   - Tidak ada batasan interval — bebas: 0-4, 5-14, 15-19, 20-40, dst.
//
// Satu aturan validasi utama: kelompok tidak boleh overlap dan harus urut.

function PengaturanPiramidaModal({
  config,
  onClose,
  onSave,
}: {
  config: KelompokUmurConfig
  onClose: () => void
  onSave: (c: KelompokUmurConfig) => void
}) {
  // Editable list of entries; kita tampilkan sebagai rows
  const [rows, setRows] = useState<KelompokUmurEntry[]>(() =>
    config.length > 0 ? config.map((e) => ({ ...e })) : [...DEFAULT_KELOMPOK_UMUR_CONFIG]
  )
  // Input untuk tambah baru
  const [newMin, setNewMin] = useState('')
  const [newMax, setNewMax] = useState('')
  const [addError, setAddError] = useState('')
  const [saveError, setSaveError] = useState('')

  function handleTambah() {
    setAddError('')
    const mn = parseInt(newMin, 10)
    const mx = newMax.trim() === '+' || newMax.trim() === '' ? 999 : parseInt(newMax, 10)
    if (isNaN(mn) || mn < 0) { setAddError('Umur min tidak valid'); return }
    if (isNaN(mx) || (mx !== 999 && mx < mn)) { setAddError('Umur maks tidak valid atau lebih kecil dari min'); return }
    // Cek overlap dengan yang sudah ada
    const overlap = rows.some((r) => !(mx < r.min || mn > r.max))
    if (overlap) { setAddError('Rentang umur ini overlap dengan kelompok yang sudah ada'); return }
    const newRows = [...rows, { min: mn, max: mx }].sort((a, b) => a.min - b.min)
    setRows(newRows)
    setNewMin('')
    setNewMax('')
  }

  function handleHapus(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx))
    setSaveError('')
  }

  function handleReset() {
    setRows([...DEFAULT_KELOMPOK_UMUR_CONFIG])
    setSaveError('')
    setAddError('')
  }

  function handleSave() {
    setSaveError('')
    if (rows.length === 0) { setSaveError('Minimal harus ada 1 kelompok umur'); return }
    if (rows.length > 30) { setSaveError('Maksimal 30 kelompok umur'); return }
    // Pastikan sorted dan tidak overlap
    const sorted = [...rows].sort((a, b) => a.min - b.min)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min <= sorted[i - 1].max && sorted[i - 1].max !== 999) {
        setSaveError('Ada kelompok umur yang overlap — harap perbaiki')
        return
      }
    }
    onSave(sorted)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full flex flex-col gap-5 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
              <Settings2 size={18} className="text-sky-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-100 text-sm">Rentang Umur Piramida</p>
              <p className="text-sm text-slate-500 mt-0.5">Atur kelompok umur sesuai kebutuhan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5">
            <X size={15} />
          </button>
        </div>

        {/* Daftar kelompok yang sudah ada */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">{rows.length} Kelompok Umur</p>
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              Reset ke default
            </button>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Belum ada kelompok. Tambah di bawah.</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
              {[...rows].sort((a, b) => a.min - b.min).map((row, i) => (
                <div key={i} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.06]">
                  <span className="text-sm text-slate-200 font-mono">{formatKelompokLabel(row)}</span>
                  <button
                    onClick={() => handleHapus(rows.indexOf(row))}
                    className="text-rose-400/60 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tambah kelompok baru */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-400">Tambah Kelompok Baru</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-sm text-slate-500">Umur Min</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={newMin}
                  onChange={(e) => { setNewMin(e.target.value); setAddError('') }}
                  placeholder="0"
                  className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                />
              </div>
              <span className="text-slate-600 pt-5">—</span>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-sm text-slate-500">Umur Maks (+ = tak terbatas)</label>
                <input
                  type="text"
                  value={newMax}
                  onChange={(e) => { setNewMax(e.target.value); setAddError('') }}
                  placeholder="4 atau +"
                  className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                />
              </div>
            </div>
            <button
              onClick={handleTambah}
              className="w-full py-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-medium hover:bg-sky-500/30 transition-colors"
            >
              + Tambah Kelompok
            </button>
          </div>
          {addError && <p className="text-xs text-rose-400">{addError}</p>}
          <p className="text-xs text-slate-600">
            Contoh: min=0 maks=4 → &ldquo;0–4&rdquo; &nbsp;|&nbsp; min=65 maks=+ → &ldquo;65+&rdquo;
          </p>
        </div>

        {saveError && <p className="text-xs text-rose-400">{saveError}</p>}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:text-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={14} />
            Terapkan
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MonografiPage() {
  const { data, isLoading } = useMonografi()
  const saveMutation = useSaveKelompokUmurConfig()
  const router = useRouter()
  const [showPengaturan, setShowPengaturan] = useState(false)

  function goFilter(key: string, value: string) {
    router.push(`/penduduk?${key}=${encodeURIComponent(value)}&status=aktif`)
  }

  function handleSaveConfig(config: KelompokUmurConfig) {
    saveMutation.mutate(config, {
      onSuccess: () => setShowPengaturan(false),
    })
  }

  return (
    <AppShell title="Monografi">
      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        {/* Sub-header */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <BarChart2 size={18} className="text-sky-400 shrink-0" />
            <h1 className="text-base font-semibold text-slate-100">Monografi</h1>
          </div>
          <button
            onClick={() => setShowPengaturan(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200 text-xs transition-colors"
          >
            <Settings2 size={13} />
            Rentang Umur
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : !data ? null : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Penduduk Aktif" value={data.totalAktif} color="sky" />
              <StatCard label="Tidak Aktif" value={data.totalTidakAktif} color="amber" />
              <StatCard label="Laki-laki" value={data.laki}
                sub={`${Math.round((data.laki / Math.max(data.totalAktif, 1)) * 100)}%`} color="sky" />
              <StatCard label="Perempuan" value={data.perempuan}
                sub={`${Math.round((data.perempuan / Math.max(data.totalAktif, 1)) * 100)}%`} color="rose" />
            </div>

            <div className="relative">
              <PiramidaUmur data={data.piramidaUmur} />
              <div className="absolute top-3 right-3">
                <span className="text-[10px] text-slate-600 bg-[#0d1424] px-2 py-0.5 rounded-full border border-white/[0.06]">
                  {data.kelompokUmurConfig.length} kelompok
                </span>
              </div>
            </div>
            <div className="bg-[#0d1424] rounded-xl px-4 py-2.5 border border-white/[0.06] flex items-center justify-between -mt-2">
              <span className="text-sm text-slate-500 uppercase tracking-wider">Total tercatat dalam piramida</span>
              <span className="text-xs font-semibold text-slate-400 tabular-nums">
                {data.piramidaUmur.reduce((s,r)=>s+r.laki+r.perempuan,0)} jiwa
              </span>
            </div>

            <KlasifikasiUmur byKlasifikasi={data.byKlasifikasiUmur} />
            <div className="bg-[#0d1424] rounded-xl px-4 py-2.5 border border-white/[0.06] flex items-center justify-between -mt-2">
              <span className="text-sm text-slate-500 uppercase tracking-wider">Total tercatat dalam klasifikasi</span>
              <span className="text-xs font-semibold text-slate-400 tabular-nums">
                {Object.values(data.byKlasifikasiUmur).reduce((a,b)=>a+b,0)} jiwa
              </span>
            </div>

            {/* ── Statistik Usia Produktif & Tanggungan ── */}
            <UsiaTanggungan data={data.piramidaUmur} kelompokConfig={data.kelompokUmurConfig} total={data.totalAktif} />


            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Agama" total={Object.values(data.byAgama).reduce((a,b)=>a+b,0)} totalLabel="jiwa">
                <p className="text-sm text-slate-500 mb-2">Klik untuk lihat penduduk ↗</p>
                <div className="space-y-1">
                  {(Object.entries(data.byAgama) as [string, number][]).filter(([,n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([agama, n]) => (
                    <BarRow key={agama} label={agama} value={n} total={data.totalAktif} color="bg-emerald-500"
                      onClick={() => goFilter('agama', agama)} />
                  ))}
                </div>
              </Card>
              <Card title="Status Perkawinan" total={Object.values(data.byStatusPerkawinan).reduce((a,b)=>a+b,0)} totalLabel="jiwa">
                <p className="text-sm text-slate-500 mb-2">Klik untuk lihat penduduk ↗</p>
                <div className="space-y-1">
                  {(Object.entries(data.byStatusPerkawinan) as [string, number][]).filter(([,n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([status, n]) => (
                    <BarRow key={status} label={status} value={n} total={data.totalAktif} color="bg-amber-500"
                      onClick={() => goFilter('statusPerkawinan', status)} />
                  ))}
                </div>
              </Card>
            </div>

            <Card title="Tingkat Pendidikan" total={Object.values(data.byPendidikan).reduce((a,b)=>a+b,0)} totalLabel="jiwa">
              <p className="text-sm text-slate-500 mb-2">Klik untuk lihat penduduk ↗</p>
              <div className="space-y-1">
                {(Object.entries(data.byPendidikan) as [string, number][]).filter(([,n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([pend, n]) => (
                  <BarRow key={pend} label={pend} value={n} total={data.totalAktif} color="bg-sky-500"
                    onClick={() => goFilter('pendidikan', pend)} />
                ))}
              </div>
            </Card>

            <Card title="Pekerjaan" total={Object.values(data.byPekerjaan).reduce((a,b)=>a+b,0)} totalLabel="jiwa">
              <p className="text-sm text-slate-500 mb-2">Klik untuk lihat penduduk ↗</p>
              <div className="space-y-1">
                {(Object.entries(data.byPekerjaan) as [string, number][]).filter(([,n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([pek, n]) => (
                  <BarRow key={pek} label={pek} value={n} total={data.totalAktif} color="bg-rose-400"
                    onClick={() => goFilter('pekerjaan', pek)} />
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
      {showPengaturan && (
        <PengaturanPiramidaModal
          config={data?.kelompokUmurConfig ?? DEFAULT_KELOMPOK_UMUR_CONFIG}
          onClose={() => setShowPengaturan(false)}
          onSave={handleSaveConfig}
        />
      )}
    </AppShell>
  )
}
