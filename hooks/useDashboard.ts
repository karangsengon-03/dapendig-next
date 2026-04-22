'use client'

import { useQuery } from '@tanstack/react-query'
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
import type { Penduduk, Lahir, Meninggal, MutasiKeluar, MutasiMasuk, LogEntry } from '@/types'

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
async function fetchPendudukStats() {
  const snap = await getDocs(
    query(collection(db, 'penduduk'), where('status', '==', 'aktif'))
  )
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penduduk))

  const totalPenduduk = rows.length

  // Kepala Keluarga: hubungan_keluarga === 'Kepala Keluarga'
  const totalKK = rows.filter(
    (r) => r.hubungan_keluarga === 'Kepala Keluarga'
  ).length

  // Per RT
  const byRT: Record<string, number> = {}
  for (const r of rows) {
    const key = `RT ${r.rt}`
    byRT[key] = (byRT[key] ?? 0) + 1
  }
  const rtData = Object.entries(byRT)
    .map(([rt, jumlah]) => ({ rt, jumlah }))
    .sort((a, b) => a.rt.localeCompare(b.rt, 'id', { numeric: true }))

  // Per jenis kelamin
  const lakiLaki = rows.filter((r) => r.jenis_kelamin === 'Laki-laki').length
  const perempuan = rows.filter((r) => r.jenis_kelamin === 'Perempuan').length

  return { totalPenduduk, totalKK, rtData, lakiLaki, perempuan }
}

// ── Kelahiran bulan ini ─────────────────────────────────────────────────────
async function fetchKelahiranBulanIni() {
  const snap = await getDocs(collection(db, 'lahir'))
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lahir))
  return rows.filter((r) => inBulanIni(r.created_at ?? r.tanggal_lahir)).length
}

// ── Kematian bulan ini ──────────────────────────────────────────────────────
async function fetchKematianBulanIni() {
  const snap = await getDocs(collection(db, 'meninggal'))
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Meninggal))
  return rows.filter((r) => inBulanIni(r.created_at ?? r.tanggal)).length
}

// ── Mutasi keluar bulan ini ─────────────────────────────────────────────────
async function fetchMutasiKeluarBulanIni() {
  const snap = await getDocs(collection(db, 'mutasi_keluar'))
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MutasiKeluar))
  return rows.filter((r) => inBulanIni(r.created_at ?? r.tanggal)).length
}

// ── Mutasi masuk bulan ini ──────────────────────────────────────────────────
async function fetchMutasiMasukBulanIni() {
  const snap = await getDocs(collection(db, 'mutasi_masuk'))
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MutasiMasuk))
  return rows.filter((r) => inBulanIni(r.created_at ?? r.tanggal)).length
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
  return useQuery({
    queryKey: ['dashboard', 'penduduk-stats'],
    queryFn: fetchPendudukStats,
  })
}

export function useKelahiranBulanIni() {
  return useQuery({
    queryKey: ['dashboard', 'kelahiran-bulan-ini'],
    queryFn: fetchKelahiranBulanIni,
  })
}

export function useKematianBulanIni() {
  return useQuery({
    queryKey: ['dashboard', 'kematian-bulan-ini'],
    queryFn: fetchKematianBulanIni,
  })
}

export function useMutasiBulanIni() {
  return useQuery({
    queryKey: ['dashboard', 'mutasi-bulan-ini'],
    queryFn: async () => {
      const [keluar, masuk] = await Promise.all([
        fetchMutasiKeluarBulanIni(),
        fetchMutasiMasukBulanIni(),
      ])
      return { keluar, masuk }
    },
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
import { KATEGORI_UMUR } from '@/components/dashboard/UmurChart'

function hitungUmur(tanggalLahir: string): number {
  const now = new Date()
  const lahir = new Date(tanggalLahir + 'T00:00:00')
  if (isNaN(lahir.getTime())) return 0
  let age = now.getFullYear() - lahir.getFullYear()
  const m = now.getMonth() - lahir.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < lahir.getDate())) age--
  return Math.max(0, age)
}

async function fetchUmurStats(): Promise<UmurData[]> {
  const snap = await getDocs(
    query(collection(db, 'penduduk'), where('status', '==', 'aktif'))
  )
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penduduk))

  return KATEGORI_UMUR.map(({ label, min, max, color }) => ({
    label,
    color,
    jumlah: rows.filter((r) => {
      if (!r.tanggal_lahir) return false
      const umur = hitungUmur(r.tanggal_lahir)
      return umur >= min && umur <= max
    }).length,
  }))
}

export function useUmurStats() {
  return useQuery({
    queryKey: ['dashboard', 'umur-stats'],
    queryFn: fetchUmurStats,
    staleTime: 120_000,
  })
}
