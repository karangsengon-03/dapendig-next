'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { DUSUN_BAWAAN, RW_BAWAAN, normalisasiDusun, normalisasiRw, validasiDusun, validasiRw, type DusunItem } from '@/lib/dusun'
import { GalatTolak } from '@/lib/galat-tolak'
import type { AppUser, ConfigWilayah, UserRole } from '@/types'
import { PEKERJAAN, HUBUNGAN_KELUARGA } from '@/lib/penduduk-constants'

const LOG_COL = 'log'

async function writeLog(aksi: string, keterangan: string, email: string) {
  await addDoc(collection(db, LOG_COL), {
    aksi,
    keterangan,
    nik_target: '',
    oleh: email,
    ts: serverTimestamp(),
  })
}

// ── User List (koleksi: users) ───────────────────────────────────────────────

async function fetchUserList(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => ({
    uid: d.id,
    email: d.data().email ?? '',
    nama: d.data().nama,
    role: d.data().role ?? 'viewer',
  } as AppUser))
}

export function useUserList() {
  return useQuery({
    queryKey: ['pengaturan', 'users'],
    queryFn: fetchUserList,
    staleTime: 60_000,
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ uid, role }: { uid: string; role: UserRole }) => {
      await updateDoc(doc(db, 'users', uid), { role })
      await writeLog('edit', `Ganti role user ${uid} → ${role}`, user?.email ?? 'unknown')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pengaturan', 'users'], exact: false })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ uid, email }: { uid: string; email: string }) => {
      await deleteDoc(doc(db, 'users', uid))
      await writeLog('hapus', `Hapus user: ${email}`, user?.email ?? 'unknown')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pengaturan', 'users'], exact: false })
    },
  })
}

// ── Wilayah Config (path: config/wilayah) ───────────────────────────────────
// Sesuai data aktual Firestore: koleksi 'config', dokumen 'wilayah'

async function fetchWilayahConfig(): Promise<ConfigWilayah> {
  const snap = await getDoc(doc(db, 'config', 'wilayah'))
  if (!snap.exists()) {
    return {
      desa: 'Karang Sengon',
      kecamatan: 'Klabang',
      kabupaten: 'Bondowoso',
      provinsi: 'Jawa Timur',
      kode_pos: '68284',
      tahun: new Date().getFullYear().toString(),
    }
  }
  return snap.data() as ConfigWilayah
}

export function useWilayahConfig() {
  return useQuery({
    queryKey: ['wilayah', 'config'],
    queryFn: fetchWilayahConfig,
    staleTime: 300_000,
  })
}

export function useSaveWilayah() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async (data: Omit<ConfigWilayah, 'updated_at' | 'updated_by'>) => {
      await setDoc(doc(db, 'config', 'wilayah'), {
        ...data,
        updated_at: serverTimestamp(),
        updated_by: user?.email ?? 'unknown',
      })
      await writeLog(
        'edit_wilayah',
        `Info wilayah diperbarui: ${data.desa}`,
        user?.email ?? 'unknown'
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wilayah'], exact: false })
    },
  })
}

// ── Dusun dan RT (path: config/dusun; dokumen di koleksi `config` yang sudah ada, aturan Firestore tidak berubah) ──

export interface DusunTersimpan {
  dusun: DusunItem[]
  rw: string[]
  /** false = belum pernah disimpan (menampilkan bawaan). */
  tersimpan: boolean
}

async function fetchDusunConfig(): Promise<DusunTersimpan> {
  const snap = await getDoc(doc(db, 'config', 'dusun'))
  const data = snap.exists() ? (snap.data() as { dusun?: unknown; rw?: unknown }) : null
  const d = data ? normalisasiDusun(data.dusun) : null
  // Dokumen lama tanpa field rw → RW bawaan
  const rw = (data ? normalisasiRw(data.rw) : null) ?? RW_BAWAAN
  return d ? { dusun: d, rw, tersimpan: true } : { dusun: DUSUN_BAWAAN, rw, tersimpan: false }
}

export function useDusunConfig() {
  return useQuery({ queryKey: ['dusun', 'config'], queryFn: fetchDusunConfig, staleTime: 300_000 })
}

export function useSaveDusun() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async (masukan: { dusun: DusunItem[]; rw: string[] }): Promise<{ dusun: DusunItem[]; rw: string[] }> => {
      const rapi = normalisasiDusun(masukan.dusun)
      const rw = normalisasiRw(masukan.rw)
      if (!rapi || validasiDusun(rapi).ada) throw new GalatTolak('Pengaturan dusun belum valid. Periksa nama dusun dan RT.')
      if (!rw || validasiRw(rw)) throw new GalatTolak('Pengaturan RW belum valid. Periksa daftar RW.')
      const email = user?.email ?? 'unknown'
      await setDoc(doc(db, 'config', 'dusun'), { dusun: rapi, rw, updated_at: serverTimestamp(), updated_by: email })
      await writeLog('edit_wilayah', `Dusun, RT, dan RW diperbarui: ${rapi.map((d) => `${d.nama} (${d.rt.length} RT)`).join(', ')}; RW ${rw.join(', ')}`, email)
      return { dusun: rapi, rw }
    },
    onSuccess: (hasil) => {
      useAppStore.getState().setDusun(hasil.dusun)
      useAppStore.getState().setRw(hasil.rw)
      qc.invalidateQueries({ queryKey: ['dusun'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard'], exact: false })
    },
  })
}

export function useNormalisasiData() {
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (): Promise<{ diperbarui: number; gagal: number }> => {
      const email = user?.email ?? 'unknown'
      const snap = await getDocs(collection(db, 'penduduk'))
      let diperbarui = 0
      let gagal = 0

      for (const d of snap.docs) {
        try {
          const data = d.data()
          const updates: Record<string, string> = {}

          // Normalisasi pekerjaan
          if (data.pekerjaan) {
            const norm = (PEKERJAAN as readonly string[]).find(
              (p) => p.toLowerCase() === String(data.pekerjaan).toLowerCase()
            )
            if (norm && norm !== data.pekerjaan) updates.pekerjaan = norm
          }

          // Normalisasi hubungan_keluarga
          if (data.hubungan_keluarga) {
            const norm = (HUBUNGAN_KELUARGA as readonly string[]).find(
              (h) => h.toLowerCase() === String(data.hubungan_keluarga).toLowerCase()
            )
            if (norm && norm !== data.hubungan_keluarga) updates.hubungan_keluarga = norm
          }

          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, 'penduduk', d.id), { ...updates, updated_at: serverTimestamp() })
            diperbarui++
          }
        } catch {
          gagal++
        }
      }

      await writeLog('normalisasi', `Normalisasi data: ${diperbarui} diperbarui`, email)
      return { diperbarui, gagal }
    },
  })
}
