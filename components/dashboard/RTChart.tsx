'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

interface RTData {
  rt: string
  jumlah: number
}

interface RTChartProps {
  data: RTData[]
  loading?: boolean
}

export function RTChart({ data, loading }: RTChartProps) {

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-4 flex flex-col gap-3">
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
        Penduduk per RT
      </p>

      {loading ? (
        <div className="h-[200px] flex flex-col justify-end gap-2 px-4">
          {[60, 90, 75, 100, 55, 80].map((h, i) => (
            <Skeleton key={i} className="rounded-md" style={{ height: `${h}%` }} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-slate-600 text-sm">
          Belum ada data
        </div>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="rt"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: number) => [`${value} jiwa`, 'Jumlah']}
              />
              <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={index} fill="#1e6fa8" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
