/**
 * visual.ts — satu sumber kebenaran ikon dan warna untuk konsep yang tampil di banyak menu.
 * Semua tempat (Beranda, Mutasi, Kelahiran & Kematian, Detail penduduk, filter, form, Monografi) wajib memakai ini
 * supaya satu konsep selalu berikon dan berwarna sama. `lib/visual.test.ts` menjaga ini lewat pemindaian sumber.
 *
 *  Peristiwa : Kelahiran = Baby (hijau) · Pindah masuk = ArrowLeftFromLine (hijau, sama-sama menambah penduduk)
 *              Kematian = HeartCrack (abu-abu) · Pindah keluar = ArrowRightFromLine (merah)
 *  Catatan   : LogOut/LogIn HANYA untuk masuk/keluar akun, bukan untuk pindah; HeartPulse hanya untuk menu
 *              gabungan "Kelahiran & Kematian".
 *  Jenis kelamin : Laki-laki = Mars, warna --lk (biru) · Perempuan = Venus, warna --pr (merah muda) · campuran = VenusAndMars
 */
import { ArrowLeftFromLine, ArrowRightFromLine, Baby, HeartCrack, Mars, Venus, type LucideIcon } from 'lucide-react'

export type NadaPeristiwa = 'ok' | 'mute' | 'bad'

export const PERISTIWA: Record<'kelahiran' | 'kematian' | 'pindah_keluar' | 'pindah_masuk', { Icon: LucideIcon; nada: NadaPeristiwa }> = {
  kelahiran: { Icon: Baby, nada: 'ok' },
  kematian: { Icon: HeartCrack, nada: 'mute' },
  pindah_keluar: { Icon: ArrowRightFromLine, nada: 'bad' },
  pindah_masuk: { Icon: ArrowLeftFromLine, nada: 'ok' },
}

export const JK_VISUAL: Record<'L' | 'P', { Icon: LucideIcon; kelas: 'lk' | 'pr'; label: string }> = {
  L: { Icon: Mars, kelas: 'lk', label: 'Laki-laki' },
  P: { Icon: Venus, kelas: 'pr', label: 'Perempuan' },
}

/** 'L' / 'Laki-laki' → 'L'; 'P' / 'Perempuan' → 'P'; selain itu null. */
export function jkKunci(jk: string | null | undefined): 'L' | 'P' | null {
  const j = (jk ?? '').trim().toLowerCase()
  if (j === 'l' || j.startsWith('laki')) return 'L'
  if (j === 'p' || j.startsWith('perempuan')) return 'P'
  return null
}
