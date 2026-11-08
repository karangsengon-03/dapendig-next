import { describe, it, expect } from 'vitest'
import { KATEGORI_UMUR, KLASIFIKASI_UMUR, klasifikasiDariUmur, klasifikasiSah, cocokKlasifikasi, labelKlasifikasi, labelNamaKlasifikasi, cocokRentangUmur, kunciRentang, kunciRentangSah, labelKunciRentang, labelRentang, uraiRentang, umurDari } from '@/lib/umur'

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

describe('klasifikasi umur (Balita, Anak-anak, Remaja, Dewasa, Pra-lansia, Lansia)', () => {
  it('batas tiap klasifikasi (inklusif) dan tidak ada celah/tumpang tindih', () => {
    const peta: Record<number, string> = { 0: 'Balita', 5: 'Balita', 6: 'Anak-anak', 10: 'Anak-anak', 11: 'Remaja', 19: 'Remaja', 20: 'Dewasa', 44: 'Dewasa', 45: 'Pra-lansia', 59: 'Pra-lansia', 60: 'Lansia', 120: 'Lansia' }
    for (const [umur, nama] of Object.entries(peta)) expect(klasifikasiDariUmur(Number(umur))?.label).toBe(nama)
    for (let u = 0; u <= 120; u++) expect(KLASIFIKASI_UMUR.filter((k) => u >= k.min && u <= k.max)).toHaveLength(1)
    expect(klasifikasiDariUmur(-1)).toBeUndefined()
  })
  it('label tampil menyertakan rentang agar tidak ambigu dengan kelompok umur Beranda', () => {
    expect(labelKlasifikasi(KLASIFIKASI_UMUR[0])).toBe('Balita (0–5 th)')
    expect(labelNamaKlasifikasi('Pra-lansia')).toBe('Pra-lansia (45–59 th)')
    expect(labelNamaKlasifikasi('Lansia')).toBe('Lansia (60+ th)')
    expect(labelNamaKlasifikasi('Tidak ada')).toBe('Tidak ada')
  })
  it('nama dari URL: hanya yang dikenal diterima; yang tidak dikenal tidak menyaring', () => {
    expect(klasifikasiSah('Remaja')).toBe('Remaja')
    expect(klasifikasiSah('remaja')).toBe('')
    expect(klasifikasiSah(null)).toBe('')
    expect(cocokKlasifikasi('2000-01-01', 'Tidak ada')).toBe(true)
  })
  it('cocokKlasifikasi memakai umur yang sama dengan Monografi; tanggal kosong/rusak tidak masuk mana pun', () => {
    const lahir = (u: number) => { const d = new Date(); d.setFullYear(d.getFullYear() - u); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) }
    expect(cocokKlasifikasi(lahir(5), 'Balita')).toBe(true)
    expect(cocokKlasifikasi(lahir(6), 'Balita')).toBe(false)
    expect(cocokKlasifikasi(lahir(6), 'Anak-anak')).toBe(true)
    expect(cocokKlasifikasi(lahir(50), 'Pra-lansia')).toBe(true)
    expect(cocokKlasifikasi(lahir(50), 'Lansia')).toBe(false)
    expect(cocokKlasifikasi(lahir(60), 'Lansia')).toBe(true)
    expect(cocokKlasifikasi(lahir(59), 'Lansia')).toBe(false)
    for (const k of KLASIFIKASI_UMUR) { expect(cocokKlasifikasi('', k.label)).toBe(false); expect(cocokKlasifikasi('rusak', k.label)).toBe(false) }
  })
})
