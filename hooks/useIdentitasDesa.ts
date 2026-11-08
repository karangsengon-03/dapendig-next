'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { useAppStore } from '@/store/appStore'
import { IDENTITAS_KOSONG, KUNCI_IDENTITAS, uraiIdentitas, type IdentitasDesa } from '@/lib/wilayah'

const langgan = (cb: () => void) => { window.addEventListener('storage', cb); return () => window.removeEventListener('storage', cb) }
const bacaMentah = () => { try { return window.localStorage.getItem(KUNCI_IDENTITAS) ?? '' } catch { return '' } }

/**
 * Nama desa untuk tampilan. Sesudah konfigurasi dimuat → dari Pengaturan (store); sebelum itu (Login, layar memuat,
 * beberapa saat pertama setelah masuk) → cadangan terakhir di perangkat; bila belum ada → kosong (tanpa nama desa, bukan nama bawaan).
 * Render di server selalu kosong, jadi tidak ada ketidakcocokan hidrasi.
 */
export function useIdentitasDesa(): IdentitasDesa {
  const wilayah = useAppStore((s) => s.wilayah)
  const mentah = useSyncExternalStore(langgan, bacaMentah, () => '')
  const cadangan = useMemo(() => uraiIdentitas(mentah), [mentah])
  if ((wilayah.desa ?? '').trim()) return { desa: wilayah.desa, kecamatan: wilayah.kecamatan ?? '', kabupaten: wilayah.kabupaten ?? '' }
  return cadangan ?? IDENTITAS_KOSONG
}
