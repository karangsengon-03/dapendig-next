import { describe, it, expect } from 'vitest'
import { rt3, rtRw, opsiRt } from '@/lib/rt-rw'

describe('rt3', () => {
  it('angka 1–2 digit dijadikan 3 digit', () => {
    expect(rt3('1')).toBe('001')
    expect(rt3('01')).toBe('001')
    expect(rt3('11')).toBe('011')
    expect(rt3(3)).toBe('003')
  })
  it('sudah 3 digit tetap; nol berlebih dirapikan', () => {
    expect(rt3('003')).toBe('003')
    expect(rt3('0004')).toBe('004')
    expect(rt3(' 007 ')).toBe('007')
  })
  it('bukan angka dikembalikan apa adanya; kosong menjadi ""', () => {
    expect(rt3('Lain-lain')).toBe('Lain-lain')
    expect(rt3('')).toBe('')
    expect(rt3(undefined)).toBe('')
    expect(rt3(null)).toBe('')
  })
})

describe('rtRw', () => {
  it('menggabungkan RT/RW 3 digit', () => {
    expect(rtRw('3', '1')).toBe('003/001')
    expect(rtRw('003', '001')).toBe('003/001')
  })
  it('bagian kosong ditulis "—"', () => {
    expect(rtRw('', '1')).toBe('—/001')
    expect(rtRw('2', undefined)).toBe('002/—')
  })
})

describe('opsiRt', () => {
  const DAFTAR = ['001', '002', '003']
  it('daftar tidak berubah bila nilai ada di daftar (juga bila tersimpan tanpa nol di depan)', () => {
    expect(opsiRt(DAFTAR, '002')).toEqual(DAFTAR)
    expect(opsiRt(DAFTAR, '2')).toEqual(DAFTAR)
  })
  it('nilai di luar daftar ditambahkan di depan agar editor tidak kosong', () => {
    expect(opsiRt(DAFTAR, '012')).toEqual(['012', '001', '002', '003'])
  })
  it('nilai kosong tidak menambah pilihan', () => {
    expect(opsiRt(DAFTAR, '')).toEqual(DAFTAR)
    expect(opsiRt(DAFTAR, undefined)).toEqual(DAFTAR)
  })
})

import { labelRtRw, rt3Sah } from '@/lib/rt-rw'
describe('RT/RW belum diisi tidak tampil sebagai "RT 000/RW 000"', () => {
  it('rt3Sah: "000", "0", kosong → ""', () => {
    for (const v of ['000', '0', '', '  ', null, undefined, 0]) expect(rt3Sah(v as never)).toBe('')
    expect(rt3Sah('1')).toBe('001')
    expect(rt3Sah('Lain-lain')).toBe('Lain-lain')
  })
  it('labelRtRw', () => {
    expect(labelRtRw('1', '01')).toBe('RT 001/RW 001')
    expect(labelRtRw('000', '000')).toBe('RT —/RW —')
    expect(labelRtRw('', '2')).toBe('RT —/RW 002')
  })
})
