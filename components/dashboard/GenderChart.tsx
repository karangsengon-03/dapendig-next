'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

interface GenderChartProps {
  lakiLaki: number
  perempuan: number
  loading?: boolean
}

const COLORS = ['#0ea5e9', '#a78bfa']

export function GenderChart({ lakiLaki, perempuan, loading }: GenderChartProps) {
  const data = [
    { name: 'Laki-laki', value: lakiLaki },
    { name: 'Perempuan', value: perempuan },
  ]

  const total = lakiLaki + perempuan

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-4 flex flex-col gap-3">
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
        Jenis Kelamin
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-[160px]">
          <Skeleton className="w-32 h-32 rounded-full" />
        </div>
      ) : total === 0 ? (
        <div className="flex items-center justify-center h-[160px] text-slate-600 text-sm">
          Belum ada data
        </div>
      ) : (
        <>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#e2e8f0',
                  }}
                  formatter={(value: number) => [
                    `${value} jiwa (${((value / total) * 100).toFixed(1)}%)`,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex gap-4 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 flex-shrink-0" />
              <span className="text-xs text-slate-400">
                Laki-laki{' '}
                <span className="font-semibold text-sky-400">{lakiLaki}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 flex-shrink-0" />
              <span className="text-xs text-slate-400">
                Perempuan{' '}
                <span className="font-semibold text-violet-400">{perempuan}</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
