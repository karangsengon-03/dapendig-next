'use client'

import { useEffect } from 'react'
import { usePendudukList } from '@/hooks/usePenduduk'
import { useAppStore } from '@/store/appStore'
import { hitungRtRwTerpakai } from '@/lib/dusun'

/**
 * Memasang RT/RW yang ADA di data penduduk aktif ke store (dipanggil sekali di AppShell). Hasilnya dipakai useDusunAktif
 * (pilihan RT/RW di form dan filter) dan Pengaturan → Dusun, RT, dan RW (kunci RT/RW yang dipakai penduduk).
 * Memakai cache daftar penduduk yang sama dengan halaman Penduduk, jadi tidak menambah pembacaan Firestore setelah daftar termuat.
 */
export function useWilayahTerpakai() {
  const { data } = usePendudukList()
  const setWilayahPakai = useAppStore((s) => s.setWilayahPakai)
  useEffect(() => {
    if (!data) return
    const { rt, rw } = hitungRtRwTerpakai(data.filter((p) => p.status === 'aktif'))
    setWilayahPakai(rt, rw)
  }, [data, setWilayahPakai])
}
