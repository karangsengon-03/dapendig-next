import { describe, it, expect } from 'vitest'
import { angka16, PANJANG_NOMOR } from '@/lib/angka'

describe('angka16', () => {
  it('membuang huruf dan simbol', () => {
    expect(angka16('35ab11x40 1')).toBe('3511401')
    expect(angka16('abc')).toBe('')
    expect(angka16('')).toBe('')
  })
  it('nomor yang ditempel dengan spasi, titik, atau strip tetap utuh 16 digit', () => {
    expect(angka16('3511 0300 0000 1826')).toBe('3511030000001826')
    expect(angka16('3511-0300-0000-1826')).toBe('3511030000001826')
    expect(angka16('3511.0300.0000.1826')).toBe('3511030000001826')
    expect(angka16(' 3511030000001826 ')).toBe('3511030000001826')
  })
  it('dipotong di 16 digit (digit berlebih dibuang, bukan huruf/spasinya yang menghabiskan batas)', () => {
    expect(angka16('35110300000018261234')).toBe('3511030000001826')
    expect(angka16('3511 0300 0000 1826 99')).toBe('3511030000001826')
    expect(PANJANG_NOMOR).toBe(16)
  })
  it('nomor yang belum lengkap dibiarkan apa adanya', () => {
    expect(angka16('3511')).toBe('3511')
  })
  it('angka nol di depan dipertahankan (NIK/KK adalah teks, bukan bilangan)', () => {
    expect(angka16('0012')).toBe('0012')
  })
})
