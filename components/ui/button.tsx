import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Tampilan = kelas `.a-btn` prototype (app/globals.css). Nama varian dan ukuran lama dipertahankan;
// gold, danger, success, dan ukuran xs ditambahkan dari prototype.
const buttonVariants = cva('a-btn', {
  variants: {
    variant: {
      default: 'pri',
      destructive: 'dsf hover:bg-bad hover:text-white',
      outline: 'sec',
      secondary: 'sof',
      ghost: 'gho',
      link: 'lnk',
      gold: 'gold',
      danger: 'dan',
      success: 'suc',
    },
    size: {
      default: '',
      xs: 'xs',
      sm: 'sm',
      lg: 'lg',
      icon: 'ic',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
