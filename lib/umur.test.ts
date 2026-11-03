import { describe, it, expect } from 'vitest'
import { KATEGORI_UMUR, cocokRentangUmur, kunciRentang, kunciRentangSah, labelKunciRentang, labelRentang, uraiRentang, umurDari } from '@/lib/umur'

describe('lib/umur', () => {
  it('label dan kunci rentang', () => {
    expect(labelRentang(0, 4)).toBe('0–4 th')
    expect(labelRentang(60, 999)).toBe('60+ th')
    expect(kunciRentang(5, 14)).toBe('5-14')
    expect(kunciRentang(60, 5000)).toBe('60-999')
    expect(labelKunciRentang('0-4')).toBe('Umur 0–4 th')
    expect(labelKunciRentang('45-999')).toBe('Umur 45+ th')
  })
  it('kunci tidak sah diabaikan (URL diketik sembarang)', () => {
    expect(uraiRentang('10-5')).toBeNull()
    expect(uraiRentang('abc')).toBeNull()
    expect(uraiRentang('')).toBeNull()
    expect(kunciRentangSah('x-y')).toBe('')
    expect(kunciRentangSah('6-10')).toBe('6-10')
    expect(cocokRentangUmur('2000-01-01', 'abc')).toBe(true)
  })
  it('tanggal lahir kosong/rusak tidak masuk rentang mana pun (sama dengan angka Beranda)', () => {
    expect(umurDari('')).toBe(-1)
    expect(umurDari(null)).toBe(-1)
    expect(umurDari('data-rusak')).toBe(-1)
    for (const k of KATEGORI_UMUR) expect(cocokRentangUmur('', kunciRentang(k.min, k.max))).toBe(false)
    expect(cocokRentangUmur('data-rusak', '0-4')).toBe(false)
  })
  it('batas rentang termasuk (inklusif) dan kategori Beranda saling lepas', () => {
    const lahir = (u: number) => { const d = new Date(); d.setFullYear(d.getFullYear() - u); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) }
    expect(cocokRentangUmur(lahir(4), '0-4')).toBe(true)
    expect(cocokRentangUmur(lahir(5), '0-4')).toBe(false)
    expect(cocokRentangUmur(lahir(5), '5-14')).toBe(true)
    expect(cocokRentangUmur(lahir(90), '60-999')).toBe(true)
    for (const u of [0, 4, 5, 14, 15, 24, 25, 59, 60, 90]) {
      const cocok = KATEGORI_UMUR.filter((k) => cocokRentangUmur(lahir(u), kunciRentang(k.min, k.max)))
      expect(cocok).toHaveLength(1)
    }
  })
})
