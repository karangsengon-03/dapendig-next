import { cn } from '@/lib/utils'

interface AppLogoProps {
  className?: string
  size?: number
}

// Semua logo di seluruh apps pakai icon balai desa baru
export function AppLogo({ className, size = 32 }: AppLogoProps) {
  return (
    <img
      src="/icons/icon-192.png"
      alt="DaPenDig"
      width={size}
      height={size}
      className={cn('object-cover', className)}
      style={{ width: size, height: size }}
    />
  )
}

export function AppLogoFull({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-white/10">
        <img src="/icons/icon-192.png" alt="DaPenDig" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-bold text-slate-100 tracking-tight">DaPenDig Next</span>
        <span className="text-[10px] text-slate-500 mt-0.5">Data Penduduk Digital</span>
      </div>
    </div>
  )
}
