'use client'

import { MapPin } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export function WilayahBadge() {
  const { wilayah } = useAppStore()

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
      <MapPin size={12} className="text-sky-400 flex-shrink-0" />
      <p className="text-xs text-slate-400">
        Desa{' '}
        <span className="text-slate-200 font-medium">{wilayah.desa}</span>
        {' · '}
        Kec. {wilayah.kecamatan}
        {' · '}
        {wilayah.kabupaten}
      </p>
    </div>
  )
}
