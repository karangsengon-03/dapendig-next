'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collection, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Penduduk } from '@/types'

export interface KelompokUmurConfig {
  interval: number // rentang per kelompok: misal 5 artinya 0-4,5-9,... atau 4 artinya 0-3,4-7,...
  batasAkhir: number // umur mulai kelompok terakhir: misal 65
}

export const DEFAULT_KELOMPOK_UMUR_CONFIG: KelompokUmurConfig = {
  interval: 5,
  batasAkhir: 65,
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

// Klasifikasi: Balita(0-5), Anak-anak(6-10), Remaja(11-19), Dewasa(20-44), Lansia(45+)
const KLASIFIKASI = [
  { label: 'Balita',     min: 0,  max: 5   },
  { label: 'Anak-anak',  min: 6,  max: 10  },
  { label: 'Remaja',     min: 11, max: 19  },
  { label: 'Dewasa',     min: 20, max: 44  },
  { label: 'Lansia',     min: 45, max: 999 },
]

import { hitungUmur as calcUmur } from '@/lib/dateUtils'

function hitungUmur(tanggalLahir: string): number {
  return calcUmur(tanggalLahir)
}

function buildKelompokUmur(config: KelompokUmurConfig): { label: string; min: number; max: number }[] {
  const { interval, batasAkhir } = config
  const groups: { label: string; min: number; max: number }[] = []
  let current = 0
  while (current < batasAkhir) {
    const min = current
    const max = current + interval - 1
    groups.push({
      label: `${min}\u2013${max}`,
      min,
      max,
    })
    current += interval
  }
  // Last group: batasAkhir+
  groups.push({
    label: `${batasAkhir}+`,
    min: batasAkhir,
    max: 999,
  })
  return groups
}

async function fetchKelompokUmurConfig(): Promise<KelompokUmurConfig> {
  try {
    const snap = await getDoc(doc(db, 'config', 'kelompok_umur'))
    if (snap.exists()) {
      const data = snap.data()
      return {
        interval: typeof data.interval === 'number' ? data.interval : DEFAULT_KELOMPOK_UMUR_CONFIG.interval,
        batasAkhir: typeof data.batasAkhir === 'number' ? data.batasAkhir : DEFAULT_KELOMPOK_UMUR_CONFIG.batasAkhir,
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_KELOMPOK_UMUR_CONFIG
}

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

  const KELOMPOK_UMUR = buildKelompokUmur(kelompokUmurConfig)

  const byAgama: Record<string, number> = {}
  const byPendidikan: Record<string, number> = {}
  const byPekerjaan: Record<string, number> = {}
  const byStatusPerkawinan: Record<string, number> = {}
  const byRT: Record<string, { laki: number; perempuan: number }> = {}
  const byKlasifikasiUmur: Record<string, number> = {}

  const piramida = KELOMPOK_UMUR.map((k) => ({ kelompok: k.label, laki: 0, perempuan: 0 }))

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
      const idx = KELOMPOK_UMUR.findIndex((k) => umur >= k.min && umur <= k.max)
      if (idx >= 0) {
        if (p.jenis_kelamin === 'Laki-laki') piramida[idx].laki++
        else piramida[idx].perempuan++
      }

      const kls = KLASIFIKASI.find((k) => umur >= k.min && umur <= k.max)
      if (kls) {
        byKlasifikasiUmur[kls.label] = (byKlasifikasiUmur[kls.label] ?? 0) + 1
      }
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

async function saveKelompokUmurConfig(config: KelompokUmurConfig): Promise<void> {
  await setDoc(doc(db, 'config', 'kelompok_umur'), {
    ...config,
    updated_at: serverTimestamp(),
  })
}

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
