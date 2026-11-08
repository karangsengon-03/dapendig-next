import { describe, it, expect, vi } from 'vitest'

// useImport.ts mengimpor firebase/store di level modul; yang diuji di sini hanya fungsi murni normImportVal.
vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({}) }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), addDoc: vi.fn(), setDoc: vi.fn(), doc: vi.fn(), serverTimestamp: vi.fn(),
}))

import { normImportVal } from '@/hooks/useImport'

describe('normImportVal — RT/RW selalu 3 digit saat impor Excel', () => {
  for (const kunci of ['rt', 'rw'] as const) {
    describe(`kolom ${kunci}`, () => {
      it.each([
        ['1', '001'],
        ['01', '001'],
        ['001', '001'],
        ['3', '003'],
        ['0004', '004'],
        ['  12 ', '012'],
        ['Lain-lain', 'Lain-lain'], // bukan angka → apa adanya
        ['', ''],
        ['   ', ''],
      ])('"%s" → "%s"', (masuk, keluar) => {
        expect(normImportVal(kunci, masuk)).toBe(keluar)
      })
      it('angka murni dari sel Excel (bukan teks) dan nilai kosong', () => {
        expect(normImportVal(kunci, 1)).toBe('001')
        expect(normImportVal(kunci, 7)).toBe('007')
        expect(normImportVal(kunci, null)).toBe('')
        expect(normImportVal(kunci, undefined)).toBe('')
      })
    })
  }
})

describe('normImportVal — cabang lain tidak ikut berubah', () => {
  it('status kosong = aktif; kolom id tidak diubah', () => {
    expect(normImportVal('status', '')).toBe('aktif')
    expect(normImportVal('status', 'nonaktif')).toBe('nonaktif')
    expect(normImportVal('id', ' abc ')).toBe('abc')
  })
  it('jenis kelamin dan hubungan keluarga dibakukan', () => {
    expect(normImportVal('jenis_kelamin', 'l')).toBe('Laki-laki')
    expect(normImportVal('jenis_kelamin', 'PR')).toBe('Perempuan')
    expect(normImportVal('hubungan_keluarga', 'kk')).toBe('Kepala Keluarga')
    expect(normImportVal('hubungan_keluarga', 'ibu')).toBe('Orang Tua')
  })
  it('pendidikan dibakukan ke nama resmi', () => {
    expect(normImportVal('pendidikan', 'S1')).toBe('Diploma IV/Strata I')
    expect(normImportVal('pendidikan', 'sltp')).toBe('SMP/Sederajat')
  })
  it('kolom di luar daftar dikembalikan sebagai teks yang dipangkas', () => {
    expect(normImportVal('nama', '  Budi ')).toBe('Budi')
  })
})
