'use client'

import { MapPin } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

// Eyebrow + nama desa untuk kop Beranda (gaya prototype `.a-kop`). Wilayah dibaca dari store (config/wilayah).
export function WilayahBadge() {
  const { wilayah } = useAppStore()

  return (
    <>
      <div className="eyebrow">
        <MapPin className="i" style={{ fontSize: 14 }} />
        Kec. {wilayah.kecamatan}, Kab. {wilayah.kabupaten}
      </div>
      <h2>Desa {wilayah.desa}</h2>
    </>
  )
}
