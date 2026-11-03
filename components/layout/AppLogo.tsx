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

export function AppLogoFull({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-[11px]', className)}>
      <AppLogo size={40} />
      <div className="leading-tight">
        <b className="block font-display text-[16.5px] font-bold tracking-tight text-ink">DaPenDig</b>
        <span className="block text-xs text-gold-600">Desa Karang Sengon</span>
      </div>
    </div>
  )
}
