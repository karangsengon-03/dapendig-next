'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { daftarRt, dusunDariRt, gabungPilihan, type DusunItem } from '@/lib/dusun'

/**
 * Pemetaan RT → Dusun yang sedang berlaku (dimuat dari config/dusun oleh useWilayah di AppShell; bawaan = DUSUN_BAWAAN).
 * Sengaja tanpa Firebase supaya komponen (form, filter, detail) bisa memakainya tanpa menarik Firestore ke tes.
 */
export function useDusunAktif() {
  const dusun = useAppStore((s) => s.dusun)
  const rw = useAppStore((s) => s.rw)
  const rtPakai = useAppStore((s) => s.rtPakai)
  const rwPakai = useAppStore((s) => s.rwPakai)
  return useMemo(
    () => ({
      dusun,
      // Pilihan = yang terdaftar di Pengaturan + yang ADA di data penduduk (RT/RW yang belum didaftarkan tetap bisa dipilih/disaring)
      rtList: gabungPilihan(daftarRt(dusun), rtPakai),
      rwList: gabungPilihan(rw, rwPakai),
      rtPakai,
      rwPakai,
      dusunDariRt: (rt: string | number | null | undefined) => dusunDariRt(rt, dusun),
    }),
    [dusun, rw, rtPakai, rwPakai],
  )
}

export type { DusunItem }
