'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Penduduk } from '@/types'

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
}

const KELOMPOK_UMUR = [
  { label: '0–4',   min: 0,  max: 4   },
  { label: '5–9',   min: 5,  max: 9   },
  { label: '10–14', min: 10, max: 14  },
  { label: '15–19', min: 15, max: 19  },
  { label: '20–24', min: 20, max: 24  },
  { label: '25–29', min: 25, max: 29  },
  { label: '30–34', min: 30, max: 34  },
  { label: '35–39', min: 35, max: 39  },
  { label: '40–44', min: 40, max: 44  },
  { label: '45–49', min: 45, max: 49  },
  { label: '50–54', min: 50, max: 54  },
  { label: '55–59', min: 55, max: 59  },
  { label: '60–64', min: 60, max: 64  },
  { label: '65+',   min: 65, max: 999 },
]

// Klasifikasi: Balita(0-5), Anak-anak(6-10), Remaja(11-19), Dewasa(20-44), Lansia(45+)
const KLASIFIKASI = [
  { label: 'Balita',     min: 0,  max: 5   },
  { label: 'Anak-anak',  min: 6,  max: 10  },
  { label: 'Remaja',     min: 11, max: 19  },
  { label: 'Dewasa',     min: 20, max: 44  },
  { label: 'Lansia',     min: 45, max: 999 },
]

function hitungUmur(tanggalLahir: string): number {
  const lahir = new Date(tanggalLahir)
  const sekarang = new Date()
  let umur = sekarang.getFullYear() - lahir.getFullYear()
  const m = sekarang.getMonth() - lahir.getMonth()
  if (m < 0 || (m === 0 && sekarang.getDate() < lahir.getDate())) umur--
  return umur
}

async function fetchMonografi(): Promise<MonografiData> {
  const snap = await getDocs(
    query(collection(db, 'penduduk'), where('status', '==', 'aktif'))
  )
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Penduduk))

  const snapAll = await getDocs(collection(db, 'penduduk'))
  const totalAktif = all.length
  const totalTidakAktif = snapAll.size - totalAktif
  const total = snapAll.size

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

    // Agama — fallback agar tidak jadi key "undefined"
    const agama = p.agama || 'Tidak Diketahui'
    byAgama[agama] = (byAgama[agama] ?? 0) + 1

    // Pendidikan — fallback
    const pendidikan = p.pendidikan || 'Tidak Diketahui'
    byPendidikan[pendidikan] = (byPendidikan[pendidikan] ?? 0) + 1

    // Pekerjaan — semua, tidak top 10
    const pekerjaan = p.pekerjaan || 'Tidak Diketahui'
    byPekerjaan[pekerjaan] = (byPekerjaan[pekerjaan] ?? 0) + 1

    // Status perkawinan
    const statusPerkawinan = p.status_perkawinan || 'Tidak Diketahui'
    byStatusPerkawinan[statusPerkawinan] = (byStatusPerkawinan[statusPerkawinan] ?? 0) + 1

    // RT
    if (!byRT[p.rt]) byRT[p.rt] = { laki: 0, perempuan: 0 }
    if (p.jenis_kelamin === 'Laki-laki') byRT[p.rt].laki++
    else byRT[p.rt].perempuan++

    // Piramida umur
    if (p.tanggal_lahir) {
      const umur = hitungUmur(p.tanggal_lahir)
      const idx = KELOMPOK_UMUR.findIndex((k) => umur >= k.min && umur <= k.max)
      if (idx >= 0) {
        if (p.jenis_kelamin === 'Laki-laki') piramida[idx].laki++
        else piramida[idx].perempuan++
      }

      // Klasifikasi umur
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
  }
}

export function useMonografi() {
  return useQuery({
    queryKey: ['monografi'],
    queryFn: fetchMonografi,
    staleTime: 120_000,
  })
}
