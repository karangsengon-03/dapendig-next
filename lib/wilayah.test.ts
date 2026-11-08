import { describe, it, expect, beforeEach } from 'vitest'
import { labelDesa, labelKecKab, labelPemerintahDesa, alamatBawaan, contohAlamat, simpanIdentitas, uraiIdentitas, KUNCI_IDENTITAS } from '@/lib/wilayah'

const W = { desa: 'Karang Sengon', kecamatan: 'Klabang', kabupaten: 'Bondowoso' }

describe('lib/wilayah — nama desa dari Pengaturan, bukan tertanam', () => {
  it('label lengkap', () => {
    expect(labelDesa(W)).toBe('Desa Karang Sengon')
    expect(labelKecKab(W)).toBe('Kec. Klabang, Kab. Bondowoso')
    expect(labelPemerintahDesa(W)).toBe('Pemerintah Desa Karang Sengon, Kec. Klabang, Kab. Bondowoso')
  })
  it('desa lain di kecamatan/kabupaten lain langsung terbaca', () => {
    const lain = { desa: 'Sumber Wringin', kecamatan: 'Sukowono', kabupaten: 'Jember' }
    expect(labelDesa(lain)).toBe('Desa Sumber Wringin')
    expect(alamatBawaan(lain)).toBe('SUMBER WRINGIN')
    expect(labelPemerintahDesa(lain)).toBe('Pemerintah Desa Sumber Wringin, Kec. Sukowono, Kab. Jember')
  })
  it('belum diisi: tidak ada nama bawaan, tidak ada "Desa undefined" atau "Kec. , Kab. "', () => {
    for (const kosong of [null, undefined, {}, { desa: '', kecamatan: '  ', kabupaten: null }]) {
      expect(labelDesa(kosong)).toBe('')
      expect(labelKecKab(kosong)).toBe('')
      expect(alamatBawaan(kosong)).toBe('')
      expect(labelPemerintahDesa(kosong)).toBe('Pemerintah Desa')
    }
    expect(contohAlamat(null)).toBe('Contoh: NAMA DESA')
    expect(labelKecKab({ kabupaten: 'Jember' })).toBe('Kab. Jember')
  })
  it('spasi di awal/akhir dibuang; alamat bawaan huruf besar', () => {
    expect(alamatBawaan({ desa: '  Karang Sengon ' })).toBe('KARANG SENGON')
    expect(contohAlamat({ desa: 'karang sengon' })).toBe('Contoh: KARANG SENGON')
  })
})

describe('cadangan identitas di perangkat (layar sebelum masuk)', () => {
  beforeEach(() => window.localStorage.clear())
  it('simpan lalu baca kembali; nama desa dikosongkan = cadangan dihapus', () => {
    simpanIdentitas(W)
    expect(uraiIdentitas(window.localStorage.getItem(KUNCI_IDENTITAS))).toEqual(W)
    simpanIdentitas({ desa: '' })
    expect(window.localStorage.getItem(KUNCI_IDENTITAS)).toBeNull()
  })
  it('isi rusak atau kosong diabaikan', () => {
    expect(uraiIdentitas('bukan json')).toBeNull()
    expect(uraiIdentitas('')).toBeNull()
    expect(uraiIdentitas(null)).toBeNull()
    expect(uraiIdentitas('{"desa":"  "}')).toBeNull()
  })
})
