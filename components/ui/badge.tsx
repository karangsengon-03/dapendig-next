import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Tampilan = `.a-badge` prototype. Nama varian lama dipertahankan.
const badgeVariants = cva('a-badge', {
  variants: {
    variant: {
      default: 'info',
      success: 'ok',
      warning: 'warn',
      danger: 'bad',
      secondary: 'mute',
      purple: 'pur',
      gold: 'gold',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
