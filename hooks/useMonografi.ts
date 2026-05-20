'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collection, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Penduduk } from '@/types'
import { hitungUmur as calcUmur } from '@/lib/dateUtils'

// ── Tipe konfigurasi kelompok umur ──────────────────────────────────────────
// Setiap entry adalah satu "batang" piramida umur yang didefinisikan bebas

export interface KelompokUmurEntry {
  min: number // umur minimum inklusif
  max: number // umur maksimum inklusif (999 untuk "X+")
}

// Array dari entry, misal: [{min:0,max:4},{min:5,max:14},{min:15,max:19},...]
export type KelompokUmurConfig = KelompokUmurEntry[]

export const DEFAULT_KELOMPOK_UMUR_CONFIG: KelompokUmurConfig = [
  { min: 0,  max: 4  },
  { min: 5,  max: 9  },
  { min: 10, max: 14 },
  { min: 15, max: 19 },
  { min: 20, max: 24 },
  { min: 25, max: 29 },
  { min: 30, max: 34 },
  { min: 35, max: 39 },
  { min: 40, max: 44 },
  { min: 45, max: 49 },
  { min: 50, max: 54 },
  { min: 55, max: 59 },
  { min: 60, max: 64 },
  { min: 65, max: 999 },
]

// Format label untuk satu entry
export function formatKelompokLabel(entry: KelompokUmurEntry): string {
  if (entry.max === 999) return `${entry.min}+`
  return `${entry.min}\u2013${entry.max}`
}

export interface MonografiData {
  totalAktif: number
  totalTidakAktif: number
  total: number
  laki: number
  perempuan: number
  byAgama: Record<string, number>
  byPendidikan: Record<string, number>
  byPekerjaan: Record<string, number>
  byStatusPerkawinan: Record<string, number>
  byRT: Record<string, { laki: number; perempuan: number }>
  piramidaUmur: { kelompok: string; laki: number; perempuan: number }[]
  byKlasifikasiUmur: Record<string, number>
  kelompokUmurConfig: KelompokUmurConfig
}

// Klasifikasi tetap (tidak dipengaruhi konfigurasi piramida)
const KLASIFIKASI = [
  { label: 'Balita',    min: 0,  max: 5   },
  { label: 'Anak-anak', min: 6,  max: 10  },
  { label: 'Remaja',    min: 11, max: 19  },
  { label: 'Dewasa',    min: 20, max: 44  },
  { label: 'Lansia',    min: 45, max: 999 },
]

function hitungUmur(tanggalLahir: string): number {
  return calcUmur(tanggalLahir)
}

// ── Baca konfigurasi dari Firestore ─────────────────────────────────────────

async function fetchKelompokUmurConfig(): Promise<KelompokUmurConfig> {
  try {
    const snap = await getDoc(doc(db, 'config', 'kelompok_umur'))
    if (snap.exists()) {
      const data = snap.data()
      // Format baru: array of {min, max}
      if (Array.isArray(data.kelompok) && data.kelompok.length > 0) {
        const valid = (data.kelompok as KelompokUmurEntry[]).every(
          (e) => typeof e.min === 'number' && typeof e.max === 'number'
        )
        if (valid) return data.kelompok as KelompokUmurConfig
      }
    }
  } catch {
    // fallback ke default
  }
  return DEFAULT_KELOMPOK_UMUR_CONFIG
}

// ── Fetch monografi ──────────────────────────────────────────────────────────

async function fetchMonografi(): Promise<MonografiData> {
  const [kelompokUmurConfig, snap, snapAll] = await Promise.all([
    fetchKelompokUmurConfig(),
    getDocs(query(collection(db, 'penduduk'), where('status', '==', 'aktif'))),
    getDocs(collection(db, 'penduduk')),
  ])

  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penduduk))
  const totalAktif = all.length
  const totalTidakAktif = snapAll.size - totalAktif
  const total = snapAll.size

  const byAgama: Record<string, number> = {}
  const byPendidikan: Record<string, number> = {}
  const byPekerjaan: Record<string, number> = {}
  const byStatusPerkawinan: Record<string, number> = {}
  const byRT: Record<string, { laki: number; perempuan: number }> = {}
  const byKlasifikasiUmur: Record<string, number> = {}

  const piramida = kelompokUmurConfig.map((k) => ({
    kelompok: formatKelompokLabel(k),
    laki: 0,
    perempuan: 0,
  }))

  let laki = 0
  let perempuan = 0

  for (const p of all) {
    if (p.jenis_kelamin === 'Laki-laki') laki++
    else perempuan++

    const agama = p.agama?.trim()
    if (agama) byAgama[agama] = (byAgama[agama] ?? 0) + 1

    const pendidikan = p.pendidikan?.trim()
    if (pendidikan) byPendidikan[pendidikan] = (byPendidikan[pendidikan] ?? 0) + 1

    const pekerjaan = p.pekerjaan?.trim()
    if (pekerjaan) byPekerjaan[pekerjaan] = (byPekerjaan[pekerjaan] ?? 0) + 1

    const statusPerkawinan = p.status_perkawinan?.trim()
    if (statusPerkawinan) byStatusPerkawinan[statusPerkawinan] = (byStatusPerkawinan[statusPerkawinan] ?? 0) + 1

    if (!byRT[p.rt]) byRT[p.rt] = { laki: 0, perempuan: 0 }
    if (p.jenis_kelamin === 'Laki-laki') byRT[p.rt].laki++
    else byRT[p.rt].perempuan++

    if (p.tanggal_lahir) {
      const umur = hitungUmur(p.tanggal_lahir)

      // Piramida umur: cari kelompok yang cocok
      const idx = kelompokUmurConfig.findIndex((k) => umur >= k.min && umur <= k.max)
      if (idx >= 0) {
        if (p.jenis_kelamin === 'Laki-laki') piramida[idx].laki++
        else piramida[idx].perempuan++
      }

      // Klasifikasi umur (tetap)
      const kls = KLASIFIKASI.find((k) => umur >= k.min && umur <= k.max)
      if (kls) byKlasifikasiUmur[kls.label] = (byKlasifikasiUmur[kls.label] ?? 0) + 1
    }
  }

  return {
    totalAktif,
    totalTidakAktif,
    total,
    laki,
    perempuan,
    byAgama,
    byPendidikan,
    byPekerjaan,
    byStatusPerkawinan,
    byRT,
    piramidaUmur: piramida,
    byKlasifikasiUmur,
    kelompokUmurConfig,
  }
}

// ── Simpan konfigurasi ke Firestore ─────────────────────────────────────────

async function saveKelompokUmurConfig(config: KelompokUmurConfig): Promise<void> {
  await setDoc(doc(db, 'config', 'kelompok_umur'), {
    kelompok: config,
    updated_at: serverTimestamp(),
  })
}

// ── Exported hooks ────────────────────────────────────────────────────────────

export function useMonografi() {
  return useQuery({
    queryKey: ['monografi'],
    queryFn: fetchMonografi,
    staleTime: 120_000,
  })
}

export function useSaveKelompokUmurConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveKelompokUmurConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monografi'], exact: false })
    },
  })
}
