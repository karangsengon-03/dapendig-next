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
  where,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { MutasiKeluar, MutasiMasuk } from '@/types'

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

// ── Mutasi Keluar (koleksi: mutasi_keluar) ───────────────────────────────────

async function fetchMutasiKeluar(): Promise<MutasiKeluar[]> {
  const snap = await getDocs(
    query(collection(db, 'mutasi_keluar'), orderBy('tanggal', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MutasiKeluar))
}

async function addMutasiKeluar(
  data: Omit<MutasiKeluar, 'id' | 'created_at' | 'created_by'>,
  email: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'mutasi_keluar'), {
    ...data,
    created_at: serverTimestamp(),
    created_by: email,
  })
  // Update status penduduk jika nik_target ada
  if (data.nik_target) {
    const snap = await getDocs(query(collection(db, 'penduduk'), where('nik', '==', data.nik_target)))
    if (!snap.empty) {
      await updateDoc(doc(db, 'penduduk', snap.docs[0].id), { status: 'mutasi-keluar', updated_at: serverTimestamp() })
    }
  }
  await writeLog('tambah', `Pindah keluar: ${data.nama}`, email, data.nik_target)
  return ref.id
}

async function deleteMutasiKeluar(id: string, nama: string, email: string): Promise<void> {
  await deleteDoc(doc(db, 'mutasi_keluar', id))
  await writeLog('hapus', `Hapus pindah keluar: ${nama}`, email)
}

async function rollbackMutasiKeluar(mutasiId: string, nik_target: string, nama: string, email: string): Promise<void> {
  const snap = await getDocs(query(collection(db, 'penduduk'), where('nik', '==', nik_target)))
  if (!snap.empty) {
    await updateDoc(doc(db, 'penduduk', snap.docs[0].id), { status: 'aktif', updated_at: serverTimestamp() })
  }
  await deleteDoc(doc(db, 'mutasi_keluar', mutasiId))
  await writeLog('rollback', `Batalkan mutasi keluar: ${nama}`, email, nik_target)
}

// ── Mutasi Masuk (koleksi: mutasi_masuk) ────────────────────────────────────

async function fetchMutasiMasuk(): Promise<MutasiMasuk[]> {
  const snap = await getDocs(
    query(collection(db, 'mutasi_masuk'), orderBy('tanggal', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MutasiMasuk))
}

async function addMutasiMasuk(
  data: Omit<MutasiMasuk, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
  email: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'mutasi_masuk'), {
    ...data,
    created_at: serverTimestamp(),
    created_by: email,
  })
  // Otomatis tambah ke penduduk
  await addDoc(collection(db, 'penduduk'), {
    nama_lengkap: data.nama_lengkap,
    nik: data.nik,
    no_kk: data.no_kk,
    jenis_kelamin: data.jenis_kelamin,
    agama: data.agama,
    hubungan_keluarga: data.hubungan_keluarga,
    nama_ayah: data.nama_ayah,
    nama_ibu: data.nama_ibu,
    pendidikan: data.pendidikan,
    pekerjaan: data.pekerjaan,
    rt: data.rt,
    rw: data.rw,
    status_perkawinan: data.status_perkawinan,
    tanggal_lahir: data.tanggal_lahir,
    tempat_lahir: data.tempat_lahir,
    golongan_darah: data.golongan_darah ?? '',
    status: 'aktif',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    created_by: email,
  })
  await writeLog('tambah', `Pindah masuk: ${data.nama_lengkap}`, email, data.nik)
  return ref.id
}

async function deleteMutasiMasuk(id: string, nama: string, email: string): Promise<void> {
  await deleteDoc(doc(db, 'mutasi_masuk', id))
  await writeLog('hapus', `Hapus pindah masuk: ${nama}`, email)
}

// ── Exported Hooks ───────────────────────────────────────────────────────────

export function useMutasiKeluar() {
  return useQuery({
    queryKey: ['mutasi', 'keluar'],
    queryFn: fetchMutasiKeluar,
    staleTime: 60_000,
  })
}

export function useMutasiMasuk() {
  return useQuery({
    queryKey: ['mutasi', 'masuk'],
    queryFn: fetchMutasiMasuk,
    staleTime: 60_000,
  })
}

export function useAddMutasiKeluar() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: (data: Omit<MutasiKeluar, 'id' | 'created_at' | 'created_by'>) =>
      addMutasiKeluar(data, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mutasi'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useAddMutasiMasuk() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: (data: Omit<MutasiMasuk, 'id' | 'created_at' | 'updated_at' | 'created_by'>) =>
      addMutasiMasuk(data, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mutasi'], exact: false })
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useDeleteMutasiKeluar() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({ id, nama }: { id: string; nama: string }) =>
      deleteMutasiKeluar(id, nama, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mutasi'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useRollbackMutasiKeluar() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({ mutasiId, nik_target, nama }: { mutasiId: string; nik_target: string; nama: string }) =>
      rollbackMutasiKeluar(mutasiId, nik_target, nama, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mutasi'], exact: false })
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useDeleteMutasiMasuk() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({ id, nama }: { id: string; nama: string }) =>
      deleteMutasiMasuk(id, nama, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mutasi'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useEditMutasiKeluar() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MutasiKeluar> }) => {
      await updateDoc(doc(db, 'mutasi_keluar', id), { ...data, updated_at: serverTimestamp() })
      await addDoc(collection(db, 'log'), {
        aksi: 'edit', keterangan: `Edit mutasi keluar: ${data.nama ?? ''}`,
        nik_target: data.nik_target ?? '', oleh: user?.email ?? 'unknown', ts: serverTimestamp(),
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mutasi'], exact: false }) },
  })
}

export function useEditMutasiMasuk() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MutasiMasuk> }) => {
      await updateDoc(doc(db, 'mutasi_masuk', id), { ...data, updated_at: serverTimestamp() })
      await addDoc(collection(db, 'log'), {
        aksi: 'edit', keterangan: `Edit mutasi masuk: ${data.nama_lengkap ?? ''}`,
        nik_target: data.nik ?? '', oleh: user?.email ?? 'unknown', ts: serverTimestamp(),
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mutasi'], exact: false }) },
  })
}
