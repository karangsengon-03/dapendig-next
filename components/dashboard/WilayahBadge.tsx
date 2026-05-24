'use client'

import { MapPin } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export function WilayahBadge() {
  const { wilayah } = useAppStore()

  return (
    <div className="flex items-start justify-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit mx-auto">
      <MapPin size={14} className="text-sky-400 shrink-0 mt-0.5" />
      <div className="flex flex-col items-start leading-snug">
        <span className="text-sm font-medium text-slate-300">Desa {wilayah.desa}</span>
        <span className="text-sm text-slate-500">Kec. {wilayah.kecamatan}, Kab. {wilayah.kabupaten}</span>
      </div>
    </div>
  )
}
