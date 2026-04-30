import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTanggal(tanggal: string | undefined | null): string {
  if (!tanggal) return '-'
  const bulan = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const d = new Date(tanggal)
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
  const today = new Date()
  const birth = new Date(tanggalLahir)
  if (isNaN(birth.getTime())) return null
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
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
 */
export function toISODate(str: string | null | undefined): string {
  if (!str) return ''
  const d = parseDate(str)
  if (!d) return str  // kembalikan apa adanya jika tidak bisa di-parse
  return d.toISOString().slice(0, 10)
}

/**
 * Hitung umur dari string tanggal (support DD/MM/YYYY dan YYYY-MM-DD)
 */
export function hitungUmurFromStr(tanggal: string | null | undefined): number {
  const lahir = parseDate(tanggal)
  if (!lahir) return -1
  const now = new Date()
  let age = now.getFullYear() - lahir.getFullYear()
  const m = now.getMonth() - lahir.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < lahir.getDate())) age--
  return age
}
