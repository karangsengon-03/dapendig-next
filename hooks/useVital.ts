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
import type { Lahir, Meninggal } from '@/types'

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

// ── Kelahiran (koleksi: lahir) ───────────────────────────────────────────────

async function fetchLahir(): Promise<Lahir[]> {
  const snap = await getDocs(
    query(collection(db, 'lahir'), orderBy('tanggal_lahir', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lahir))
}

async function addLahir(
  data: Omit<Lahir, 'id' | 'created_at' | 'created_by'>,
  email: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'lahir'), {
    ...data,
    created_at: serverTimestamp(),
    created_by: email,
  })
  // Otomatis tambah ke penduduk
  await addDoc(collection(db, 'penduduk'), {
    nama_lengkap: data.nama_lengkap,
    nik: data.nik ?? '',
    no_kk: data.no_kk,
    jenis_kelamin: data.jenis_kelamin,
    agama: data.agama,
    hubungan_keluarga: data.hubungan_keluarga ?? 'Anak',
    nama_ayah: data.nama_ayah,
    nama_ibu: data.nama_ibu,
    rt: data.rt,
    rw: data.rw,
    tempat_lahir: data.tempat_lahir,
    tanggal_lahir: data.tanggal_lahir,
    status_perkawinan: 'Belum Kawin',
    pendidikan: 'Tidak/Belum Sekolah',
    pekerjaan: 'Belum/Tidak Bekerja',
    golongan_darah: '',
    status: 'aktif',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    created_by: email,
  })
  await writeLog('tambah', `Kelahiran: ${data.nama_lengkap}`, email, data.nik)
  return ref.id
}

async function deleteLahir(id: string, nama: string, email: string): Promise<void> {
  await deleteDoc(doc(db, 'lahir', id))
  await writeLog('hapus', `Hapus data kelahiran: ${nama}`, email)
}

// ── Kematian (koleksi: meninggal) ────────────────────────────────────────────

async function fetchMeninggal(): Promise<Meninggal[]> {
  const snap = await getDocs(
    query(collection(db, 'meninggal'), orderBy('tanggal', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Meninggal))
}

async function addMeninggal(
  data: Omit<Meninggal, 'id' | 'created_at' | 'created_by'>,
  email: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'meninggal'), {
    ...data,
    created_at: serverTimestamp(),
    created_by: email,
  })
  // Update status penduduk jika nik_target ada
  if (data.nik_target) {
    const snap = await getDocs(query(collection(db, 'penduduk'), where('nik', '==', data.nik_target)))
    if (!snap.empty) {
      await updateDoc(doc(db, 'penduduk', snap.docs[0].id), { status: 'meninggal', updated_at: serverTimestamp() })
    }
  }
  await writeLog('tambah', `Kematian: ${data.nama}`, email, data.nik_target)
  return ref.id
}

async function deleteMeninggal(id: string, nama: string, email: string): Promise<void> {
  await deleteDoc(doc(db, 'meninggal', id))
  await writeLog('hapus', `Hapus data kematian: ${nama}`, email)
}

async function rollbackMeninggal(
  meninggalId: string,
  nik_target: string,
  nama: string,
  hub_asli: string,
  no_kk: string,
  email: string
): Promise<void> {
  const snap = await getDocs(query(collection(db, 'penduduk'), where('nik', '==', nik_target)))
  if (!snap.empty) {
    const updateData: Record<string, unknown> = { status: 'aktif', updated_at: serverTimestamp() }
    if (hub_asli) updateData.hubungan_keluarga = hub_asli
    await updateDoc(doc(db, 'penduduk', snap.docs[0].id), updateData)
  }
  // KK Restoration: jika hub_asli adalah Kepala Keluarga, cari pengganti sementara
  if (hub_asli === 'Kepala Keluarga' && no_kk) {
    const kkSnap = await getDocs(
      query(collection(db, 'penduduk'), where('no_kk', '==', no_kk), where('hubungan_keluarga', '==', 'Kepala Keluarga'))
    )
    for (const d of kkSnap.docs) {
      const pData = d.data()
      if (pData.hub_asli_backup && d.id !== (snap.empty ? '' : snap.docs[0].id)) {
        await updateDoc(doc(db, 'penduduk', d.id), {
          hubungan_keluarga: pData.hub_asli_backup,
          hub_asli_backup: null,
          updated_at: serverTimestamp(),
        })
        break
      }
    }
  }
  await deleteDoc(doc(db, 'meninggal', meninggalId))
  await writeLog('rollback', `Batalkan kematian: ${nama}`, email, nik_target)
}

// ── Exported Hooks ───────────────────────────────────────────────────────────

export function useLahir() {
  return useQuery({
    queryKey: ['vital', 'lahir'],
    queryFn: fetchLahir,
    staleTime: 60_000,
  })
}

export function useMeninggal() {
  return useQuery({
    queryKey: ['vital', 'meninggal'],
    queryFn: fetchMeninggal,
    staleTime: 60_000,
  })
}

export function useAddLahir() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: (data: Omit<Lahir, 'id' | 'created_at' | 'created_by'>) =>
      addLahir(data, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vital'], exact: false })
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useAddMeninggal() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: (data: Omit<Meninggal, 'id' | 'created_at' | 'created_by'>) =>
      addMeninggal(data, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vital'], exact: false })
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useDeleteLahir() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({ id, nama }: { id: string; nama: string }) =>
      deleteLahir(id, nama, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vital'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useDeleteMeninggal() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({ id, nama }: { id: string; nama: string }) =>
      deleteMeninggal(id, nama, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vital'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useRollbackMeninggal() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({ meninggalId, nik_target, nama, hub_asli, no_kk }: {
      meninggalId: string; nik_target: string; nama: string; hub_asli: string; no_kk: string
    }) => rollbackMeninggal(meninggalId, nik_target, nama, hub_asli, no_kk, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vital'], exact: false })
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useEditLahir() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lahir> }) => {
      await updateDoc(doc(db, 'lahir', id), { ...data, updated_at: serverTimestamp() })
      await addDoc(collection(db, 'log'), {
        aksi: 'edit', keterangan: `Edit kelahiran: ${data.nama_lengkap ?? ''}`,
        nik_target: data.nik ?? '', oleh: user?.email ?? 'unknown', ts: serverTimestamp(),
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vital'], exact: false }) },
  })
}

export function useEditMeninggal() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Meninggal> }) => {
      await updateDoc(doc(db, 'meninggal', id), { ...data, updated_at: serverTimestamp() })
      await addDoc(collection(db, 'log'), {
        aksi: 'edit', keterangan: `Edit kematian: ${data.nama ?? ''}`,
        nik_target: data.nik_target ?? '', oleh: user?.email ?? 'unknown', ts: serverTimestamp(),
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vital'], exact: false }) },
  })
}
