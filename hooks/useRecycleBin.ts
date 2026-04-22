'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { RecycleBinItem, Penduduk } from '@/types'

const RB_COL = 'recycle_bin'
const LOG_COL = 'log'

async function writeLog(aksi: string, keterangan: string, email: string, nikTarget?: string) {
  await addDoc(collection(db, LOG_COL), {
    aksi,
    keterangan,
    nik_target: nikTarget ?? '',
    oleh: email,
    ts: serverTimestamp(),
  })
}

async function fetchRecycleBin(): Promise<RecycleBinItem[]> {
  const snap = await getDocs(
    query(collection(db, RB_COL), orderBy('dihapus_at', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecycleBinItem))
}

export function useRecycleBinList() {
  return useQuery({
    queryKey: ['recycle-bin', 'list'],
    queryFn: fetchRecycleBin,
    staleTime: 30_000,
  })
}

export function useRestorePenduduk() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ recycleId, dataAsli }: { recycleId: string; dataAsli: Penduduk }) => {
      const email = user?.email ?? 'unknown'
      // Hilangkan field id lama, tambah created_at baru
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...rest } = dataAsli
      await addDoc(collection(db, 'penduduk'), {
        ...rest,
        status: 'aktif',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      await deleteDoc(doc(db, RB_COL, recycleId))
      await writeLog('restore', `Restore: ${dataAsli.nama_lengkap}`, email, dataAsli.nik)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recycle-bin'], exact: false })
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useHapusPermanent() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ recycleId, nama }: { recycleId: string; nama: string }) => {
      const email = user?.email ?? 'unknown'
      await deleteDoc(doc(db, RB_COL, recycleId))
      await writeLog('hapus_permanen', `Hapus permanen: ${nama}`, email)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recycle-bin'], exact: false })
    },
  })
}

export function useHapusSemuaRecycleBin() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async () => {
      const email = user?.email ?? 'unknown'
      const snap = await getDocs(collection(db, RB_COL))
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, RB_COL, d.id))))
      await writeLog('hapus_permanen', `Hapus semua recycle bin (${snap.size} data)`, email)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recycle-bin'], exact: false })
    },
  })
}
