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
