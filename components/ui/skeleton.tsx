import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-[#0d1424]',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
