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
import { GalatTolak } from '@/lib/galat-tolak'
import { KOLOM_PENDUDUK_DARI_MASUK } from '@/lib/sinkron-catatan'
import { editCatatanDanPenduduk } from '@/lib/sinkron-catatan-tulis'
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
  // Update status penduduk — NIK adalah document ID
  if (data.nik_target) {
    const pendudukRef = doc(db, 'penduduk', data.nik_target)
    const pendudukSnap = await getDoc(pendudukRef)
    if (pendudukSnap.exists()) {
      await updateDoc(pendudukRef, { status: 'mutasi-keluar', updated_at: serverTimestamp() })
    }
  }
  await writeLog('tambah', `Pindah keluar: ${data.nama}`, email, data.nik_target)
  return ref.id
}

export const PESAN_HAPUS_MASIH_PINDAH = 'Penduduk masih berstatus pindah keluar. Gunakan Batalkan untuk mengembalikan penduduk.'

async function deleteMutasiKeluar(id: string, nama: string, email: string, nikTarget?: string): Promise<void> {
  // Hapus HANYA menghapus catatan: status penduduk dan suksesi KK tidak dibalik (itu tugas Batalkan).
  // Catatan yang penduduknya masih 'mutasi-keluar' tidak boleh dihapus; hanya catatan yatim yang boleh.
  if (nikTarget) {
    const snap = await getDoc(doc(db, 'penduduk', nikTarget))
    if (snap.exists() && snap.data()?.status === 'mutasi-keluar') throw new GalatTolak(PESAN_HAPUS_MASIH_PINDAH)
  }
  await deleteDoc(doc(db, 'mutasi_keluar', id))
  await writeLog('hapus', `Hapus pindah keluar: ${nama}`, email)
}

