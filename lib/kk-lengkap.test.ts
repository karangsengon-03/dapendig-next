import { describe, it, expect } from 'vitest'
import { cekKelengkapanKK, urutAnggotaKK, URUTAN_HUBUNGAN } from '@/lib/kk-lengkap'
import type { Penduduk } from '@/types'

function p(o: Partial<Penduduk>): Penduduk {
  return {
    id: 'x', nama_lengkap: 'Budi', nik: '3511140109480001', no_kk: '3511030000001826', jenis_kelamin: 'Laki-laki', agama: 'Islam',
    hubungan_keluarga: 'Kepala Keluarga', nama_ayah: '', nama_ibu: '', pendidikan: 'SMA/Sederajat', pekerjaan: 'Petani/Pekebun',
    rt: '003', rw: '001', status: 'aktif', status_perkawinan: 'Kawin', tanggal_lahir: '1985-04-10', tempat_lahir: 'JEMBER',
    alamat: 'KARANG SENGON', golongan_darah: '', ...o,
  } as Penduduk
}

describe('urutAnggotaKK', () => {
  it('Kepala Keluarga, Istri, Anak (yang lebih tua dulu), lalu hubungan lain', () => {
    const urut = urutAnggotaKK([
      p({ nama_lengkap: 'Cucu', hubungan_keluarga: 'Cucu', tanggal_lahir: '2020-01-01' }),
      p({ nama_lengkap: 'Anak Bungsu', hubungan_keluarga: 'Anak', tanggal_lahir: '2015-05-05' }),
      p({ nama_lengkap: 'Istri', hubungan_keluarga: 'Istri', tanggal_lahir: '1988-01-01' }),
      p({ nama_lengkap: 'Anak Sulung', hubungan_keluarga: 'Anak', tanggal_lahir: '2010-02-02' }),
      p({ nama_lengkap: 'Kepala', hubungan_keluarga: 'Kepala Keluarga' }),
    ])
    expect(urut.map((x) => x.nama_lengkap)).toEqual(['Kepala', 'Istri', 'Anak Sulung', 'Anak Bungsu', 'Cucu'])
  })
  it('hubungan tak dikenal di akhir; array asli tidak berubah', () => {
    const asli = [p({ nama_lengkap: 'Aneh', hubungan_keluarga: 'Lainnya' as Penduduk['hubungan_keluarga'] }), p({ nama_lengkap: 'Kepala' })]
    const urut = urutAnggotaKK(asli)
    expect(urut.map((x) => x.nama_lengkap)).toEqual(['Kepala', 'Aneh'])
    expect(asli[0].nama_lengkap).toBe('Aneh')
    expect(URUTAN_HUBUNGAN['Kepala Keluarga']).toBe(0)
  })
})

describe('cekKelengkapanKK', () => {
  it('KK lengkap: satu Kepala Keluarga, semua kolom wajib terisi; golongan darah/ayah/ibu kosong tidak masalah', () => {
    const hasil = cekKelengkapanKK([p({}), p({ nik: '3511140109480002', hubungan_keluarga: 'Istri', alamat: '', nama_ayah: '', nama_ibu: '' })])
    expect(hasil).toEqual({ tanpaKepala: false, jumlahKepala: 1, kosong: [], lengkap: true })
  })

  it('tanpa Kepala Keluarga → tidak lengkap', () => {
    const hasil = cekKelengkapanKK([p({ hubungan_keluarga: 'Istri' })])
    expect(hasil.tanpaKepala).toBe(true)
    expect(hasil.jumlahKepala).toBe(0)
    expect(hasil.lengkap).toBe(false)
  })

  it('lebih dari satu Kepala Keluarga → tidak lengkap, jumlah dilaporkan', () => {
    const hasil = cekKelengkapanKK([p({}), p({ nik: '3511140109480002' })])
    expect(hasil.jumlahKepala).toBe(2)
    expect(hasil.tanpaKepala).toBe(false)
    expect(hasil.lengkap).toBe(false)
  })

  it('kolom wajib yang kosong dilaporkan per anggota dengan nama kolomnya', () => {
    const hasil = cekKelengkapanKK([
      p({}),
      p({ nik: '3511140109480002', nama_lengkap: 'Siti', hubungan_keluarga: 'Istri', pendidikan: '', pekerjaan: '  ', agama: '' as Penduduk['agama'] }),
    ])
    expect(hasil.lengkap).toBe(false)
    expect(hasil.kosong).toEqual([{ nik: '3511140109480002', nama: 'Siti', field: ['Agama', 'Pendidikan', 'Pekerjaan'] }])
  })

  it('Kepala Keluarga juga wajib punya alamat, RT, dan RW', () => {
    const hasil = cekKelengkapanKK([p({ alamat: '', rt: '', rw: '' })])
    expect(hasil.kosong).toEqual([{ nik: '3511140109480001', nama: 'Budi', field: ['Alamat', 'RT', 'RW'] }])
  })

  it('anggota tanpa nama memakai NIK sebagai penanda', () => {
    const hasil = cekKelengkapanKK([p({}), p({ nik: '3511140109480002', nama_lengkap: '', hubungan_keluarga: 'Anak' })])
    expect(hasil.kosong[0]).toMatchObject({ nik: '3511140109480002', nama: '3511140109480002', field: ['Nama lengkap'] })
  })
})
