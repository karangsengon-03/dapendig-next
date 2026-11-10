'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/store/appStore'
import { daftarRt, type DusunItem } from '@/lib/dusun'
import { kelompokRt, kelompokDusun } from '@/lib/sebaran-rt'
import { jumlahKeluarga } from '@/lib/keluarga'
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Penduduk, LogEntry } from '@/types'

// Helpers
function getBulanIni() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function inBulanIni(dateVal: unknown): boolean {
  if (!dateVal) return false
  const { start, end } = getBulanIni()

  let d: Date
  if (dateVal instanceof Timestamp) {
    d = dateVal.toDate()
  } else if (typeof dateVal === 'string') {
    // format "YYYY-MM-DD"
    d = new Date(dateVal + 'T00:00:00')
  } else {
    return false
  }
  return d >= start && d <= end
}

// ── Fetch semua penduduk aktif ──────────────────────────────────────────────
async function fetchPendudukStats(petaDusun: DusunItem[]) {
  const snap = await getDocs(
    query(collection(db, 'penduduk'), where('status', '==', 'aktif'))
  )
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penduduk))

  const totalPenduduk = rows.length

  // Jumlah keluarga = No. KK berbeda (sama dengan Daftar Penduduk; lib/keluarga.ts)
  const totalKK = jumlahKeluarga(rows)

  // Per RT dan per dusun dengan L dan P — RT resmi = gabungan RT semua dusun (Pengaturan → Dusun dan RT);
  // logika kelompok ada di lib/sebaran-rt.ts agar bisa diuji tanpa Firestore
  const rtData = kelompokRt(rows, daftarRt(petaDusun))
  const dusunData = kelompokDusun(rows, petaDusun)

  // Per jenis kelamin
  const lakiLaki = rows.filter((r) => r.jenis_kelamin === 'Laki-laki').length
  const perempuan = rows.filter((r) => r.jenis_kelamin === 'Perempuan').length

  return { totalPenduduk, totalKK, rtData, dusunData, lakiLaki, perempuan }
}

// ── Log terbaru ─────────────────────────────────────────────────────────────
async function fetchRecentLog() {
  const snap = await getDocs(
    query(collection(db, 'log'), orderBy('ts', 'desc'), limit(8))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogEntry))
}

// ── Exported hooks ──────────────────────────────────────────────────────────
export function usePendudukStats() {
  const petaDusun = useAppStore((s) => s.dusun)
  return useQuery({
    queryKey: ['dashboard', 'penduduk-stats', petaDusun],
    queryFn: () => fetchPendudukStats(petaDusun),
  })
}
export function useRecentLog() {
  return useQuery({
    queryKey: ['dashboard', 'recent-log'],
    queryFn: fetchRecentLog,
  })
}

// ── Penduduk baru bulan ini (untuk badge sidebar) ────────────────────────────
async function fetchPendudukBaruBulanIni(): Promise<number> {
  const snap = await getDocs(collection(db, 'penduduk'))
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penduduk))
  return rows.filter((r) => inBulanIni(r.created_at)).length
}

export function usePendudukBaruBulanIni() {
  return useQuery({
    queryKey: ['dashboard', 'penduduk-baru-bulan-ini'],
    queryFn: fetchPendudukBaruBulanIni,
    staleTime: 60_000,
  })
}

// ── Distribusi umur ─────────────────────────────────────────────────────────
import type { UmurData } from '@/components/dashboard/UmurChart'
import { KATEGORI_UMUR, umurDari } from '@/lib/umur'

async function fetchUmurStats(): Promise<UmurData[]> {
  const snap = await getDocs(
    query(collection(db, 'penduduk'), where('status', '==', 'aktif'))
  )
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penduduk))

  return KATEGORI_UMUR.map(({ label, min, max, color }) => {
    // Umur dari lib/umur (sama dengan Daftar Penduduk); tanggal kosong/rusak = -1, tidak masuk kategori mana pun
    const anggota = rows.filter((r) => {
      const umur = umurDari(r.tanggal_lahir)
      return umur >= min && umur <= max
    })
    const laki = anggota.filter((r) => r.jenis_kelamin === 'Laki-laki').length
    return { label, color, jumlah: anggota.length, laki, perempuan: anggota.length - laki }
  })
}

export function useUmurStats() {
  return useQuery({
    queryKey: ['dashboard', 'umur-stats'],
    queryFn: fetchUmurStats,
    staleTime: 120_000,
  })
}
