'use client'

import { Skeleton } from '@/components/ui/skeleton'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string | undefined
  loading?: boolean
  icon: LucideIcon
  color: 'sky' | 'violet' | 'emerald' | 'rose' | 'amber' | 'slate'
  suffix?: string
  subLabel?: string
}

const colorMap = {
  sky: {
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    icon: 'text-sky-400',
  },
  violet: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    icon: 'text-violet-400',
  },
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400',
  },
  rose: {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    icon: 'text-rose-400',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-400',
  },
  slate: {
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    icon: 'text-slate-400',
  },
}

export function StatCard({
  label,
  value,
  loading,
  icon: Icon,
  color,
  suffix,
  subLabel,
}: StatCardProps) {
  const c = colorMap[color]

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider leading-tight">
          {label}
        </p>
        <div className={`w-8 h-8 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
          <Icon size={15} className={c.icon} />
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-8 w-16 rounded-lg" />
      ) : (
        <p className={`text-2xl font-bold ${c.text} tabular-nums`}>
          {value ?? '—'}
          {suffix && (
            <span className="text-sm font-medium text-slate-500 ml-1">{suffix}</span>
          )}
        </p>
      )}

      {subLabel && (
        <p className="text-xs text-slate-600">{subLabel}</p>
      )}
    </div>
  )
}
