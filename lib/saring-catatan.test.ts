import { describe, it, expect } from 'vitest'
import {
  OPSI_URUT_CATATAN, URUT_BAWAAN, buatPetaRt, cocokCari, cocokRt, normalRt, urutkanCatatan, waktuBuat,
  type BarisUrut,
} from '@/lib/saring-catatan'

describe('cocokCari', () => {
  const NIK = '3511140109480001'
  const KK = '3511030000001826'

  it('kata kunci kosong/spasi → cocok semua', () => {
    expect(cocokCari('', 'Budi')).toBe(true)
    expect(cocokCari('   ', 'Budi')).toBe(true)
  })
  it('tidak membedakan huruf besar/kecil dan boleh sebagian nama', () => {
    expect(cocokCari('bUd', 'BUDI SANTOSO', NIK, KK)).toBe(true)
    expect(cocokCari('xyz', 'BUDI SANTOSO', NIK, KK)).toBe(false)
  })
  it('frasa harus utuh di satu kolom: "anak a" tidak ikut menampilkan "Anak B"', () => {
    expect(cocokCari('anak a', 'Anak A')).toBe(true)
    expect(cocokCari('anak a', 'Anak B')).toBe(false)
    expect(cocokCari('budi santoso', 'BUDI SANTOSO')).toBe(true)
    expect(cocokCari('santoso budi', 'Budi Santoso')).toBe(false)
  })
  it('kata kunci boleh cocok di kolom mana saja (nama, NIK, No. KK)', () => {
    expect(cocokCari('1826', 'Budi Santoso', NIK, KK)).toBe(true)
    expect(cocokCari('santoso', 'Budi Santoso', NIK, KK)).toBe(true)
  })
  it('NIK/No. KK lengkap atau potongan, dengan spasi/strip/titik diabaikan', () => {
    expect(cocokCari(NIK, 'Budi', NIK, KK)).toBe(true)
    expect(cocokCari('3511 1401-0948.0001', 'Budi', NIK, KK)).toBe(true)
    expect(cocokCari('0300-0000', 'Budi', NIK, KK)).toBe(true)
    expect(cocokCari('1826', 'Budi', NIK, KK)).toBe(true)
    expect(cocokCari('9999', 'Budi', NIK, KK)).toBe(false)
  })
  it('kolom undefined tidak membuat galat', () => {
    expect(cocokCari('budi', undefined, 'Budi')).toBe(true)
    expect(cocokCari('budi', undefined, undefined)).toBe(false)
  })
})

describe('normalRt / cocokRt', () => {
  it('nol di depan tidak berpengaruh', () => {
    expect(normalRt('001')).toBe('1')
    expect(normalRt(' 01 ')).toBe('1')
    expect(normalRt('010')).toBe('10')
    expect(normalRt(undefined)).toBe('')
  })
  it('RT dipilih kosong = semua; baris tanpa RT tidak cocok bila RT dipilih', () => {
    expect(cocokRt('', '003')).toBe(true)
    expect(cocokRt('', undefined)).toBe(true)
    expect(cocokRt('003', '003')).toBe(true)
    expect(cocokRt('003', '3')).toBe(true)
    expect(cocokRt('003', '004')).toBe(false)
    expect(cocokRt('003', '')).toBe(false)
    expect(cocokRt('003', undefined)).toBe(false)
  })
})

describe('buatPetaRt', () => {
  it('memetakan NIK dan ID dokumen ke RT; melewati penduduk tanpa RT', () => {
    const peta = buatPetaRt([
      { id: '3511140109480001', nik: '3511140109480001', rt: '003' },
      { id: 'acak123', nik: '3511140109480002', rt: '005' },
      { id: 'x', nik: '3511140109480003', rt: '' },
    ])
    expect(peta.get('3511140109480001')).toBe('003')
    expect(peta.get('3511140109480002')).toBe('005') // lewat field nik
    expect(peta.get('acak123')).toBe('005') // lewat ID dokumen
    expect(peta.has('3511140109480003')).toBe(false)
  })
  it('undefined → peta kosong', () => {
    expect(buatPetaRt(undefined).size).toBe(0)
  })
})

describe('waktuBuat', () => {
  it('Timestamp (toMillis), string ISO, dan kosong', () => {
    expect(waktuBuat({ toMillis: () => 1234 })).toBe(1234)
    expect(waktuBuat('2026-10-14T10:00:00.000Z')).toBe(Date.parse('2026-10-14T10:00:00.000Z'))
    expect(waktuBuat(undefined)).toBe(0)
    expect(waktuBuat('bukan tanggal')).toBe(0)
    expect(waktuBuat({ toMillis: () => NaN })).toBe(0)
  })
})

