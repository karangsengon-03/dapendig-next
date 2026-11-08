import { cn } from '@/lib/utils'

interface AppLogoProps {
  className?: string
  size?: number
}

/** Logo balai desa (ikon aplikasi), memakai kelas `.lgi` prototype. */
export function AppLogo({ className, size = 32 }: AppLogoProps) {
  return (
    <div
      role="img"
      aria-label="DaPenDig"
      className={cn('lgi shrink-0', className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
    />
  )
}
