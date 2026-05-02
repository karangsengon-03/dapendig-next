import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format tanggal YYYY-MM-DD ke "30 Januari 2000" (bahasa Indonesia).
 *
 * FIX: Dulu pakai new Date(tanggal) yang parse sebagai UTC midnight,
 * lalu getDate() bisa return hari yang salah di timezone WIB (UTC+7).
 * Sekarang parse string YYYY-MM-DD secara langsung tanpa Date object.
 */
export function formatTanggal(tanggal: string | undefined | null): string {
  if (!tanggal) return '-'
  const bulan = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  // Parse YYYY-MM-DD langsung tanpa Date object (timezone-safe)
  const isoMatch = tanggal.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const tgl = parseInt(isoMatch[3], 10)
    const bln = parseInt(isoMatch[2], 10)
    const thn = isoMatch[1]
    if (bln >= 1 && bln <= 12 && tgl >= 1 && tgl <= 31) {
      return `${tgl} ${bulan[bln]} ${thn}`
    }
  }
  // Fallback untuk format lain
  const d = new Date(tanggal.length === 10 ? tanggal + 'T00:00:00' : tanggal)
  if (isNaN(d.getTime())) return tanggal
  return `${d.getDate()} ${bulan[d.getMonth() + 1]} ${d.getFullYear()}`
}

export function formatNIK(nik: string | undefined | null): string {
  if (!nik) return '-'
  return String(nik)
}

export function getInisial(nama: string | undefined | null): string {
  if (!nama) return '?'
  const parts = nama.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function getUmur(tanggalLahir: string | undefined | null): number | null {
  if (!tanggalLahir) return null
  // Parse manual dari YYYY-MM-DD untuk hindari timezone issue
  const m = tanggalLahir.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const today = new Date()
  const tyear = today.getFullYear()
  const tmonth = today.getMonth() + 1
  const tday = today.getDate()
  const byear = parseInt(m[1], 10)
  const bmonth = parseInt(m[2], 10)
  const bday = parseInt(m[3], 10)
  let age = tyear - byear
  if (tmonth < bmonth || (tmonth === bmonth && tday < bday)) age--
  return age
}

export const APP_VERSION = 'v2.0.0'
export const APP_NAME = 'DaPenDig Next'
export const APP_TAGLINE = 'Data Penduduk Digital'
export const DESA_DEFAULT = 'Karang Sengon'

/**
 * Parse tanggal dari berbagai format ke Date object.
 * Support: YYYY-MM-DD (ISO) dan DD/MM/YYYY (format ekspor/SIAK)
 */
export function parseDate(str: string | null | undefined): Date | null {
  if (!str) return null
  const s = str.trim()
  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00')
    return isNaN(d.getTime()) ? null : d
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/')
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

/**
 * Konversi string tanggal (format apapun) ke YYYY-MM-DD untuk disimpan ke Firestore.
 *
 * FIX: Dulu pakai d.toISOString().slice(0,10) yang convert ke UTC terlebih dulu.
 * Di WIB (UTC+7), 2000-01-30 00:00 lokal = 2000-01-29 17:00 UTC
 * → toISOString() = '2000-01-29T17:00:00Z' → slice '2000-01-29' (SALAH -1 hari)
 * → Jika data di-save berkali-kali, tanggal bisa geser -2, -3, dst.
 *
 * Sekarang: konversi string secara langsung tanpa melewati Date object.
 */
export function toISODate(str: string | null | undefined): string {
  if (!str) return ''
  const s = str.trim()
  // Sudah format ISO YYYY-MM-DD — kembalikan langsung tanpa lewat Date object
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // DD/MM/YYYY atau D/M/YYYY — konversi string langsung
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/')
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  return str  // kembalikan apa adanya jika format tidak dikenali
}

/**
 * Hitung umur dari string tanggal (support DD/MM/YYYY dan YYYY-MM-DD)
 */
export function hitungUmurFromStr(tanggal: string | null | undefined): number {
  if (!tanggal) return -1
  // Coba parse YYYY-MM-DD langsung (timezone-safe)
  const m = tanggal.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const now = new Date()
    let age = now.getFullYear() - parseInt(m[1], 10)
    const bmonth = parseInt(m[2], 10)
    const bday = parseInt(m[3], 10)
    if (now.getMonth() + 1 < bmonth || (now.getMonth() + 1 === bmonth && now.getDate() < bday)) age--
    return age
  }
  // Fallback untuk format DD/MM/YYYY
  const lahir = parseDate(tanggal)
  if (!lahir) return -1
  const now = new Date()
  let age = now.getFullYear() - lahir.getFullYear()
  const mo = now.getMonth() - lahir.getMonth()
  if (mo < 0 || (mo === 0 && now.getDate() < lahir.getDate())) age--
  return age
}
