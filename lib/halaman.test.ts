import { describe, it, expect } from 'vitest'
import { UKURAN_HALAMAN, jumlahHalaman, klemHalaman, potongHalaman } from '@/lib/halaman'

const daftar = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('halaman', () => {
  it('ukuran bawaan 25 baris', () => expect(UKURAN_HALAMAN).toBe(25))

  it('jumlahHalaman: pembulatan ke atas, minimal 1', () => {
    expect(jumlahHalaman(0)).toBe(1)
    expect(jumlahHalaman(1)).toBe(1)
    expect(jumlahHalaman(25)).toBe(1)
    expect(jumlahHalaman(26)).toBe(2)
    expect(jumlahHalaman(50)).toBe(2)
    expect(jumlahHalaman(51)).toBe(3)
    expect(jumlahHalaman(-5)).toBe(1)
  })

  it('potongHalaman: halaman penuh, sisa, dan tanpa tumpang tindih', () => {
    const d = daftar(60)
    expect(potongHalaman(d, 1)).toEqual(daftar(25))
    expect(potongHalaman(d, 2)[0]).toBe(26)
    expect(potongHalaman(d, 2)).toHaveLength(25)
    expect(potongHalaman(d, 3)).toEqual([51, 52, 53, 54, 55, 56, 57, 58, 59, 60])
  })

  it('daftar pendek → semua baris pada halaman 1', () => {
    expect(potongHalaman(daftar(7), 1)).toEqual(daftar(7))
    expect(potongHalaman([], 1)).toEqual([])
  })

  it('halaman di luar rentang dikoreksi (daftar memendek setelah disaring)', () => {
    expect(klemHalaman(5, 30)).toBe(2)
    expect(klemHalaman(0, 30)).toBe(1)
    expect(klemHalaman(-3, 30)).toBe(1)
    expect(klemHalaman(NaN, 30)).toBe(1)
    expect(klemHalaman(3, 0)).toBe(1)
    expect(potongHalaman(daftar(30), 9)).toEqual([26, 27, 28, 29, 30])
  })

  it('ukuran kustom', () => {
    expect(potongHalaman(daftar(10), 2, 4)).toEqual([5, 6, 7, 8])
    expect(jumlahHalaman(10, 4)).toBe(3)
  })
})