async function rollbackMutasiKeluar(mutasiId: string, nik_target: string, nama: string, email: string): Promise<void> {
  // NIK adalah document ID — langsung getDoc
  const pendudukRef = doc(db, 'penduduk', nik_target)
  const pendudukSnap = await getDoc(pendudukRef)
  if (pendudukSnap.exists()) {
    await updateDoc(pendudukRef, { status: 'aktif', updated_at: serverTimestamp() })
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

type DataMasuk = Omit<MutasiMasuk, 'id' | 'created_at' | 'updated_at' | 'created_by'>

const PESAN_NIK_WAJIB = 'NIK wajib diisi untuk pindah masuk'

/** Isi dokumen penduduk dari satu catatan pindah masuk (satu sumber untuk jalur 1 orang dan 1 keluarga). */
function dataPendudukDariMasuk(data: DataMasuk, nik: string, email: string) {
  return {
    nama_lengkap: data.nama_lengkap,
    nik,
    no_kk: data.no_kk,
    jenis_kelamin: data.jenis_kelamin,
    agama: data.agama,
    hubungan_keluarga: data.hubungan_keluarga,
    nama_ayah: data.nama_ayah,
    nama_ibu: data.nama_ibu,
    pendidikan: data.pendidikan,
    pekerjaan: data.pekerjaan,
    rt: rt3(data.rt),
    rw: rt3(data.rw),
    status_perkawinan: data.status_perkawinan,
    tanggal_lahir: data.tanggal_lahir,
    tempat_lahir: data.tempat_lahir,
    golongan_darah: data.golongan_darah ?? '',
    alamat: data.alamat ?? '',
    status: 'aktif',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    created_by: email,
  }
}

/** Status penduduk yang BOLEH ditimpa oleh pindah masuk: warga yang pernah pindah keluar lalu kembali. */
const STATUS_BOLEH_MASUK_LAGI = ['mutasi-keluar', 'tidak aktif']

/**
 * Catat pindah masuk 1 atau BANYAK orang (1 keluarga) dalam SATU transaksi atomik: catatan pindah masuk +
 * penduduk (ID dokumen = NIK) + log tiap orang tersimpan semuanya atau tidak sama sekali.
 *  - Dulu keluarga ditulis satu per satu: bila anggota ke-2 gagal, anggota ke-1 sudah tersimpan, sisanya tidak, dan
 *    mengulang "Simpan Semua" menggandakan catatan pindah masuk anggota yang sudah masuk.
 *  - Seluruh daftar diperiksa dulu SEBELUM ada yang ditulis: NIK kosong, NIK kembar di daftar, dan NIK yang sudah
 *    terdaftar sebagai penduduk aktif/meninggal (prinsip "tolak, jangan timpa" seperti addPenduduk). Penduduk
 *    berstatus pindah keluar boleh ditimpa (warga kembali).
 * Mengembalikan ID catatan pindah masuk sesuai urutan daftar.
 */
async function simpanPindahMasuk(daftar: DataMasuk[], email: string): Promise<string[]> {
  if (daftar.length === 0) throw new GalatTolak('Minimal 1 anggota harus ditambahkan')
  const nikList = daftar.map((d) => (d.nik ?? '').trim())
  if (nikList.some((n) => !n)) throw new GalatTolak(PESAN_NIK_WAJIB)
  const kembar = nikList.find((n, i) => nikList.indexOf(n) !== i)
  if (kembar) throw new GalatTolak(`NIK ${kembar} muncul lebih dari sekali dalam daftar`)

  // Ref dibuat sekali di luar transaksi: bila transaksi diulang otomatis, ID catatan tetap sama.
  const catatanRefs = daftar.map(() => doc(collection(db, 'mutasi_masuk')))
  const logRefs = daftar.map(() => doc(collection(db, LOG_COL)))
  const pendudukRefs = nikList.map((nik) => doc(db, 'penduduk', nik))

  await runTransaction(db, async (tx) => {
    // Semua baca dulu, baru tulis (aturan transaksi Firestore)
    const ada = await Promise.all(pendudukRefs.map((r) => tx.get(r)))
    const bentrok = ada.flatMap((snap, i) => {
      if (!snap.exists()) return []
      const lama = snap.data() as { nama_lengkap?: string; status?: string } | undefined
      if (STATUS_BOLEH_MASUK_LAGI.includes(lama?.status ?? '')) return []
      return [`${nikList[i]} (${lama?.nama_lengkap ?? 'penduduk lain'}, ${lama?.status ?? 'aktif'})`]
    })
    if (bentrok.length > 0) {
      throw new GalatTolak(
        `NIK ${bentrok.join('; ')} sudah terdaftar. Tidak ada data yang disimpan, supaya data yang sudah ada tidak tertimpa.`,
      )
    }
    daftar.forEach((data, i) => {
      tx.set(catatanRefs[i], { ...data, created_at: serverTimestamp(), created_by: email })
      // Otomatis tambah ke penduduk — gunakan NIK sebagai document ID
      tx.set(pendudukRefs[i], dataPendudukDariMasuk(data, nikList[i], email))
      tx.set(logRefs[i], {
        aksi: 'tambah',
        keterangan: `Pindah masuk: ${data.nama_lengkap}`,
        nik_target: nikList[i],
        oleh: email,
        ts: serverTimestamp(),
      })
    })
  })
  return catatanRefs.map((r) => r.id)
}

async function addMutasiMasuk(data: DataMasuk, email: string): Promise<string> {
  const [id] = await simpanPindahMasuk([data], email)
  return id
}

async function addMutasiMasukBatch(anggotaList: DataMasuk[], email: string): Promise<void> {
  await simpanPindahMasuk(anggotaList, email)
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
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
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
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}

export function useAddMutasiMasukBatch() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: (anggotaList: Omit<MutasiMasuk, 'id' | 'created_at' | 'updated_at' | 'created_by'>[]) =>
      addMutasiMasukBatch(anggotaList, user?.email ?? 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mutasi'], exact: false })
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}

export function useDeleteMutasiKeluar() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({ id, nama, nik_target }: { id: string; nama: string; nik_target?: string }) =>
      deleteMutasiKeluar(id, nama, user?.email ?? 'unknown', nik_target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mutasi'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
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
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
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
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
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
    // Catatan + penduduk (hanya kolom yang berubah) + log dalam satu transaksi: lihat lib/sinkron-catatan.ts
    mutationFn: ({ id, data }: { id: string; data: Partial<MutasiMasuk> }) =>
      editCatatanDanPenduduk({
        koleksi: 'mutasi_masuk', id, data: data as Record<string, unknown>, kolom: KOLOM_PENDUDUK_DARI_MASUK,
        label: 'pindah masuk', nama: data.nama_lengkap ?? '', email: user?.email ?? 'unknown',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mutasi'], exact: false })
      qc.invalidateQueries({ queryKey: ['penduduk'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}
