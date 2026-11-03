import { AppLogo } from '@/components/layout/AppLogo'

export default function Loading() {
  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center gap-4">
      <AppLogo size={80} className="shadow-pop ring-1 ring-gold-400/40" />
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="font-display text-base font-semibold text-ink">Data Penduduk Digital</p>
        <p className="text-xs text-ink-3">Desa Karang Sengon</p>
      </div>
      <div className="w-5 h-5 border-2 border-line-2 border-t-navy-600 rounded-full animate-spin mt-1" />
    </div>
  )
}
