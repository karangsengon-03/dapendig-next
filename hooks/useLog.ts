'use client'

import { useQuery } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { LogEntry } from '@/types'

const LOG_COL = 'log'
export const LOG_PAGE_SIZE = 50

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

// Daftar aksi unik untuk dropdown filter
export const AKSI_FILTER_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'tambah', label: 'Tambah' },
  { value: 'edit', label: 'Edit' },
  { value: 'hapus', label: 'Hapus' },
  { value: 'Catat', label: 'Catat' },
  { value: 'Pindah', label: 'Pindah' },
  { value: 'Meninggal', label: 'Meninggal' },
] as const

export const KOLEKSI_FILTER_OPTIONS = [
  { value: '', label: 'Semua Koleksi' },
  { value: 'penduduk', label: 'Penduduk' },
  { value: 'lahir', label: 'Kelahiran' },
  { value: 'meninggal', label: 'Kematian' },
  { value: 'mutasi_keluar', label: 'Mutasi Keluar' },
  { value: 'mutasi_masuk', label: 'Mutasi Masuk' },
] as const
