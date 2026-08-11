import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseDate, hitungUmur, formatTanggalLahir, normalisasiTanggal } from '@/lib/dateUtils'

describe('parseDate', () => {
  it('parse format YYYY-MM-DD (standar Firestore)', () => {
    const d = parseDate('1990-01-17')
    expect(d?.getFullYear()).toBe(1990)
    expect(d?.getMonth()).toBe(0) // Januari = index 0
    expect(d?.getDate()).toBe(17)
  })

  it('parse format DD/MM/YYYY (legacy import Excel)', () => {
    const d = parseDate('17/01/1990')
    expect(d?.getFullYear()).toBe(1990)
    expect(d?.getMonth()).toBe(0)
    expect(d?.getDate()).toBe(17)
  })

  it('parse format D/M/YYYY tanpa leading zero', () => {
    const d = parseDate('1/9/1948')
    expect(d?.getFullYear()).toBe(1948)
    expect(d?.getMonth()).toBe(8) // September = index 8
    expect(d?.getDate()).toBe(1)
  })

  it('return null untuk string kosong', () => {
    expect(parseDate('')).toBeNull()
  })

  it('return null untuk format yang tidak dikenali', () => {
    expect(parseDate('bukan tanggal')).toBeNull()
    expect(parseDate('1990/01/17')).toBeNull() // slash tapi urutan salah
  })

  it('return null untuk tanggal yang secara kalender tidak valid', () => {
    expect(parseDate('2023-02-30')).toBeNull() // 30 Februari tidak ada
  })

  it('tidak bergeser timezone — selalu parse sebagai local midnight, bukan UTC', () => {
    // Ini regression test untuk kelas bug timezone-shift yang disebutkan
    // di komentar file: T00:00:00 tanpa Z memastikan Date diparse sebagai
    // waktu LOKAL, bukan dikonversi dari UTC (yang bisa mundur 1 hari di WIB).
    const d = parseDate('2000-06-15')
    expect(d?.getDate()).toBe(15)
    expect(d?.getMonth()).toBe(5)
  })
})

describe('hitungUmur', () => {
  const REAL_DATE = new Date('2026-08-10T12:00:00')

  afterEach(() => {
    vi.useRealTimers()
  })

  it('menghitung umur dengan benar untuk ulang tahun yang SUDAH lewat tahun ini', () => {
    vi.useFakeTimers()
    vi.setSystemTime(REAL_DATE)
    // Lahir 1 Januari — ulang tahun bulan ini sudah lewat jauh
    expect(hitungUmur('2000-01-01')).toBe(26)
  })

  it('menghitung umur dengan benar untuk ulang tahun yang BELUM sampai tahun ini', () => {
    vi.useFakeTimers()
    vi.setSystemTime(REAL_DATE)
    // Lahir 25 Desember — ulang tahun belum sampai, umur harus -1 dari selisih tahun naif
    expect(hitungUmur('2000-12-25')).toBe(25)
  })

  it('edge case: TEPAT hari ulang tahun — sudah bertambah umur di hari itu juga', () => {
    vi.useFakeTimers()
    vi.setSystemTime(REAL_DATE) // 10 Agustus 2026
    expect(hitungUmur('2000-08-10')).toBe(26)
  })

  it('edge case: SEHARI SEBELUM ulang tahun — belum bertambah umur', () => {
    vi.useFakeTimers()
    vi.setSystemTime(REAL_DATE) // 10 Agustus 2026
    expect(hitungUmur('2000-08-11')).toBe(25)
  })

  it('return -1 untuk tanggal lahir yang tidak valid/kosong', () => {
    expect(hitungUmur('')).toBe(-1)
    expect(hitungUmur('data-rusak')).toBe(-1)
  })
})

describe('formatTanggalLahir — regression test untuk fix zero-padding', () => {
  it('tanggal 1-9 HARUS tampil dengan leading zero (01-09), bukan single digit', () => {
    // Ini persis kasus dari screenshot Bapak: RUS, lahir 1 September 1948
    expect(formatTanggalLahir('1948-09-01')).toBe('01 September 1948')
    expect(formatTanggalLahir('2000-01-05')).toBe('05 Januari 2000')
    expect(formatTanggalLahir('1999-12-09')).toBe('09 Desember 1999')
  })

  it('tanggal 10-31 tetap tampil normal (2 digit natural)', () => {
    expect(formatTanggalLahir('1990-01-17')).toBe('17 Januari 1990')
    expect(formatTanggalLahir('1985-06-30')).toBe('30 Juni 1985')
  })

  it('konsisten untuk format input DD/MM/YYYY legacy juga', () => {
    expect(formatTanggalLahir('01/09/1948')).toBe('01 September 1948')
  })

  it('fallback ke string asli atau em-dash untuk input tak valid', () => {
    expect(formatTanggalLahir('')).toBe('—')
    expect(formatTanggalLahir('rusak')).toBe('rusak')
  })
})

describe('normalisasiTanggal', () => {
  it('membiarkan format YYYY-MM-DD yang sudah benar', () => {
    expect(normalisasiTanggal('1990-01-17')).toBe('1990-01-17')
  })

  it('mengonversi DD/MM/YYYY ke YYYY-MM-DD dengan zero-padding', () => {
    expect(normalisasiTanggal('1/9/1948')).toBe('1948-09-01')
    expect(normalisasiTanggal('17/1/1990')).toBe('1990-01-17')
  })

  it('membiarkan string kosong apa adanya', () => {
    expect(normalisasiTanggal('')).toBe('')
  })
})
