import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  /** Deskripsi singkat di bawah judul (gaya prototype). */
  description?: string
  /** Tidak dipakai lagi (prototype tanpa ikon di judul); dipertahankan agar pemanggil lama tidak patah. */
  icon?: LucideIcon
  /** Tombol aksi di kanan judul */
  action?: React.ReactNode
  className?: string
}

// Header halaman gaya prototype (`.a-ph`): judul display + deskripsi + tombol aksi.
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('a-ph', className)}>
      <div className="min-w-0">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="acts">{action}</div>}
    </div>
  )
}
