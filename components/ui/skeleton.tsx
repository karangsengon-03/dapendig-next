import { cn } from '@/lib/utils'

// Kilau skeleton prototype (`.a-sk`); radius bawaan 8px, bisa ditimpa lewat className.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('a-sk', className)} aria-hidden="true" {...props} />
}

export { Skeleton }
