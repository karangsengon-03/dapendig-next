'use client'

import { useMonografi } from '@/hooks/useMonografi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = 'sky',
}: {
  label: string
  value: number | string
  sub?: string
  color?: 'sky' | 'emerald' | 'rose' | 'amber'
}) {
  const ring = {
    sky: 'border-sky-500 text-sky-600 dark:text-sky-400',
    emerald: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
    rose: 'border-rose-500 text-rose-600 dark:text-rose-400',
    amber: 'border-amber-500 text-amber-600 dark:text-amber-400',
  }[color]

  return (
    <div
      className={`rounded-xl border-l-4 bg-white dark:bg-slate-800 shadow-sm p-4 ${ring}`}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${ring}`}>{value}</p>
      {sub && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>
      )}
    </div>
  )
}

function BarRow({
  label,
  value,
  total,
  color = 'bg-sky-500',
}: {
  label: string
  value: number
  total: number
  color?: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-40 truncate text-slate-600 dark:text-slate-300 shrink-0">
        {label}
      </span>
      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-14 text-right text-slate-500 dark:text-slate-400 text-xs">
        {value} ({pct}%)
      </span>
    </div>
  )
}

// ── Piramida ──────────────────────────────────────────────────────────────────

function PiramidaUmur({
  data,
}: {
  data: { kelompok: string; laki: number; perempuan: number }[]
}) {
  const maxVal = Math.max(...data.flatMap((d) => [d.laki, d.perempuan]), 1)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">
        Piramida Umur
      </h3>
      <div className="flex justify-center gap-4 mb-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-sky-500 inline-block" />
          Laki-laki
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-rose-400 inline-block" />
          Perempuan
        </span>
      </div>
      <div className="space-y-1">
        {[...data].reverse().map((row) => {
          const lakiPct = (row.laki / maxVal) * 100
          const perPct = (row.perempuan / maxVal) * 100
          return (
            <div key={row.kelompok} className="flex items-center gap-1 text-xs">
              {/* Laki bar (kiri, flip) */}
              <div className="flex-1 flex justify-end">
                <div
                  className="bg-sky-500 h-5 rounded-l flex items-center justify-end pr-1 text-white text-[10px]"
                  style={{ width: `${lakiPct}%`, minWidth: row.laki > 0 ? '16px' : '0' }}
                >
                  {row.laki > 0 ? row.laki : ''}
                </div>
              </div>
              {/* Label kelompok */}
              <div className="w-10 text-center text-slate-500 dark:text-slate-400 shrink-0">
                {row.kelompok}
              </div>
              {/* Perempuan bar (kanan) */}
              <div className="flex-1 flex justify-start">
                <div
                  className="bg-rose-400 h-5 rounded-r flex items-center justify-start pl-1 text-white text-[10px]"
                  style={{ width: `${perPct}%`, minWidth: row.perempuan > 0 ? '16px' : '0' }}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MonografiPage() {
  const { data, isLoading } = useMonografi()

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!data) return null

  const sortedPekerjaan = Object.entries(data.byPekerjaan)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const sortedPendidikan = Object.entries(data.byPendidikan).sort(
    (a, b) => b[1] - a[1]
  )

  const sortedAgama = Object.entries(data.byAgama).sort(
    (a, b) => b[1] - a[1]
  )

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
        Monografi Desa
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Penduduk Aktif"
          value={data.totalAktif}
          color="sky"
        />
        <StatCard
          label="Tidak Aktif"
          value={data.totalTidakAktif}
          color="amber"
        />
        <StatCard
          label="Laki-laki"
          value={data.laki}
          sub={`${Math.round((data.laki / Math.max(data.totalAktif, 1)) * 100)}%`}
          color="sky"
        />
        <StatCard
          label="Perempuan"
          value={data.perempuan}
          sub={`${Math.round((data.perempuan / Math.max(data.totalAktif, 1)) * 100)}%`}
          color="rose"
        />
      </div>

      {/* Piramida */}
      <PiramidaUmur data={data.piramidaUmur} />

      {/* Distribusi RT */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">
          Sebaran per RT
        </h3>
        <div className="space-y-2">
          {Object.entries(data.byRT)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([rt, val]) => (
              <div key={rt} className="flex items-center gap-3 text-sm">
                <span className="w-12 text-slate-500 dark:text-slate-400 shrink-0">
                  RT {rt}
                </span>
                <span className="text-sky-600 dark:text-sky-400 w-20 text-xs">
                  L: {val.laki}
                </span>
                <span className="text-rose-500 w-20 text-xs">
                  P: {val.perempuan}
                </span>
                <span className="text-slate-600 dark:text-slate-300 text-xs">
                  Total: {val.laki + val.perempuan}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Agama + Status Kawin */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Agama
          </h3>
          <div className="space-y-2">
            {sortedAgama.map(([agama, n]) => (
              <BarRow
                key={agama}
                label={agama}
                value={n}
                total={data.totalAktif}
                color="bg-emerald-500"
              />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Status Perkawinan
          </h3>
          <div className="space-y-2">
            {Object.entries(data.byStatusPerkawinan)
              .sort((a, b) => b[1] - a[1])
              .map(([status, n]) => (
                <BarRow
                  key={status}
                  label={status}
                  value={n}
                  total={data.totalAktif}
                  color="bg-amber-500"
                />
              ))}
          </div>
        </div>
      </div>

      {/* Pendidikan */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">
          Tingkat Pendidikan
        </h3>
        <div className="space-y-2">
          {sortedPendidikan.map(([pend, n]) => (
            <BarRow
              key={pend}
              label={pend}
              value={n}
              total={data.totalAktif}
              color="bg-sky-500"
            />
          ))}
        </div>
      </div>

      {/* Pekerjaan top 10 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Pekerjaan
        </h3>
        <p className="text-xs text-slate-400 mb-3">Top 10</p>
        <div className="space-y-2">
          {sortedPekerjaan.map(([pek, n]) => (
            <BarRow
              key={pek}
              label={pek}
              value={n}
              total={data.totalAktif}
              color="bg-rose-400"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
