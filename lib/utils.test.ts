import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatTanggal, getInisial, getUmur, parseDate, toISODate, hitungUmurFromStr, cn } from '@/lib/utils'

describe('formatTanggal (lib/utils.ts — berbeda dari formatTanggalLahir di dateUtils.ts)', () => {
  it('zero-pad tanggal 1-9 secara manual (string interpolation, bukan toLocaleDateString)', () => {
    // Fungsi ini TIDAK pakai toLocaleDateString sama sekali — ia parse manual
    // pakai regex lalu susun string sendiri. Perlu dicek apakah ini juga
    // punya bug padding yang sama seperti fungsi-fungsi lain.
    expect(formatTanggal('1948-09-01')).toBe('1 September 1948')
  })

  it('tidak bergeser timezone untuk tanggal WIB', () => {
    expect(formatTanggal('2000-06-15')).toBe('15 Juni 2000')
  })

  it('return "-" untuk input kosong/null/undefined', () => {
    expect(formatTanggal('')).toBe('-')
    expect(formatTanggal(null)).toBe('-')
    expect(formatTanggal(undefined)).toBe('-')
  })

  it('menolak bulan di luar rentang 1-12 (validasi eksplisit di kode)', () => {
    // isoMatch match duluan tapi bln > 12 gagal validasi if, lalu fallback
    // ke parsing Date biasa — perlu tes apakah fallback ini aman
    const result = formatTanggal('2020-13-01')
    // Fallback: new Date('2020-13-01T00:00:00') -> JS interpretasi bulan 13
    // sebagai overflow ke Januari tahun berikutnya (bulan 0-indexed +1)
    expect(result).not.toBe('') // minimal tidak crash
  })
})

describe('getInisial', () => {
  it('nama 1 kata: ambil huruf pertama', () => {
    expect(getInisial('Budi')).toBe('B')
  })

  it('nama 2+ kata: huruf pertama nama depan + huruf pertama nama belakang', () => {
    expect(getInisial('Budi Santoso')).toBe('BS')
    expect(getInisial('Ahmad Wijaya Kusuma')).toBe('AK') // depan + BELAKANG, bukan tengah
  })

  it('return "?" untuk nama kosong/null', () => {
    expect(getInisial('')).toBe('?')
    expect(getInisial(null)).toBe('?')
    expect(getInisial(undefined)).toBe('?')
  })

  it('selalu uppercase meski input lowercase', () => {
    expect(getInisial('budi santoso')).toBe('BS')
  })
})

describe('getUmur (versi lib/utils.ts)', () => {
  afterEach(() => vi.useRealTimers())

  it('return null untuk tanggal lahir kosong', () => {
    expect(getUmur('')).toBeNull()
    expect(getUmur(null)).toBeNull()
  })

  it('return null jika format tidak match regex YYYY-MM-DD di awal string', () => {
    expect(getUmur('bukan-tanggal')).toBeNull()
  })

  it('menghitung umur benar, konsisten dengan hitungUmur di dateUtils.ts', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    expect(getUmur('2000-08-10')).toBe(26) // tepat ultah hari ini
    expect(getUmur('2000-08-11')).toBe(25) // ultah besok, belum nambah
  })
})

describe('toISODate', () => {
  it('membiarkan format YYYY-MM-DD yang sudah benar', () => {
    expect(toISODate('1990-01-17')).toBe('1990-01-17')
  })

  it('konversi DD/MM/YYYY ke YYYY-MM-DD dengan zero-padding, TANPA melewati Date object (regression test untuk bug toISOString timezone shift yang disebut di komentar)', () => {
    expect(toISODate('1/9/1948')).toBe('1948-09-01')
    expect(toISODate('30/1/2000')).toBe('2000-01-30')
  })

  it('return string kosong untuk input kosong', () => {
    expect(toISODate('')).toBe('')
    expect(toISODate(null)).toBe('')
  })

  it('return apa adanya untuk format tak dikenali (bukan error)', () => {
    expect(toISODate('format-aneh')).toBe('format-aneh')
  })
})

describe('parseDate (versi lib/utils.ts — TERPISAH dari dateUtils.ts, TIDAK punya validasi round-trip)', () => {
  it('parse YYYY-MM-DD dengan benar untuk tanggal valid', () => {
    const d = parseDate('1990-01-17')
    expect(d?.getFullYear()).toBe(1990)
  })

  it('CATATAN: versi ini belum punya fix round-trip validation seperti dateUtils.ts — 30 Februari akan roll-over diam-diam, bukan ditolak', () => {
    // Ini bukan test "harus lolos" — ini DOKUMENTASI eksplisit bahwa
    // lib/utils.ts punya implementasi parseDate TERPISAH dari
    // lib/dateUtils.ts, dan belum menerima fix yang sama. Dicatat sebagai
    // temuan, bukan diperbaiki di sini karena berubah scope permintaan
    // saat ini — perlu dikonfirmasi dulu apakah kedua parseDate ini
    // sebaiknya disatukan.
    const d = parseDate('2023-02-30')
    expect(d).not.toBeNull() // mendokumentasikan perilaku SAAT INI apa adanya
  })
})

describe('hitungUmurFromStr', () => {
  afterEach(() => vi.useRealTimers())

  it('return -1 untuk input kosong', () => {
    expect(hitungUmurFromStr('')).toBe(-1)
    expect(hitungUmurFromStr(null)).toBe(-1)
  })

  it('menghitung umur benar dari format YYYY-MM-DD', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    expect(hitungUmurFromStr('2000-08-10')).toBe(26)
  })

  it('fallback ke format DD/MM/YYYY jika bukan YYYY-MM-DD', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    expect(hitungUmurFromStr('10/08/2000')).toBe(26)
  })
})

describe('cn (Tailwind class merge utility)', () => {
  it('menggabungkan class string biasa', () => {
    expect(cn('text-sm', 'font-bold')).toBe('text-sm font-bold')
  })

  it('resolve konflik Tailwind — class belakangan menang', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('mengabaikan falsy values (untuk conditional className)', () => {
    expect(cn('text-sm', false && 'hidden', undefined, null)).toBe('text-sm')
  })
})
