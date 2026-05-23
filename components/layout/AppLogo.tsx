import Image from 'next/image'
import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/lib/utils'

interface AppLogoProps {
  className?: string
  size?: number
}

export function AppLogo({ className, size = 32 }: AppLogoProps) {
  return (
    <Image
      src="/icons/icon-192.png"
      alt="DaPenDig"
      width={size}
      height={size}
      className={cn('object-cover', className)}
      style={{ width: size, height: size }}
      unoptimized
    />
  )
}

export function AppLogoFull({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-white/10">
        <Image src="/icons/icon-192.png" alt="DaPenDig" width={36} height={36} className="w-full h-full object-cover" unoptimized />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold text-slate-100 tracking-tight">Data Penduduk Digital</span>
        <span className="text-xs text-slate-500 mt-0.5">Desa Karang Sengon</span>
      </div>
    </div>
  )
}
