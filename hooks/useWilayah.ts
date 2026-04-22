'use client'

import { useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAppStore } from '@/store/appStore'
import type { ConfigWilayah } from '@/types'

// Path aktual Firestore: config (koleksi) → wilayah (dokumen)
export function useWilayah() {
  const { setWilayah } = useAppStore()

  useEffect(() => {
    getDoc(doc(db, 'config', 'wilayah'))
      .then((snap) => {
        if (snap.exists()) {
          setWilayah(snap.data() as ConfigWilayah)
        }
      })
      .catch(() => {})
  }, [setWilayah])
}
