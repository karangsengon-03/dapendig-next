'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

export interface UmurData {
  label: string
  jumlah: number
  color: string
}

interface UmurChartProps {
  data: UmurData[]
  loading?: boolean
}

// Kategori umur standar kependudukan Indonesia
export const KATEGORI_UMUR = [
  { label: 'Balita', min: 0, max: 4, color: '#34d399' },
  { label: 'Anak', min: 5, max: 14, color: '#60a5fa' },
  { label: 'Remaja', min: 15, max: 24, color: '#a78bfa' },
  { label: 'Dewasa', min: 25, max: 59, color: '#f59e0b' },
  { label: 'Lansia', min: 60, max: 999, color: '#f87171' },
]

export function UmurChart({ data, loading }: UmurChartProps) {
  const total = data.reduce((s, d) => s + d.jumlah, 0)

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-4 flex flex-col gap-3">
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
        Distribusi Umur
      </p>

      {loading ? (
        <div className="space-y-2 h-[160px] flex flex-col justify-center">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex items-center justify-center h-[160px] text-slate-600 text-sm">
          Belum ada data
        </div>
      ) : (
        <>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                barSize={14}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#e2e8f0',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => [
                    `${value} jiwa (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                    'Jumlah',
                  ]}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="jumlah" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend bawah */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
            {data.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] text-slate-500">{d.label}</span>
                <span className="text-[10px] font-semibold" style={{ color: d.color }}>{d.jumlah}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
