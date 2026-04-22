import { cn } from '@/lib/utils'

interface AppLogoProps {
  className?: string
  size?: number
}

export function AppLogo({ className, size = 32 }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DaPenDig Next Logo"
    >
      {/* Rumah / atap desa */}
      <path
        d="M16 4L28 13V13H4V13L16 4Z"
        fill="#0ea5e9"
        fillOpacity="0.9"
      />
      {/* Badan rumah */}
      <rect x="6" y="13" width="20" height="13" rx="1" fill="#0ea5e9" fillOpacity="0.25" />
      {/* Pintu */}
      <rect x="13" y="19" width="6" height="7" rx="1" fill="#0ea5e9" fillOpacity="0.7" />
      {/* Orang kiri */}
      <circle cx="9" cy="22" r="2" fill="#38bdf8" fillOpacity="0.8" />
      {/* Orang kanan */}
      <circle cx="23" cy="22" r="2" fill="#38bdf8" fillOpacity="0.8" />
      {/* Titik data / koneksi digital */}
      <circle cx="16" cy="10" r="1.5" fill="#fff" fillOpacity="0.9" />
      <circle cx="9" cy="10" r="1" fill="#0ea5e9" fillOpacity="0.6" />
      <circle cx="23" cy="10" r="1" fill="#0ea5e9" fillOpacity="0.6" />
    </svg>
  )
}

export function AppLogoFull({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
        <AppLogo size={22} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-bold text-slate-100 tracking-tight">DaPenDig Next</span>
        <span className="text-[10px] text-slate-500 mt-0.5">Data Penduduk Digital</span>
      </div>
    </div>
  )
}
