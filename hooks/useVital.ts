'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rt3 } from '@/lib/rt-rw'
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { jalankanSuksesiKK, kembalikanSuksesiKK } from '@/lib/kk-succession'
import { GalatTolak } from '@/lib/galat-tolak'
import { KOLOM_PENDUDUK_DARI_LAHIR } from '@/lib/sinkron-catatan'
import { editCatatanDanPenduduk } from '@/lib/sinkron-catatan-tulis'
import type { Lahir, Meninggal, Penduduk } from '@/types'

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

/**
 * Catat kelahiran: catatan lahir + penduduk (ID dokumen = NIK) + log dalam SATU transaksi atomik, jadi semuanya
 * tersimpan atau tidak ada yang tersimpan (mengulang setelah gagal tidak menggandakan catatan).
 *  - NIK diperiksa SEBELUM menulis apa pun (dulu catatan ditulis lebih dulu, NIK kosong baru ditolak sesudahnya
 *    sehingga tertinggal catatan kelahiran tanpa penduduk).
 *  - Kelahiran selalu orang baru: NIK yang sudah ada di penduduk (status apa pun) ditolak, tidak ditimpa diam-diam
 *    (prinsip "tolak, jangan timpa" seperti addPenduduk dan Pindah Masuk).
 */
async function addLahir(
  data: Omit<Lahir, 'id' | 'created_at' | 'created_by'>,
  email: string
): Promise<string> {
  const nik = data.nik?.trim() ?? ''
  if (!nik) throw new GalatTolak('NIK bayi wajib diisi')

  // Ref dibuat sekali di luar transaksi: bila transaksi diulang otomatis, ID catatan tetap sama.
  const lahirRef = doc(collection(db, 'lahir'))
  const logRef = doc(collection(db, LOG_COL))
  // Otomatis tambah ke penduduk — gunakan NIK sebagai document ID
  const pendudukRef = doc(db, 'penduduk', nik)

  await runTransaction(db, async (tx) => {
    const ada = await tx.get(pendudukRef)
    if (ada.exists()) {
      const lama = ada.data() as { nama_lengkap?: string; status?: string } | undefined
      throw new GalatTolak(
        `NIK ${nik} sudah terdaftar atas nama ${lama?.nama_lengkap ?? 'penduduk lain'} (${lama?.status ?? 'aktif'}). ` +
          'Data tidak disimpan untuk mencegah menimpa data yang sudah ada.',
      )
    }
    tx.set(lahirRef, {
      ...data,
      created_at: serverTimestamp(),
      created_by: email,
    })
    tx.set(pendudukRef, {
      nama_lengkap: data.nama_lengkap,
      nik,
      no_kk: data.no_kk,
      jenis_kelamin: data.jenis_kelamin,
      agama: data.agama,
      hubungan_keluarga: data.hubungan_keluarga ?? 'Anak',
      nama_ayah: data.nama_ayah,
      nama_ibu: data.nama_ibu,
      rt: rt3(data.rt),
      rw: rt3(data.rw),
      tempat_lahir: data.tempat_lahir,
      tanggal_lahir: data.tanggal_lahir,
      status_perkawinan: 'Belum Kawin',
      pendidikan: data.pendidikan || 'Tidak/Belum Sekolah',
      pekerjaan: data.pekerjaan || 'Tidak/Belum Bekerja',
      alamat: data.alamat ?? '',
      golongan_darah: '',
      status: 'aktif',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: email,
    })
    tx.set(logRef, {
      aksi: 'tambah',
      keterangan: `Kelahiran: ${data.nama_lengkap}`,
      nik_target: nik,
      oleh: email,
      ts: serverTimestamp(),
    })
  })
  return lahirRef.id
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
  allPenduduk: Penduduk[],
  email: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'meninggal'), {
    ...data,
    created_at: serverTimestamp(),
    created_by: email,
  })
  // Update status penduduk — NIK adalah document ID
  if (data.nik_target) {
    const pendudukRef = doc(db, 'penduduk', data.nik_target)
    const pendudukSnap = await getDoc(pendudukRef)
    if (pendudukSnap.exists()) {
      await updateDoc(pendudukRef, { status: 'meninggal', updated_at: serverTimestamp() })
      // FIX: dulu jalur ini (menu Vital) tidak pernah menjalankan suksesi KK
      // sama sekali — beda dengan jalur CatatMeninggalModal. Sekarang
      // keduanya memakai algoritma yang sama persis dari lib/kk-succession.
      await jalankanSuksesiKK(db, {
        pendudukId: pendudukSnap.id,
        hubunganKeluarga: data.hub_asli,
        noKk: data.no_kk,
        allPenduduk,
      })
    }
  }
  await writeLog('tambah', `Kematian: ${data.nama}`, email, data.nik_target)
  return ref.id
}

export const PESAN_HAPUS_MASIH_MENINGGAL = 'Penduduk masih berstatus meninggal. Gunakan Batalkan untuk mengembalikan penduduk.'

async function deleteMeninggal(id: string, nama: string, email: string, nikTarget?: string): Promise<void> {
  // Hapus HANYA menghapus catatan: status penduduk dan suksesi KK tidak dibalik (itu tugas Batalkan).
  // Catatan yang penduduknya masih 'meninggal' tidak boleh dihapus; hanya catatan yatim yang boleh.
  if (nikTarget) {
    const snap = await getDoc(doc(db, 'penduduk', nikTarget))
    if (snap.exists() && snap.data()?.status === 'meninggal') throw new GalatTolak(PESAN_HAPUS_MASIH_MENINGGAL)
  }
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
  // NIK adalah document ID — langsung getDoc
  const pendudukRef = doc(db, 'penduduk', nik_target)
  const pendudukSnap = await getDoc(pendudukRef)
  if (pendudukSnap.exists()) {
    const updateData: Record<string, unknown> = { status: 'aktif', updated_at: serverTimestamp() }
    if (hub_asli) updateData.hubungan_keluarga = hub_asli
    await updateDoc(pendudukRef, updateData)
  }
  // KK Restoration: jika hub_asli adalah Kepala Keluarga, kembalikan siapa pun
  // yang sempat naik jadi Kepala Keluarga sementara — sekarang bekerja untuk
  // kematian dari jalur manapun (CatatMeninggalModal maupun menu Vital),
  // karena keduanya menulis hub_asli_backup lewat modul terpusat yang sama.
  if (hub_asli === 'Kepala Keluarga' && no_kk) {
    await kembalikanSuksesiKK(db, { noKk: no_kk, nikYangDikembalikan: nik_target })
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
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}

export function useAddMeninggal() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({ data, allPenduduk }: {
      data: Omit<Meninggal, 'id' | 'created_at' | 'created_by'>
      allPenduduk: Penduduk[]
    }) => addMeninggal(data, allPenduduk, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vital'], exact: false })
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
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
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}

export function useDeleteMeninggal() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({ id, nama, nik_target }: { id: string; nama: string; nik_target?: string }) =>
      deleteMeninggal(id, nama, user?.email ?? 'unknown', nik_target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vital'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
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
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}

export function useEditLahir() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    // Catatan + penduduk (hanya kolom yang berubah) + log dalam satu transaksi: lihat lib/sinkron-catatan.ts
    mutationFn: ({ id, data }: { id: string; data: Partial<Lahir> }) =>
      editCatatanDanPenduduk({
        koleksi: 'lahir', id, data: data as Record<string, unknown>, kolom: KOLOM_PENDUDUK_DARI_LAHIR,
        label: 'kelahiran', nama: data.nama_lengkap ?? '', email: user?.email ?? 'unknown',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vital'], exact: false })
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
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