describe('urutkanCatatan', () => {
  interface R { id: string; b: BarisUrut }
  const baris = (id: string, p: Partial<BarisUrut>): R => ({
    id, b: { nama: id, nik: '', kk: '', tanggal: '2026-01-01', rt: '', dibuat: 0, ...p },
  })
  const ambil = (r: R) => r.b
  const id = (xs: R[]) => xs.map((x) => x.id)

  it('menyediakan 7 opsi dan urutan bawaan "terbaru"', () => {
    expect(URUT_BAWAAN).toBe('terbaru')
    expect(OPSI_URUT_CATATAN.map((o) => o.nilai)).toEqual(['terbaru', 'terlama', 'nama-az', 'nama-za', 'rt', 'kk', 'nik'])
  })

  it('terbaru → terlama menurut tanggal kejadian; terlama → terbaru kebalikannya', () => {
    const data = [baris('a', { tanggal: '2026-03-10' }), baris('b', { tanggal: '2026-10-01' }), baris('c', { tanggal: '2025-12-31' })]
    expect(id(urutkanCatatan(data, 'terbaru', ambil))).toEqual(['b', 'a', 'c'])
    expect(id(urutkanCatatan(data, 'terlama', ambil))).toEqual(['c', 'a', 'b'])
  })

  it('tanggal sama: terbaru → yang dicatat paling akhir dulu; terlama → yang dicatat paling awal dulu', () => {
    const data = [
      baris('pertama', { tanggal: '2026-10-01', dibuat: 100 }),
      baris('kedua', { tanggal: '2026-10-01', dibuat: 200 }),
      baris('ketiga', { tanggal: '2026-10-01', dibuat: 300 }),
    ]
    expect(id(urutkanCatatan(data, 'terbaru', ambil))).toEqual(['ketiga', 'kedua', 'pertama'])
    expect(id(urutkanCatatan(data, 'terlama', ambil))).toEqual(['pertama', 'kedua', 'ketiga'])
  })

  it('memahami format tanggal lama DD/MM/YYYY dan menaruh tanggal tak terbaca di akhir (kedua arah)', () => {
    const data = [
      baris('iso', { tanggal: '2026-05-01' }),
      baris('lama', { tanggal: '15/08/2026' }),
      baris('rusak', { tanggal: 'bukan-tanggal' }),
      baris('kosong', { tanggal: '' }),
    ]
    expect(id(urutkanCatatan(data, 'terbaru', ambil)).slice(0, 2)).toEqual(['lama', 'iso'])
    expect(id(urutkanCatatan(data, 'terlama', ambil)).slice(0, 2)).toEqual(['iso', 'lama'])
    expect(id(urutkanCatatan(data, 'terbaru', ambil)).slice(2).sort()).toEqual(['kosong', 'rusak'])
    expect(id(urutkanCatatan(data, 'terlama', ambil)).slice(2).sort()).toEqual(['kosong', 'rusak'])
  })

  it('nama A–Z dan Z–A (huruf besar/kecil diabaikan)', () => {
    const data = [baris('x1', { nama: 'budi' }), baris('x2', { nama: 'Agus' }), baris('x3', { nama: 'Citra' })]
    expect(urutkanCatatan(data, 'nama-az', ambil).map((r) => r.b.nama)).toEqual(['Agus', 'budi', 'Citra'])
    expect(urutkanCatatan(data, 'nama-za', ambil).map((r) => r.b.nama)).toEqual(['Citra', 'budi', 'Agus'])
  })

  it('RT naik secara angka (2 sebelum 10), nol di depan diabaikan, tanpa RT di akhir', () => {
    const data = [
      baris('r10', { rt: '010', nama: 'a' }), baris('r2', { rt: '002', nama: 'b' }),
      baris('tanpa', { rt: '', nama: 'c' }), baris('r1', { rt: '1', nama: 'd' }),
    ]
    expect(id(urutkanCatatan(data, 'rt', ambil))).toEqual(['r1', 'r2', 'r10', 'tanpa'])
  })

  it('No. KK dan NIK naik; kosong di akhir; sama → nama A–Z', () => {
    const data = [
      baris('k3', { kk: '3511030000001900', nama: 'Z' }), baris('k1', { kk: '3511030000001826', nama: 'B' }),
      baris('k1b', { kk: '3511030000001826', nama: 'A' }), baris('kosong', { kk: '', nama: 'C' }),
    ]
    expect(id(urutkanCatatan(data, 'kk', ambil))).toEqual(['k1b', 'k1', 'k3', 'kosong'])
    const nik = [baris('n2', { nik: '3511140109480002' }), baris('n1', { nik: '3511140109480001' })]
    expect(id(urutkanCatatan(nik, 'nik', ambil))).toEqual(['n1', 'n2'])
  })

  it('tidak mengubah array asli dan stabil untuk data sama', () => {
    const data = [baris('a', {}), baris('b', {}), baris('c', {})]
    const salinan = [...data]
    const hasil = urutkanCatatan(data, 'terbaru', ambil)
    expect(data).toEqual(salinan)
    expect(hasil).not.toBe(data)
    expect(id(hasil)).toEqual(['a', 'b', 'c'])
  })
})
