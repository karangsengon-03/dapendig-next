import { Loader2 } from 'lucide-react'

interface MigrasiProgressProps {
  current: number
  total: number
  label?: string
}

export function MigrasiProgress({ current, total, label = 'dokumen diproses' }: MigrasiProgressProps) {
  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <Loader2 size={16} className="text-sky-400 animate-spin shrink-0" />
        <p className="text-sm text-slate-300">
          <span className="font-bold text-sky-400 tabular-nums">{current.toLocaleString('id-ID')}</span>
          <span className="text-slate-500"> / </span>
          <span className="font-medium text-slate-300 tabular-nums">{total.toLocaleString('id-ID')}</span>
          <span className="text-slate-500 ml-1.5">{label}</span>
        </p>
        <span className="ml-auto text-xs font-semibold text-slate-400 tabular-nums">{pct}%</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-sky-500 h-1.5 rounded-full transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
