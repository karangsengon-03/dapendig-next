'use client'

import { useQuery } from '@tanstack/react-query'
import { rt3 } from '@/lib/rt-rw'
import { useAppStore } from '@/store/appStore'
import { daftarRt, dusunDariRt, type DusunItem } from '@/lib/dusun'
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
async function fetchPendudukStats(petaDusun: DusunItem[]) {
  const snap = await getDocs(
    query(collection(db, 'penduduk'), where('status', '==', 'aktif'))
  )
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penduduk))

  const totalPenduduk = rows.length

  // Kepala Keluarga: hubungan_keluarga === 'Kepala Keluarga'
  const totalKK = rows.filter(
    (r) => r.hubungan_keluarga === 'Kepala Keluarga'
  ).length

  // Per RT dengan L dan P
  const byRT: Record<string, { laki: number; perempuan: number }> = {}
  for (const r of rows) {
    const key = rt3(r.rt) || '000'
    if (!byRT[key]) byRT[key] = { laki: 0, perempuan: 0 }
    if (r.jenis_kelamin === 'Laki-laki') byRT[key].laki++
    else byRT[key].perempuan++
  }

  // RT resmi = gabungan RT semua dusun (Pengaturan → Dusun dan RT)
  const RT_VALID = daftarRt(petaDusun)

  const rtData = RT_VALID.map(rt => ({
    rt,
    laki: byRT[rt]?.laki ?? 0,
    perempuan: byRT[rt]?.perempuan ?? 0,
    jumlah: (byRT[rt]?.laki ?? 0) + (byRT[rt]?.perempuan ?? 0),
  }))

  // Data RT di luar RT_VALID → Lain-lain
  const lainLaki = Object.entries(byRT).filter(([rt]) => !RT_VALID.includes(rt)).reduce((s,[,v])=>s+v.laki,0)
  const lainPerempuan = Object.entries(byRT).filter(([rt]) => !RT_VALID.includes(rt)).reduce((s,[,v])=>s+v.perempuan,0)
  if (lainLaki + lainPerempuan > 0) {
    rtData.push({ rt: 'Lain-lain', laki: lainLaki, perempuan: lainPerempuan, jumlah: lainLaki + lainPerempuan })
  }

  // Dusun — dari pemetaan RT → Dusun di Pengaturan
  const DUSUN_ORDER = petaDusun.map((d) => d.nama)
  const byDusun: Record<string, { laki: number; perempuan: number }> = {}
  for (const r of rows) {
    const rt = rt3(r.rt)
    const dusun = dusunDariRt(rt, petaDusun) || 'Lain-lain'
    if (!byDusun[dusun]) byDusun[dusun] = { laki: 0, perempuan: 0 }
    if (r.jenis_kelamin === 'Laki-laki') byDusun[dusun].laki++
    else byDusun[dusun].perempuan++
  }
  const dusunData = [...DUSUN_ORDER, ...(byDusun['Lain-lain'] ? ['Lain-lain'] : [])].map(dusun => ({
    dusun,
    laki: byDusun[dusun]?.laki ?? 0,
    perempuan: byDusun[dusun]?.perempuan ?? 0,
    jumlah: (byDusun[dusun]?.laki ?? 0) + (byDusun[dusun]?.perempuan ?? 0),
  }))

  // Per jenis kelamin
  const lakiLaki = rows.filter((r) => r.jenis_kelamin === 'Laki-laki').length
  const perempuan = rows.filter((r) => r.jenis_kelamin === 'Perempuan').length

  return { totalPenduduk, totalKK, rtData, dusunData, lakiLaki, perempuan }
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
  const petaDusun = useAppStore((s) => s.dusun)
  return useQuery({
    queryKey: ['dashboard', 'penduduk-stats', petaDusun],
    queryFn: () => fetchPendudukStats(petaDusun),
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
import { KATEGORI_UMUR, umurDari } from '@/lib/umur'

async function fetchUmurStats(): Promise<UmurData[]> {
  const snap = await getDocs(
    query(collection(db, 'penduduk'), where('status', '==', 'aktif'))
  )
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penduduk))

  return KATEGORI_UMUR.map(({ label, min, max, color }) => ({
    label,
    color,
    jumlah: rows.filter((r) => {
      // Umur dari lib/umur (sama dengan Daftar Penduduk); tanggal kosong/rusak = -1, tidak masuk kategori mana pun
      const umur = umurDari(r.tanggal_lahir)
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
