'use client'

import { useQuery } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { LogEntry } from '@/types'

const LOG_COL = 'log'

// Fetch semua log dengan filter aksi dan rentang tanggal (client-side filter)
async function fetchAllLog(): Promise<LogEntry[]> {
  const snap = await getDocs(
    query(collection(db, LOG_COL), orderBy('ts', 'desc'), limit(500))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogEntry))
}

export function useLogList() {
  return useQuery({
    queryKey: ['log', 'list'],
    queryFn: fetchAllLog,
    staleTime: 30_000,
  })
}

export const KOLEKSI_FILTER_OPTIONS = [
  { value: '', label: 'Semua koleksi' },
  { value: 'penduduk', label: 'Penduduk' },
  { value: 'lahir', label: 'Kelahiran' },
  { value: 'meninggal', label: 'Kematian' },
  { value: 'mutasi_keluar', label: 'Mutasi keluar' },
  { value: 'mutasi_masuk', label: 'Mutasi masuk' },
] as const

// ── Riwayat log per NIK (untuk halaman detail penduduk) ───────────────────────
async function fetchLogByNik(nik: string): Promise<LogEntry[]> {
  if (!nik) return []
  const snap = await getDocs(
    query(
      collection(db, LOG_COL),
      where('nik_target', '==', nik),
      orderBy('ts', 'desc'),
      limit(100)
    )
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogEntry))
}

export function useLogByNik(nik: string) {
  return useQuery({
    queryKey: ['log', 'nik', nik],
    queryFn: () => fetchLogByNik(nik),
    enabled: !!nik,
    staleTime: 30_000,
  })
}
