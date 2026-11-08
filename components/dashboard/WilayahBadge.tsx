'use client'

import { MapPin } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { labelDesa, labelKecKab } from '@/lib/wilayah'

// Eyebrow + nama desa untuk kop Beranda (gaya prototype `.a-kop`). Wilayah dibaca dari store (config/wilayah).
export function WilayahBadge() {
  const { wilayah } = useAppStore()

  return (
    <>
      <div className="eyebrow">
        <MapPin className="i" style={{ fontSize: 14 }} />
        {labelKecKab(wilayah) || 'Wilayah belum diisi'}
      </div>
      <h2>{labelDesa(wilayah) || 'Nama desa belum diisi'}</h2>
    </>
  )
}
