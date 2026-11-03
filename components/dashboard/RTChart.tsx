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
    <div className="a-card p flex flex-col gap-3">
      <p className="text-xs text-ink-3 font-semibold uppercase tracking-wider">
        Penduduk per RT
      </p>

      {loading ? (
        <div className="h-[200px] flex flex-col justify-end gap-2 px-4">
          {[60, 90, 75, 100, 55, 80].map((h, i) => (
            <Skeleton key={i} className="rounded-md" style={{ height: `${h}%` }} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-ink-4 text-sm">
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
                stroke="var(--line)"
                vertical={false}
              />
              <XAxis
                dataKey="rt"
                tick={{ fill: 'var(--ink-3)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--ink-3)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'var(--navy-50)' }}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: 'var(--ink)',
                }}
                labelStyle={{ color: 'var(--ink-3)' }}
                itemStyle={{ color: 'var(--ink)' }}
                formatter={(value) => [`${typeof value === 'number' ? value : 0} jiwa`, 'Jumlah']}
              />
              <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={index} fill="var(--navy-600)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
