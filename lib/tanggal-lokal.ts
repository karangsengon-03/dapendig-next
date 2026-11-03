/**
 * tanggal-lokal.ts
 * Tanggal berdasarkan zona waktu LOKAL perangkat (bukan UTC).
 *
 * Kenapa ada: `new Date().toISOString().slice(0, 10)` memakai UTC, sehingga di WIB (UTC+7)
 * sebelum pukul 07.00 hasilnya tanggal KEMARIN. Semua tanggal bawaan "hari ini" memakai helper ini.
 */

import { normalisasiTanggal } from '@/lib/dateUtils'

function dua(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format objek Date menjadi YYYY-MM-DD menurut zona waktu lokal. */
export function formatTanggalLokal(d: Date): string {
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`
}

/** Tanggal hari ini (YYYY-MM-DD) menurut zona waktu lokal perangkat. */
export function hariIni(): string {
  return formatTanggalLokal(new Date())
}

function hariKeEpoch(tanggal: string): number | null {
  const iso = normalisasiTanggal(String(tanggal ?? '').trim())
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/**
 * Selisih hari (ke − dari) antara dua tanggal YYYY-MM-DD (atau DD/MM/YYYY lama).
 * null bila salah satunya tidak terbaca. Dihitung dengan UTC murni sehingga bebas zona waktu/DST.
 */
export function selisihHari(dari: string, ke: string): number | null {
  const a = hariKeEpoch(dari)
  const b = hariKeEpoch(ke)
  return a === null || b === null ? null : Math.round((b - a) / 86400000)
}

/**
 * Bulan (0–11) dan tahun dari string 'YYYY-MM-DD…' dengan MEMOTONG string.
 * Jangan pakai `new Date('YYYY-MM-DD')`: ia dibaca sebagai tengah malam UTC sehingga di zona barat UTC
 * (mis. America/Los_Angeles) jatuh ke hari/bulan sebelumnya. null bila bukan awalan YYYY-MM-DD.
 */
export function bulanTahunDariString(tanggal: string): { bulan: number; tahun: number } | null {
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec(String(tanggal ?? '').trim())
  if (!m) return null
  const bulan = Number(m[2]) - 1
  return bulan >= 0 && bulan <= 11 ? { bulan, tahun: Number(m[1]) } : null
}

/**
 * Apakah tanggal (string 'YYYY-MM-DD' atau Timestamp Firestore { seconds }) jatuh pada bulan (0–11) dan tahun
 * tertentu menurut zona waktu lokal. String dipotong (bukan new Date(str)); Timestamp diubah ke tanggal lokal.
 */
export function cocokBulan(tanggal: unknown, bulan: number, tahun: number): boolean {
  if (!tanggal) return false
  if (typeof tanggal === 'object' && tanggal !== null && 'seconds' in tanggal) {
    const d = new Date((tanggal as { seconds: number }).seconds * 1000)
    return !isNaN(d.getTime()) && d.getMonth() === bulan && d.getFullYear() === tahun
  }
  if (typeof tanggal === 'string') {
    const bt = bulanTahunDariString(tanggal)
    return bt !== null && bt.bulan === bulan && bt.tahun === tahun
  }
  return false
}
