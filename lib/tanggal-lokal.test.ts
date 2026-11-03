import { describe, it, expect, vi, afterEach } from 'vitest'
import { selisihHari, hariIni, formatTanggalLokal, bulanTahunDariString, cocokBulan } from '@/lib/tanggal-lokal'

const TZ_ASAL = process.env.TZ
afterEach(() => {
  vi.useRealTimers()
  if (TZ_ASAL === undefined) delete process.env.TZ
  else process.env.TZ = TZ_ASAL
})

/** Tanggal yang DIHASILKAN KODE LAMA (UTC): dipakai untuk menunjukkan bahwa ia memang salah di zona tertentu. */
const tanggalUtcLama = (d: Date) => d.toISOString().slice(0, 10)

describe('selisihHari', () => {
  it('menghitung selisih hari antar tanggal ISO (positif bila ke lebih akhir)', () => {
    expect(selisihHari('1990-07-14', '1990-07-15')).toBe(1)
    expect(selisihHari('1995-07-03', '1995-07-05')).toBe(2)
    expect(selisihHari('1995-07-05', '1995-07-03')).toBe(-2)
    expect(selisihHari('2025-03-12', '2025-03-12')).toBe(0)
  })

  it('melewati akhir bulan/tahun dan tahun kabisat dengan benar', () => {
    expect(selisihHari('1999-12-31', '2000-01-01')).toBe(1)
    expect(selisihHari('2000-02-28', '2000-03-01')).toBe(2) // 2000 kabisat
    expect(selisihHari('1900-02-28', '1900-03-01')).toBe(1) // 1900 bukan kabisat
  })

  it('format lama DD/MM/YYYY tetap terbaca (bukan NaN)', () => {
    expect(selisihHari('17/09/1990', '1990-09-18')).toBe(1)
  })

  it('tanggal kosong atau tak terbaca → null (bukan NaN)', () => {
    expect(selisihHari('', '1990-09-17')).toBeNull()
    expect(selisihHari('1990-09-17', '')).toBeNull()
    expect(selisihHari('bukan tanggal', '1990-09-17')).toBeNull()
  })
})

describe('hariIni — tanggal LOKAL, bukan UTC', () => {
  it('Asia/Jakarta pukul 06.17 WIB: lokal = 15 Okt, sedangkan ekspresi UTC lama menghasilkan 14 Okt (kemarin)', () => {
    process.env.TZ = 'Asia/Jakarta'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T23:17:00Z')) // = 15 Okt 2026 06:17 WIB
    expect(tanggalUtcLama(new Date())).toBe('2026-10-14')
    expect(hariIni()).toBe('2026-10-15')
  })

  it('Asia/Jakarta pukul 07.00 WIB ke atas: lokal dan UTC sama (tidak ada regresi di siang hari)', () => {
    process.env.TZ = 'Asia/Jakarta'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T05:00:00Z')) // 12.00 WIB
    expect(hariIni()).toBe('2026-10-15')
    expect(tanggalUtcLama(new Date())).toBe('2026-10-15')
  })

  it('America/Los_Angeles malam hari: lokal = 14 Okt, ekspresi UTC lama menghasilkan 15 Okt (besok)', () => {
    process.env.TZ = 'America/Los_Angeles'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T03:00:00Z')) // = 14 Okt 2026 20.00 PDT
    expect(tanggalUtcLama(new Date())).toBe('2026-10-15')
    expect(hariIni()).toBe('2026-10-14')
  })

  it('tepat tengah malam lokal: tanggal baru dimulai pukul 00.00 lokal', () => {
    process.env.TZ = 'Asia/Jakarta'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T16:59:59Z')) // 23.59.59 WIB 14 Okt
    expect(hariIni()).toBe('2026-10-14')
    vi.setSystemTime(new Date('2026-10-14T17:00:00Z')) // 00.00.00 WIB 15 Okt
    expect(hariIni()).toBe('2026-10-15')
  })

  it('formatTanggalLokal memakai komponen lokal dan mengisi nol di depan', () => {
    process.env.TZ = 'Asia/Jakarta'
    expect(formatTanggalLokal(new Date(2026, 0, 5, 3, 4, 5))).toBe('2026-01-05')
  })
})

describe('bulanTahunDariString dan cocokBulan — memotong string, bebas zona waktu', () => {
  it('bulanTahunDariString membaca awalan YYYY-MM-DD', () => {
    expect(bulanTahunDariString('2026-10-01')).toEqual({ bulan: 9, tahun: 2026 })
    expect(bulanTahunDariString('2026-01-31T23:59:59')).toEqual({ bulan: 0, tahun: 2026 })
    expect(bulanTahunDariString(' 2026-12-31 ')).toEqual({ bulan: 11, tahun: 2026 })
  })

  it('format lain atau bulan mustahil → null', () => {
    expect(bulanTahunDariString('')).toBeNull()
    expect(bulanTahunDariString('17/09/1990')).toBeNull()
    expect(bulanTahunDariString('2026-13-01')).toBeNull()
    expect(bulanTahunDariString('2026-00-10')).toBeNull()
  })

  it('America/Los_Angeles: tanggal 1 Okt tetap bulan Oktober (new Date(str) lama bergeser ke 30 Sep)', () => {
    process.env.TZ = 'America/Los_Angeles'
    const lama = (tgl: string, bulan: number, tahun: number) => {
      const d = new Date(tgl) // perilaku kode lama untuk string
      return d.getMonth() === bulan && d.getFullYear() === tahun
    }
    expect(lama('2026-10-01', 9, 2026)).toBe(false) // BUG lama: dihitung September
    expect(lama('2026-10-01', 8, 2026)).toBe(true)
    expect(cocokBulan('2026-10-01', 9, 2026)).toBe(true)
    expect(cocokBulan('2026-10-01', 8, 2026)).toBe(false)
  })

  it('hasil sama di Asia/Jakarta, UTC, dan America/Los_Angeles untuk batas bulan', () => {
    for (const tz of ['Asia/Jakarta', 'UTC', 'America/Los_Angeles']) {
      process.env.TZ = tz
      expect(cocokBulan('2026-01-01', 0, 2026)).toBe(true)
      expect(cocokBulan('2025-12-31', 11, 2025)).toBe(true)
      expect(cocokBulan('2025-12-31', 0, 2026)).toBe(false)
      expect(cocokBulan('2026-10-31', 9, 2026)).toBe(true)
    }
  })

  it('Timestamp Firestore { seconds } dibaca menurut tanggal lokal', () => {
    process.env.TZ = 'Asia/Jakarta'
    const detik = Date.UTC(2026, 9, 31, 20, 0, 0) / 1000 // 31 Okt 20.00 UTC = 1 Nov 03.00 WIB
    expect(cocokBulan({ seconds: detik }, 10, 2026)).toBe(true)
    expect(cocokBulan({ seconds: detik }, 9, 2026)).toBe(false)
  })

  it('nilai kosong atau tipe lain → false', () => {
    expect(cocokBulan(undefined, 9, 2026)).toBe(false)
    expect(cocokBulan('', 9, 2026)).toBe(false)
    expect(cocokBulan(12345, 9, 2026)).toBe(false)
    expect(cocokBulan('bukan tanggal', 9, 2026)).toBe(false)
  })
})
