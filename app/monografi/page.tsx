'use client'

import { useRouter } from 'next/navigation'
import { BarChart2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useMonografi } from '@/hooks/useMonografi'
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
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function BarRow({ label, value, total, color = 'bg-sky-500', onClick }: {
  label: string; value: number; total: number; color?: string; onClick?: () => void
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div
      className={`flex items-center gap-2 text-sm ${onClick ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
    >
      <span className={`w-40 truncate text-slate-400 shrink-0 text-xs ${onClick ? 'group-hover:text-sky-400 transition-colors' : ''}`}>{label}</span>
      <div className="flex-1 bg-slate-800/60 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-16 text-right text-slate-500 text-xs ${onClick ? 'group-hover:text-sky-400 transition-colors' : ''}`}>{value} ({pct}%)</span>
    </div>
  )
}

function PiramidaUmur({ data }: { data: { kelompok: string; laki: number; perempuan: number }[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.laki, d.perempuan]), 1)
  return (
    <div className="bg-[#0d1424] rounded-xl p-4 border border-white/[0.06]">
      <h3 className="font-semibold text-slate-200 mb-4">Piramida Umur</h3>
      <div className="flex justify-center gap-6 mb-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-500 inline-block" />Laki-laki</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-400 inline-block" />Perempuan</span>
      </div>
      <div className="space-y-1">
        {[...data].reverse().map((row) => {
          const lakiPct = (row.laki / maxVal) * 100
          const perPct = (row.perempuan / maxVal) * 100
          return (
            <div key={row.kelompok} className="flex items-center gap-1 text-xs">
              <div className="flex-1 flex justify-end">
                <div className="bg-sky-500 h-5 rounded-l flex items-center justify-end pr-1 text-white text-[10px]"
                  style={{ width: `${lakiPct}%`, minWidth: row.laki > 0 ? '16px' : '0' }}>
                  {row.laki > 0 ? row.laki : ''}
                </div>
              </div>
              <div className="w-10 text-center text-slate-500 shrink-0">{row.kelompok}</div>
              <div className="flex-1 flex justify-start">
                <div className="bg-rose-400 h-5 rounded-r flex items-center justify-start pl-1 text-white text-[10px]"
                  style={{ width: `${perPct}%`, minWidth: row.perempuan > 0 ? '16px' : '0' }}>
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
            <span className="text-[10px] text-slate-500">{k.label}</span>
            <span className={`text-2xl font-bold ${k.color}`}>{byKlasifikasi[k.label] ?? 0}</span>
            <span className="text-[10px] text-slate-600">
              {k.min === 0 ? `0–${k.max} th` : k.max === 999 ? `${k.min}+ th` : `${k.min}–${k.max} th`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d1424] rounded-xl p-4 border border-white/[0.06]">
      <h3 className="font-semibold text-slate-200 mb-3">{title}</h3>
      {children}
    </div>
  )
}

export default function MonografiPage() {
  const { data, isLoading } = useMonografi()
  const router = useRouter()

  function goFilter(key: string, value: string) {
    router.push(`/penduduk?${key}=${encodeURIComponent(value)}&status=aktif`)
  }

  return (
    <AppShell title="Monografi">
      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        {/* Sub-header */}
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-sky-400" />
          <div>
            <h1 className="text-base font-bold text-slate-100">Monografi Desa</h1>
            <p className="text-xs text-slate-500">Statistik kependudukan · Klik item untuk lihat data penduduk</p>
          </div>
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

            <PiramidaUmur data={data.piramidaUmur} />

            <KlasifikasiUmur byKlasifikasi={data.byKlasifikasiUmur} />

            <Card title="Sebaran per RT">
              <div className="space-y-2">
                {(Object.entries(data.byRT) as [string, { laki: number; perempuan: number }][])
                  .sort((a, b) => Number(a[0]) - Number(b[0])).map(([rt, val]) => (
                  <div key={rt} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-slate-500 shrink-0">RT {rt}</span>
                    <span className="text-sky-400 w-20">L: {val.laki}</span>
                    <span className="text-rose-400 w-20">P: {val.perempuan}</span>
                    <span className="text-slate-400">Total: {val.laki + val.perempuan}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Agama">
                <p className="text-[10px] text-slate-600 mb-2">Klik untuk lihat penduduk</p>
                <div className="space-y-2">
                  {(Object.entries(data.byAgama) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([agama, n]) => (
                    <BarRow key={agama} label={agama} value={n} total={data.totalAktif} color="bg-emerald-500"
                      onClick={() => goFilter('agama', agama)} />
                  ))}
                </div>
              </Card>
              <Card title="Status Perkawinan">
                <p className="text-[10px] text-slate-600 mb-2">Klik untuk lihat penduduk</p>
                <div className="space-y-2">
                  {(Object.entries(data.byStatusPerkawinan) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([status, n]) => (
                    <BarRow key={status} label={status} value={n} total={data.totalAktif} color="bg-amber-500"
                      onClick={() => goFilter('statusPerkawinan', status)} />
                  ))}
                </div>
              </Card>
            </div>

            <Card title="Tingkat Pendidikan">
              <p className="text-[10px] text-slate-600 mb-2">Klik untuk lihat penduduk</p>
              <div className="space-y-2">
                {(Object.entries(data.byPendidikan) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([pend, n]) => (
                  <BarRow key={pend} label={pend} value={n} total={data.totalAktif} color="bg-sky-500"
                    onClick={() => goFilter('pendidikan', pend)} />
                ))}
              </div>
            </Card>

            <Card title="Pekerjaan">
              <p className="text-[10px] text-slate-600 mb-2">Klik untuk lihat penduduk</p>
              <div className="space-y-2">
                {(Object.entries(data.byPekerjaan) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([pek, n]) => (
                  <BarRow key={pek} label={pek} value={n} total={data.totalAktif} color="bg-rose-400"
                    onClick={() => goFilter('pekerjaan', pek)} />
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
