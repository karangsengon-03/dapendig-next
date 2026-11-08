import { describe, it, expect } from 'vitest'
import { jumlahKeluarga } from '@/lib/keluarga'

describe('jumlahKeluarga — satu definisi untuk Beranda dan Daftar Penduduk', () => {
  it('menghitung No. KK berbeda, bukan jumlah baris', () => {
    expect(jumlahKeluarga([{ no_kk: 'A' }, { no_kk: 'A' }, { no_kk: 'B' }])).toBe(2)
  })
  it('KK tanpa Kepala Keluarga tetap terhitung (dulu Beranda menghitung baris "Kepala Keluarga" sehingga selisih)', () => {
    const rows = [
      { no_kk: 'A', hubungan_keluarga: 'Kepala Keluarga' }, { no_kk: 'A', hubungan_keluarga: 'Istri' },
      { no_kk: 'B', hubungan_keluarga: 'Anak' }, // KK B kehilangan kepalanya
    ]
    expect(jumlahKeluarga(rows)).toBe(2)
    expect(rows.filter((r) => r.hubungan_keluarga === 'Kepala Keluarga').length).toBe(1)
  })
  it('kosong/spasi diabaikan; spasi di tepi disamakan', () => {
    expect(jumlahKeluarga([{ no_kk: '' }, { no_kk: '  ' }, { no_kk: null }, {}, { no_kk: ' X ' }, { no_kk: 'X' }])).toBe(1)
    expect(jumlahKeluarga([])).toBe(0)
  })
})
