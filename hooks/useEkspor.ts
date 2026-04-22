'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ── Koleksi yang bisa diekspor ───────────────────────────────────────────────

export type EksporKoleksi =
  | 'penduduk'
  | 'lahir'
  | 'meninggal'
  | 'mutasi_keluar'
  | 'mutasi_masuk'

/** Ambil seluruh dokumen dari satu koleksi, order by created_at jika ada */
async function fetchKoleksi(koleksi: EksporKoleksi): Promise<Record<string, unknown>[]> {
  try {
    const q = query(collection(db, koleksi), orderBy('created_at', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    // Jika field created_at tidak ada di semua dokumen, fallback tanpa orderBy
    const snap = await getDocs(collection(db, koleksi))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
}

export function useEksporData(koleksi: EksporKoleksi, enabled: boolean) {
  return useQuery({
    queryKey: ['ekspor', koleksi],
    queryFn: () => fetchKoleksi(koleksi),
    enabled,
    staleTime: 0,       // selalu fresh saat ekspor dipanggil
    gcTime: 30_000,
  })
}
