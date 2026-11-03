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
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { GalatTolak } from '@/lib/galat-tolak'
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

export const PESAN_NIK_SUDAH_ADA = 'NIK sudah terdaftar di data penduduk'
export const PESAN_ITEM_SUDAH_HILANG = 'Data sudah tidak ada di Tempat Sampah'


const STATUS_VALID: Penduduk['status'][] = ['aktif', 'tidak aktif', 'meninggal', 'mutasi-keluar']

/** Status yang dipertahankan saat memulihkan; kosong atau tidak dikenal → 'aktif'. */
export function statusUntukPulihkan(status: unknown): Penduduk['status'] {
  return STATUS_VALID.includes(status as Penduduk['status']) ? (status as Penduduk['status']) : 'aktif'
}

/**
 * Pulihkan = tulis ulang dokumen penduduk ber-ID = NIK (konvensi data), BUKAN dokumen baru ber-ID acak.
 *  - Ditolak (item tetap di Tempat Sampah) bila NIK sudah dipakai: dokumen ber-ID NIK ATAU dokumen lain
 *    yang field `nik`-nya sama (dokumen lama ber-ID acak).
 *  - Tulis penduduk dan hapus item Tempat Sampah dalam SATU transaksi: keduanya berhasil atau tidak sama sekali
 *    (tak ada penduduk ganda bila peran tidak boleh menghapus item Tempat Sampah; rules: hapus = admin).
 *  - Status asli dipertahankan; created_at asli dipertahankan supaya yang dipulihkan tidak terhitung
 *    "penduduk baru bulan ini".
 */
export function useRestorePenduduk() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ recycleId, dataAsli }: { recycleId: string; dataAsli: Penduduk }) => {
      const email = user?.email ?? 'unknown'
      // ID dokumen lama dibuang; dokumen baru memakai NIK sebagai ID
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...rest } = dataAsli
      const nik = String(dataAsli.nik ?? '').trim()
      if (!nik) throw new GalatTolak('NIK pada data yang dihapus kosong, tidak bisa dipulihkan')

      // Dokumen lama ber-ID acak yang field nik-nya sama (query tidak bisa dijalankan di dalam transaksi)
      const sama = await getDocs(query(collection(db, 'penduduk'), where('nik', '==', nik)))
      if (!sama.empty) throw new GalatTolak(PESAN_NIK_SUDAH_ADA)

      const pendudukRef = doc(db, 'penduduk', nik)
      const recycleRef = doc(db, RB_COL, recycleId)
      await runTransaction(db, async (tx) => {
        const adaPenduduk = await tx.get(pendudukRef)
        if (adaPenduduk.exists()) throw new GalatTolak(PESAN_NIK_SUDAH_ADA)
        const adaItem = await tx.get(recycleRef)
        if (!adaItem.exists()) throw new GalatTolak(PESAN_ITEM_SUDAH_HILANG)
        tx.set(pendudukRef, {
          ...rest,
          nik,
          status: statusUntukPulihkan(rest.status),
          created_at: rest.created_at ?? serverTimestamp(),
          updated_at: serverTimestamp(),
        })
        tx.delete(recycleRef)
      })
      await writeLog('restore', `Restore: ${dataAsli.nama_lengkap}`, email, nik)
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
      return snap.size   // jumlah yang benar-benar dihapus di server (untuk toast hasil)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recycle-bin'], exact: false })
    },
  })
}
