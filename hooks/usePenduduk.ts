'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { Penduduk, PendudukFormData } from '@/types'

const COL = 'penduduk'
const LOG_COL = 'log'

const RB_COL = 'recycle_bin'

// ── Helpers ─────────────────────────────────────────────────────────────────

async function writeLog(
  aksi: string,
  keterangan: string,
  email: string,
  nikTarget?: string
) {
  await addDoc(collection(db, LOG_COL), {
    aksi,
    keterangan,
    nik_target: nikTarget ?? '',
    oleh: email,
    ts: serverTimestamp(),
  })
}

// ── Fetch list (aktif + tidak aktif) ────────────────────────────────────────

async function fetchAllPenduduk(): Promise<Penduduk[]> {
  const snap = await getDocs(
    query(collection(db, COL), orderBy('nama_lengkap', 'asc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penduduk))
}

// ── Fetch single ─────────────────────────────────────────────────────────────

async function fetchPendudukById(id: string): Promise<Penduduk | null> {
  // Coba langsung by document ID (NIK = doc ID setelah migrasi)
  const snap = await getDoc(doc(db, COL, id))
  if (snap.exists()) return { id: snap.id, ...snap.data() } as Penduduk
  // Fallback: cari by field nik (untuk dokumen yang belum termigrasi)
  const q = await getDocs(query(collection(db, COL), where('nik', '==', id)))
  if (!q.empty) return { id: q.docs[0].id, ...q.docs[0].data() } as Penduduk
  return null
}

// ── Add ───────────────────────────────────────────────────────────────────────

async function addPenduduk(
  data: PendudukFormData,
  email: string
): Promise<string> {
  const nik = data.nik?.trim()
  if (!nik) throw new Error('NIK wajib diisi untuk menyimpan data penduduk')
  await setDoc(doc(db, COL, nik), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  await writeLog('tambah', `Tambah penduduk: ${data.nama_lengkap}`, email, nik)
  return nik
}

// ── Update ───────────────────────────────────────────────────────────────────

async function updatePenduduk(
  id: string,
  data: PendudukFormData,
  email: string
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updated_at: serverTimestamp(),
  })
  await writeLog('edit', `Edit penduduk: ${data.nama_lengkap}`, email)
}

// ── Delete → Recycle Bin ─────────────────────────────────────────────────────

async function deletePendudukToRecycleBin(
  id: string,
  nama: string,
  email: string
): Promise<void> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) throw new Error('Penduduk tidak ditemukan')
  const dataAsli = { id: snap.id, ...snap.data() } as Penduduk
  await addDoc(collection(db, RB_COL), {
    data_asli: dataAsli,
    dihapus_oleh: email,
    dihapus_at: serverTimestamp(),
  })
  await deleteDoc(doc(db, COL, id))
  await writeLog('hapus', `Hapus (ke recycle bin): ${nama}`, email)
}

// ── Catat Pindah Keluar ───────────────────────────────────────────────────────

async function catatPindahKeluar(params: {
  pendudukId: string
  nik: string
  nama: string
  no_kk: string
  tujuan: string
  alasan: string
  tanggal: string
  email: string
}): Promise<void> {
  const { pendudukId, nik, nama, no_kk, tujuan, alasan, tanggal, email } = params
  await addDoc(collection(db, 'mutasi_keluar'), {
    nik_target: nik,
    nama,
    no_kk,
    tujuan,
    alasan,
    tanggal,
    created_at: serverTimestamp(),
    created_by: email,
  })
  await updateDoc(doc(db, COL, pendudukId), {
    status: 'mutasi-keluar',
    updated_at: serverTimestamp(),
  })
  await writeLog('mutasi_keluar', `${nama} pindah ke ${tujuan}`, email, nik)
}

// ── Catat Meninggal ──────────────────────────────────────────────────────────

async function catatMeninggal(params: {
  pendudukId: string
  nik: string
  nama: string
  no_kk: string
  hubungan_keluarga: string
  tanggal: string
  sebab: string
  email: string
  allPenduduk: Penduduk[]
}): Promise<void> {
  const { pendudukId, nik, nama, no_kk, hubungan_keluarga, tanggal, sebab, email, allPenduduk } = params
  await addDoc(collection(db, 'meninggal'), {
    nik_target: nik,
    nama,
    no_kk,
    hub_asli: hubungan_keluarga,
    sebab,
    tanggal,
    created_at: serverTimestamp(),
    created_by: email,
  })
  await updateDoc(doc(db, COL, pendudukId), {
    status: 'meninggal',
    updated_at: serverTimestamp(),
  })
  // KK Succession
  if (hubungan_keluarga === 'Kepala Keluarga' && no_kk) {
    const anggota = allPenduduk.filter((p) => p.no_kk === no_kk && p.id !== pendudukId && p.status === 'aktif')
    const urutan = ['Istri', 'Suami', 'Anak']
    let pengganti: Penduduk | null = null
    for (const hub of urutan) {
      if (hub === 'Anak') {
        const anakList = anggota.filter((p) => p.hubungan_keluarga === 'Anak')
        anakList.sort((a, b) => (a.tanggal_lahir ?? '').localeCompare(b.tanggal_lahir ?? ''))
        if (anakList.length > 0) { pengganti = anakList[0]; break }
      } else {
        const found = anggota.find((p) => p.hubungan_keluarga === hub)
        if (found) { pengganti = found; break }
      }
    }
    if (pengganti) {
      await updateDoc(doc(db, COL, pengganti.id), {
        hubungan_keluarga: 'Kepala Keluarga',
        hub_asli_backup: pengganti.hubungan_keluarga,
        updated_at: serverTimestamp(),
      })
    }
  }
  await writeLog('meninggal', `${nama} meninggal${sebab ? ` (${sebab})` : ''}`, email, nik)
}

// ── Check NIK exists ─────────────────────────────────────────────────────────

export async function checkNikExists(
  nik: string,
  excludeId?: string
): Promise<boolean> {
  if (!nik) return false
  if (excludeId && excludeId === nik) return false  // sedang edit dokumen ini sendiri
  const snap = await getDoc(doc(db, COL, nik))
  return snap.exists()
}

// ── Exported hooks ────────────────────────────────────────────────────────────

export function usePendudukList() {
  return useQuery({
    queryKey: ['penduduk', 'list'],
    queryFn: fetchAllPenduduk,
    staleTime: 60_000,
  })
}

export function usePendudukDetail(id: string) {
  return useQuery({
    queryKey: ['penduduk', 'detail', id],
    queryFn: () => fetchPendudukById(id),
    enabled: !!id,
  })
}

export function useAddPenduduk() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: (data: PendudukFormData) =>
      addPenduduk(data, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}

export function useUpdatePenduduk(id: string) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: (data: PendudukFormData) =>
      updatePenduduk(id, data, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}

export function useDeletePenduduk() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: ({ id, nama }: { id: string; nama: string }) =>
      deletePendudukToRecycleBin(id, nama, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['recycle-bin'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}

export function useCatatPindahKeluar() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: (params: Omit<Parameters<typeof catatPindahKeluar>[0], 'email'>) =>
      catatPindahKeluar({ ...params, email: user?.email ?? 'unknown' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['mutasi'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}

export function useCatatMeninggal() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: (params: Omit<Parameters<typeof catatMeninggal>[0], 'email'>) =>
      catatMeninggal({ ...params, email: user?.email ?? 'unknown' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['vital'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}

// Suppress unused import warning
