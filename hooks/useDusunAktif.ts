'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { daftarRt, dusunDariRt, type DusunItem } from '@/lib/dusun'

/**
 * Pemetaan RT → Dusun yang sedang berlaku (dimuat dari config/dusun oleh useWilayah di AppShell; bawaan = DUSUN_BAWAAN).
 * Sengaja tanpa Firebase supaya komponen (form, filter, detail) bisa memakainya tanpa menarik Firestore ke tes.
 */
export function useDusunAktif() {
  const dusun = useAppStore((s) => s.dusun)
  const rwList = useAppStore((s) => s.rw)
  return useMemo(
    () => ({
      dusun,
      rtList: daftarRt(dusun),
      rwList,
      dusunDariRt: (rt: string | number | null | undefined) => dusunDariRt(rt, dusun),
    }),
    [dusun, rwList],
  )
}

export type { DusunItem }
