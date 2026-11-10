import { describe, it, expect } from 'vitest'
import { DUSUN_BAWAAN, RW_BAWAAN, daftarRt, dusunDariRt, normalisasiDusun, normalisasiRw, validasiDusun, validasiRw } from './dusun'

describe('DUSUN_BAWAAN', () => {
  it('gabungan RT bawaan = RT resmi Desa Karang Sengon (001–011) dan setiap RT hanya di satu dusun', () => {
    expect(daftarRt(DUSUN_BAWAAN)).toEqual(['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011'])
    expect(validasiDusun(DUSUN_BAWAAN).ada).toBe(false)
  })
  it('pemetaan sama dengan yang dulu tertulis tetap di dashboard (RT 007 masuk Pesanggrahan)', () => {
    expect(dusunDariRt('001', DUSUN_BAWAAN)).toBe('Pesanggrahan')
    expect(dusunDariRt('007', DUSUN_BAWAAN)).toBe('Pesanggrahan')
    expect(dusunDariRt('005', DUSUN_BAWAAN)).toBe('Paleran')
    expect(dusunDariRt('009', DUSUN_BAWAAN)).toBe('Sumber')
    expect(dusunDariRt('011', DUSUN_BAWAAN)).toBe('Blangguan')
  })
})

describe('dusunDariRt', () => {
  it('RT 1 / "01" / 1 sama dengan "001"', () => {
    expect(dusunDariRt('1', DUSUN_BAWAAN)).toBe('Pesanggrahan')
    expect(dusunDariRt('04', DUSUN_BAWAAN)).toBe('Paleran')
    expect(dusunDariRt(8, DUSUN_BAWAAN)).toBe('Sumber')
  })
  it('RT kosong atau di luar daftar → ""', () => {
    expect(dusunDariRt('', DUSUN_BAWAAN)).toBe('')
    expect(dusunDariRt(undefined, DUSUN_BAWAAN)).toBe('')
    expect(dusunDariRt('099', DUSUN_BAWAAN)).toBe('')
  })
})

describe('daftarRt', () => {
  it('gabungan unik dan terurut numerik (bukan urutan abjad)', () => {
    expect(daftarRt([{ nama: 'A', rt: ['010', '002'] }, { nama: 'B', rt: ['001', '2'] }])).toEqual(['001', '002', '010'])
  })
})

describe('normalisasiDusun', () => {
  it('memangkas nama, memberi 3 digit pada RT, membuang duplikat, mengurutkan', () => {
    expect(normalisasiDusun([{ nama: '  Krajan ', rt: ['3', '001', '1', 2] }])).toEqual([{ nama: 'Krajan', rt: ['001', '002', '003'] }])
  })
  it('bentuk tidak valid atau kosong → null', () => {
    expect(normalisasiDusun(undefined)).toBeNull()
    expect(normalisasiDusun([])).toBeNull()
    expect(normalisasiDusun([{ nama: 5, rt: [] }])).toBeNull()
    expect(normalisasiDusun([{ nama: 'A' }])).toBeNull()
    expect(normalisasiDusun(['x'])).toBeNull()
  })
})

describe('validasiDusun', () => {
  it('daftar kosong ditolak', () => {
    const g = validasiDusun([])
    expect(g.ada).toBe(true)
    expect(g.umum).toMatch(/Minimal/)
  })
  it('nama kosong dan nama ganda (tanpa membedakan huruf besar/kecil)', () => {
    const g = validasiDusun([{ nama: ' ', rt: ['001'] }, { nama: 'Krajan', rt: ['002'] }, { nama: 'KRAJAN', rt: ['003'] }])
    expect(g.baris[0].nama).toBe('Nama dusun wajib diisi')
    expect(g.baris[1].nama).toBeUndefined()
    expect(g.baris[2].nama).toBe('Nama dusun sudah dipakai dusun lain')
  })
  it('dusun tanpa RT ditolak', () => {
    expect(validasiDusun([{ nama: 'A', rt: [] }]).baris[0].rt).toBe('Pilih minimal satu RT')
  })
  it('satu RT di dua dusun ditolak dan menyebut dusun pemiliknya', () => {
    const g = validasiDusun([{ nama: 'A', rt: ['001', '002'] }, { nama: 'B', rt: ['002'] }])
    expect(g.baris[0].rt).toBeUndefined()
    expect(g.baris[1].rt).toBe('RT 002 sudah ada di dusun A')
    expect(g.ada).toBe(true)
  })
  it('RT bukan angka ditolak; RT 000 dan 020 sah', () => {
    expect(validasiDusun([{ nama: 'A', rt: ['abc'] }]).baris[0].rt).toMatch(/tidak valid/)
    expect(validasiDusun([{ nama: 'A', rt: ['000', '020'] }]).ada).toBe(false)
    expect(validasiDusun([{ nama: 'A', rt: ['1000'] }]).baris[0].rt).toMatch(/tidak valid/)
  })
  it('RT tidak harus berurutan', () => {
    expect(validasiDusun([{ nama: 'A', rt: ['001', '007'] }, { nama: 'B', rt: ['002'] }]).ada).toBe(false)
  })
})

describe('RW', () => {
  it('RW_BAWAAN = 001–005 (daftar RW lama)', () => {
    expect(RW_BAWAAN).toEqual(['001', '002', '003', '004', '005'])
    expect(validasiRw(RW_BAWAAN)).toBeUndefined()
  })
  it('normalisasiRw: 3 digit, unik, terurut; kosong/bukan daftar → null', () => {
    expect(normalisasiRw(['3', '001', '1', 2])).toEqual(['001', '002', '003'])
    expect(normalisasiRw([])).toBeNull()
    expect(normalisasiRw(undefined)).toBeNull()
    expect(normalisasiRw('001')).toBeNull()
  })
  it('validasiRw: kosong, bukan angka, lebih dari 3 digit ditolak; 000 sah', () => {
    expect(validasiRw([])).toMatch(/Minimal/)
    expect(validasiRw(['abc'])).toMatch(/tidak valid/)
    expect(validasiRw(['000', '001'])).toBeUndefined()
    expect(validasiRw(['1234'])).toMatch(/tidak valid/)
    expect(validasiRw(['001', '010'])).toBeUndefined()
  })
})
