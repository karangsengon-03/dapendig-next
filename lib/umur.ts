/**
 * umur.ts — satu sumber untuk kategori umur Beranda dan penyaring umur di Daftar Penduduk.
 * Angka di Beranda dan isi daftar setelah diklik harus selalu sama, jadi keduanya memakai fungsi ini.
 * Umur dihitung dengan `hitungUmur` dari dateUtils (sama dengan Monografi, tabel Penduduk, dan Detail);
 * tanggal lahir kosong atau rusak (-1) tidak masuk kategori mana pun.
 */
import { hitungUmur } from '@/lib/dateUtils'

export interface KategoriUmur {
  label: string
  min: number
  max: number
  color: string
}

/** Batas atas "tak terbatas" (60+ th). */
export const UMUR_TAK_TERBATAS = 999

// Kategori umur standar kependudukan Indonesia (kelompok umur di Beranda)
export const KATEGORI_UMUR: KategoriUmur[] = [
  { label: 'Balita', min: 0, max: 4, color: '#34d399' },
  { label: 'Anak', min: 5, max: 14, color: '#60a5fa' },
  { label: 'Remaja', min: 15, max: 24, color: '#a78bfa' },
  { label: 'Dewasa', min: 25, max: 59, color: '#f59e0b' },
  { label: 'Lansia', min: 60, max: UMUR_TAK_TERBATAS, color: '#f87171' },
]

/** "0–4 th" atau "60+ th". */
export function labelRentang(min: number, max: number): string {
  return max >= UMUR_TAK_TERBATAS ? `${min}+ th` : `${min}–${max} th`
}

/** Kunci rentang untuk URL/penyaring: "0-4", "60-999". */
export function kunciRentang(min: number, max: number): string {
  return `${min}-${Math.min(max, UMUR_TAK_TERBATAS)}`
}

/** Kunci → rentang; null bila bukan kunci yang sah (mis. dari URL yang diketik sembarang). */
export function uraiRentang(kunci: string | null | undefined): { min: number; max: number } | null {
  const m = /^(\d{1,3})-(\d{1,3})$/.exec((kunci ?? '').trim())
  if (!m) return null
  const min = Number(m[1])
  const max = Number(m[2])
  return min <= max ? { min, max } : null
}

/** Kunci sah → dikembalikan; selain itu '' (tanpa penyaring umur). */
export function kunciRentangSah(kunci: string | null | undefined): string {
  const r = uraiRentang(kunci)
  return r ? kunciRentang(r.min, r.max) : ''
}

/** Label tampil untuk kunci rentang, mis. "Umur 0–4 th". */
export function labelKunciRentang(kunci: string): string {
  const r = uraiRentang(kunci)
  return r ? `Umur ${labelRentang(r.min, r.max)}` : kunci
}

/** Umur (tahun) dari tanggal lahir; -1 bila kosong/rusak. */
export function umurDari(tanggalLahir: string | null | undefined): number {
  return tanggalLahir ? hitungUmur(tanggalLahir) : -1
}

/** Apakah tanggal lahir ini jatuh dalam rentang `kunci`? Kunci tidak sah = tidak menyaring. */
export function cocokRentangUmur(tanggalLahir: string | null | undefined, kunci: string): boolean {
  const r = uraiRentang(kunci)
  if (!r) return true
  const umur = umurDari(tanggalLahir)
  return umur >= 0 && umur >= r.min && umur <= r.max
}
