'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { bacaDraf, bukaDraf, tulisDraf } from '@/lib/draf-form'

/**
 * Seperti useState, tetapi nilainya dipulihkan dari draf (lib/draf-form.ts) bila form ini pernah ditinggalkan tanpa disimpan.
 * `tab` = "<halaman>.<tab>" (mis. "mutasi.masuk"), `bagian` = nama state di form (mis. "form", "daftar").
 */
export function useDrafState<T>(tab: string, bagian: string, awal: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const kunci = `${tab}.${bagian}`
  const [nilai, setNilai] = useState<T>(() => {
    const d = bacaDraf<T>(kunci)
    if (d !== undefined) return d
    return typeof awal === 'function' ? (awal as () => T)() : awal
  })
  useEffect(() => { bukaDraf(tab) }, [tab])
  useEffect(() => { tulisDraf(kunci, nilai) }, [kunci, nilai])
  return [nilai, setNilai]
}
