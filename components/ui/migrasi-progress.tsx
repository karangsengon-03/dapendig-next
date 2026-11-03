import { Loader2 } from 'lucide-react'

interface MigrasiProgressProps {
  current: number
  total: number
  label?: string
}

export function MigrasiProgress({ current, total, label = 'dokumen diproses' }: MigrasiProgressProps) {
  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0
  return (
    <div className="flex flex-col gap-2.5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex items-center gap-2.5">
        <Loader2 size={16} className="text-navy-600 animate-spin shrink-0" />
        <p className="text-sm text-ink-2">
          <span className="font-bold text-navy-700 tabular-nums">{current.toLocaleString('id-ID')}</span>
          <span className="text-ink-4"> / </span>
          <span className="font-medium text-ink-2 tabular-nums">{total.toLocaleString('id-ID')}</span>
          <span className="text-ink-3 ml-1.5">{label}</span>
        </p>
        <span className="ml-auto text-xs font-semibold text-ink-3 tabular-nums">{pct}%</span>
      </div>
      <div className="a-prog">
        <i style={{ width: `${pct}%`, transition: 'width .2s' }} />
      </div>
    </div>
  )
}
