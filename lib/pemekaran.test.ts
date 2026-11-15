import { describe, expect, it } from 'vitest'
import { keluargaDiRt, rencanaKembalikan, rencanaPemindahan, ringkasItemPindah, validasiPemindahan, type ItemPindah, type PendudukWilayah } from '@/lib/pemekaran'

const P = (id: string, kk: string, nama: string, rt: string | number, rw: string | number, hub = 'Anggota', status = 'aktif'): PendudukWilayah =>
  ({ id, nik: id, no_kk: kk, nama_lengkap: nama, hubungan_keluarga: hub, rt, rw, status })

const DATA = [
  P('1', 'KK1', 'BUDI', '005', '002', 'Kepala Keluarga'),
  P('2', 'KK1', 'SITI', '5', '2', 'Istri'),
  P('3', 'KK2', 'ANI', '005', '003', 'Kepala Keluarga'),
  P('4', 'KK3', 'CATUR', '006', '002', 'Kepala Keluarga'),
  P('5', 'KK4', 'DEWI', '005', '002', 'Kepala Keluarga', 'tidak aktif'),
  P('6', '', 'EKO', '005', '002', 'Kepala Keluarga'),
]

describe('keluargaDiRt', () => {
  it('hanya penduduk aktif di RT itu; "5" = "005"; dikelompokkan per KK dan terurut nama kepala', () => {
    const k = keluargaDiRt(DATA, '005')
    expect(k.map((x) => [x.kepala, x.jumlah, x.rw])).toEqual([['ANI', 1, '003'], ['BUDI', 2, '002'], ['EKO', 1, '002']])
  })
  it('dibatasi satu RW', () => {
    expect(keluargaDiRt(DATA, '005', '002').map((x) => x.kepala)).toEqual(['BUDI', 'EKO'])
  })
})

describe('validasiPemindahan', () => {
  it('RT/RW tujuan harus angka 0–999 dan salah satunya terisi', () => {
    expect(validasiPemindahan({ rtAsal: '005', rwAsal: '', rtTujuan: '', rwTujuan: '' })).toMatch(/Isi RT tujuan/)
    expect(validasiPemindahan({ rtAsal: '005', rwAsal: '', rtTujuan: '1000', rwTujuan: '' })).toMatch(/tidak valid/)
    expect(validasiPemindahan({ rtAsal: '005', rwAsal: '', rtTujuan: 'ab', rwTujuan: '' })).toMatch(/tidak valid/)
    expect(validasiPemindahan({ rtAsal: '', rwAsal: '', rtTujuan: '12', rwTujuan: '' })).toMatch(/RT asal/)
    expect(validasiPemindahan({ rtAsal: '005', rwAsal: '', rtTujuan: '0', rwTujuan: '' })).toBeUndefined()
    expect(validasiPemindahan({ rtAsal: '005', rwAsal: '', rtTujuan: '', rwTujuan: '004' })).toBeUndefined()
  })
})

describe('rencanaPemindahan', () => {
  it('seluruh RT: semua anggota aktif pindah, tidak aktif tidak tersentuh', () => {
    const r = rencanaPemindahan(DATA, { rtAsal: '005', rwAsal: '', keluarga: null, rtTujuan: '012', rwTujuan: '' })
    expect(r.map((i) => i.id)).toEqual(['1', '2', '3', '6'])
    expect(r[0]).toMatchObject({ rtLama: '005', rtBaru: '012', rwLama: '002', rwBaru: '002' })
    expect(ringkasItemPindah(r[0])).toBe('RT 005 → 012')
  })
  it('sebagian: hanya keluarga terpilih, anggota satu KK ikut bersama', () => {
    const r = rencanaPemindahan(DATA, { rtAsal: '005', rwAsal: '', keluarga: new Set(['KK1']), rtTujuan: '012', rwTujuan: '004' })
    expect(r.map((i) => i.id)).toEqual(['1', '2'])
    expect(ringkasItemPindah(r[1])).toBe('RT 005 → 012; RW 002 → 004')
  })
  it('KK kosong dihitung keluarga sendiri (kunci id:<id>)', () => {
    expect(rencanaPemindahan(DATA, { rtAsal: '005', rwAsal: '', keluarga: new Set(['id:6']), rtTujuan: '1', rwTujuan: '' }).map((i) => i.id)).toEqual(['6'])
  })
  it('tujuan sama dengan asal → tidak ada perubahan; RT/RW 000 sah sebagai tujuan', () => {
    expect(rencanaPemindahan(DATA, { rtAsal: '006', rwAsal: '', keluarga: null, rtTujuan: '6', rwTujuan: '' })).toEqual([])
    expect(rencanaPemindahan(DATA, { rtAsal: '006', rwAsal: '', keluarga: null, rtTujuan: '0', rwTujuan: '0' })[0]).toMatchObject({ rtBaru: '000', rwBaru: '000' })
  })
  it('hanya RW berubah (RT tetap)', () => {
    const r = rencanaPemindahan(DATA, { rtAsal: '005', rwAsal: '003', keluarga: null, rtTujuan: '', rwTujuan: '9' })
    expect(r).toHaveLength(1)
    expect(ringkasItemPindah(r[0])).toBe('RW 003 → 009')
  })
})

describe('rencanaKembalikan', () => {
  const dipindah: ItemPindah[] = [
    { id: '1', nik: '1', nama: 'BUDI', rtLama: '005', rwLama: '002', rtBaru: '012', rwBaru: '004' },
    { id: '2', nik: '2', nama: 'SITI', rtLama: '005', rwLama: '002', rtBaru: '012', rwBaru: '004' },
    { id: '3', nik: '3', nama: 'ANI', rtLama: '005', rwLama: '003', rtBaru: '012', rwBaru: '004' },
  ]
  it('yang RT/RW-nya masih hasil pemindahan dikembalikan (arah dibalik); yang sudah diubah lagi atau hilang dilewati', () => {
    const saatIni = new Map([
      ['1', { rt: '012', rw: '004' }],
      ['2', { rt: '12', rw: '4' }],
      ['3', { rt: '020', rw: '004' }],
    ])
    const { kembali, dilewati } = rencanaKembalikan(dipindah, saatIni)
    expect(kembali.map((i) => i.id)).toEqual(['1', '2'])
    expect(kembali[0]).toMatchObject({ rtLama: '012', rwLama: '004', rtBaru: '005', rwBaru: '002' })
    expect(ringkasItemPindah(kembali[0])).toBe('RT 012 → 005; RW 004 → 002')
    expect(dilewati).toHaveLength(1)
    expect(dilewati[0].alasan).toContain('sudah diubah lagi')
    const hilang = rencanaKembalikan(dipindah, new Map())
    expect(hilang.kembali).toEqual([])
    expect(hilang.dilewati[0].alasan).toContain('sudah tidak ada')
  })
})
