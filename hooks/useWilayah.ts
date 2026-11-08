'use client'

import { useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAppStore } from '@/store/appStore'
import type { ConfigWilayah } from '@/types'
import { normalisasiDusun, normalisasiRw, validasiDusun, validasiRw } from '@/lib/dusun'
import { simpanIdentitas } from '@/lib/wilayah'

// Path aktual Firestore: config (koleksi) → wilayah (dokumen)
export function useWilayah() {
  const { setWilayah, setDusun, setRw } = useAppStore()

  useEffect(() => {
    getDoc(doc(db, 'config', 'wilayah'))
      .then((snap) => {
        if (snap.exists()) {
          const w = snap.data() as ConfigWilayah
          setWilayah(w)
          simpanIdentitas(w) // cadangan di perangkat untuk layar sebelum masuk
        }
      })
      .catch(() => {})
    // Pemetaan RT → Dusun (Pengaturan → Dusun dan RT). Tanpa dokumen atau isinya tidak valid → tetap bawaan.
    getDoc(doc(db, 'config', 'dusun'))
      .then((snap) => {
        if (!snap.exists()) return
        const data = snap.data() as { dusun?: unknown; rw?: unknown }
        const d = normalisasiDusun(data.dusun)
        if (d && !validasiDusun(d).ada) setDusun(d)
        const r = normalisasiRw(data.rw)
        if (r && !validasiRw(r)) setRw(r)
      })
      .catch(() => {})
  }, [setWilayah, setDusun, setRw])
}
