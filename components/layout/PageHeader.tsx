import { type LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  action?: React.ReactNode
}

// Sub-header konsisten: icon + nama menu saja, tanpa deskripsi
export function PageHeader({ icon: Icon, title, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <div className="flex items-center gap-2.5">
        <Icon size={18} className="text-sky-400 shrink-0" />
        <h1 className="text-base font-semibold text-slate-100">{title}</h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
