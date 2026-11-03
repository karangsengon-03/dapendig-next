/**
 * nik-tanggal.ts
 * Mengurai tanggal lahir dari NIK. Fungsi murni (tanpa Firebase) supaya bisa dites.
 *
 * Format NIK: [2 prov][2 kab][2 kec][2 tgl][2 bln][2 thn][4 urut]
 *   - Perempuan: tanggal ditambah 40 (tgl 5 → 45).
 *   - Tahun hanya 2 digit, jadi abadnya HARUS ditentukan:
 *       1. Bentuk dua kandidat: 19yy dan 20yy.
 *       2. Buang kandidat yang bukan tanggal kalender sah (mis. 29 Feb 1900) atau yang di masa depan.
 *       3. Sisa satu  → itu hasilnya.
 *          Sisa dua   → pilih yang TAHUNNYA sama dengan tanggal yang tersimpan
 *                       (bug lama hanya menggeser hitungan hari, bukan tahun).
 *          Tak ada tanggal tersimpan, atau tak ada yang cocok → AMBIGU: JANGAN diperbaiki otomatis.
 *
 * Pivot tahun tetap (mis. "<= 24 → 2000+yy") sengaja TIDAK dipakai: ia salah untuk bayi lahir
 * setelah tahun pivot dan menggeser tanggal lahir seratus tahun.
 */
import { normalisasiTanggal } from '@/lib/dateUtils'
import { hariIni as hariIniLokal } from '@/lib/tanggal-lokal'

export type HasilTanggalNik =
  /** NIK tidak 16 digit angka, atau bagian tanggalnya bukan tanggal kalender sah di abad mana pun. */
  | { status: 'tidak-valid' }
  /** Tanggal lahir dapat dipastikan (YYYY-MM-DD). */
  | { status: 'pasti'; tanggal: string }
  /** Dua abad sama-sama masuk akal dan tanggal tersimpan tidak membantu memilih: perlu dicek manual. */
  | { status: 'ambigu'; kandidat: string[] }

function dua(n: number): string {
  return String(n).padStart(2, '0')
}

/** Jumlah hari dalam bulan (bulan 1–12), memperhitungkan tahun kabisat; bebas zona waktu. */
function hariDalamBulan(tahun: number, bulan: number): number {
  return new Date(Date.UTC(tahun, bulan, 0)).getUTCDate()
}

/** Kandidat YYYY-MM-DD bila sah dan tidak melewati hari ini; selain itu null. */
function kandidatSah(tahun: number, bulan: number, hari: number, hariIni: string): string | null {
  if (bulan < 1 || bulan > 12) return null
  if (hari < 1 || hari > hariDalamBulan(tahun, bulan)) return null
  const iso = `${tahun}-${dua(bulan)}-${dua(hari)}`
  return iso <= hariIni ? iso : null
}

/** Tahun (4 digit) dari tanggal tersimpan; mendukung YYYY-MM-DD dan DD/MM/YYYY lama. null bila tak terbaca. */
function tahunTersimpan(tanggal: string | null | undefined): number | null {
  const iso = normalisasiTanggal(String(tanggal ?? '').trim())
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec(iso)
  return m ? Number(m[1]) : null
}

/**
 * @param nik              NIK 16 digit.
 * @param tanggalTersimpan Tanggal lahir yang tersimpan sekarang (untuk memilih abad bila ada dua kandidat).
 * @param hariIni          YYYY-MM-DD; bawaan = hari ini menurut zona waktu lokal. Diisi manual di tes.
 */
export function tanggalDariNik(
  nik: string | null | undefined,
  tanggalTersimpan?: string | null,
  hariIni: string = hariIniLokal(),
): HasilTanggalNik {
  const s = String(nik ?? '').trim()
  if (!/^\d{16}$/.test(s)) return { status: 'tidak-valid' }

  const hariMentah = Number(s.slice(6, 8))
  const bulan = Number(s.slice(8, 10))
  const yy = Number(s.slice(10, 12))
  const hari = hariMentah > 40 ? hariMentah - 40 : hariMentah

  const kandidat = [1900 + yy, 2000 + yy]
    .map((tahun) => kandidatSah(tahun, bulan, hari, hariIni))
    .filter((k): k is string => k !== null)

  if (kandidat.length === 0) return { status: 'tidak-valid' }
  if (kandidat.length === 1) return { status: 'pasti', tanggal: kandidat[0] }

  const tahun = tahunTersimpan(tanggalTersimpan)
  if (tahun !== null) {
    const cocok = kandidat.find((k) => Number(k.slice(0, 4)) === tahun)
    if (cocok) return { status: 'pasti', tanggal: cocok }
  }
  return { status: 'ambigu', kandidat }
}
