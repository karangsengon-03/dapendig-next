import { describe, it, expect } from 'vitest'
import { validasiPindahKeluar, validasiPindahMasuk, validasiKelahiran, validasiKematian, validasiIsianKK } from '@/lib/validasi-catatan'

const NIK = '3511140109480099'
const KK = '3511030000001826'
/** Isian yang tercetak di KK (pilihan wajib dipilih; alamat wajib untuk Kepala Keluarga). */
const ISIAN_KK = {
  jenis_kelamin: 'Laki-laki', agama: 'Islam', hubungan_keluarga: 'Istri', status_perkawinan: 'Kawin',
  pendidikan: 'SMA/Sederajat', pekerjaan: 'Petani/Pekebun', alamat: 'KARANG SENGON',
}
const PILIHAN_KOSONG = { jenis_kelamin: '', agama: '', hubungan_keluarga: '', status_perkawinan: '', pendidikan: '', pekerjaan: '', alamat: '' }
const PESAN_PILIHAN = {
  jenis_kelamin: 'Jenis kelamin wajib dipilih',
  agama: 'Agama wajib dipilih',
  hubungan_keluarga: 'Hubungan keluarga wajib dipilih',
  status_perkawinan: 'Status perkawinan wajib dipilih',
  pendidikan: 'Pendidikan wajib dipilih',
  pekerjaan: 'Pekerjaan wajib dipilih',
}

describe('validasiPindahKeluar (pesan sama dengan form Tambah)', () => {
  const ok = { nama: 'A', nik_target: NIK, no_kk: KK, tujuan: 'Malang', tanggal: '2026-10-14' }

  it('data lengkap → valid', () => expect(validasiPindahKeluar(ok)).toEqual({}))

  it('semua kosong (perorangan) → semua pesan zip', () => {
    expect(validasiPindahKeluar({ nama: ' ', nik_target: '123', no_kk: '', tujuan: '  ', tanggal: '' })).toEqual({
      nama: 'Nama wajib diisi',
      nik_target: 'NIK harus 16 digit angka',
      no_kk: 'No. KK harus 16 digit angka',
      tujuan: 'Tujuan wajib diisi',
      tanggal: 'Tanggal wajib diisi',
    })
  })

  it('opsi keluarga: nama dan NIK tidak diperiksa', () => {
    expect(validasiPindahKeluar({ nama: '', nik_target: '', no_kk: KK, tujuan: 'Malang', tanggal: '2026-10-14' }, false)).toEqual({})
  })

  it('NIK 15 atau 17 digit atau berisi huruf → ditolak', () => {
    expect(validasiPindahKeluar({ ...ok, nik_target: NIK.slice(1) }).nik_target).toBe('NIK harus 16 digit angka')
    expect(validasiPindahKeluar({ ...ok, nik_target: NIK + '1' }).nik_target).toBe('NIK harus 16 digit angka')
    expect(validasiPindahKeluar({ ...ok, nik_target: '351114010948009A' }).nik_target).toBe('NIK harus 16 digit angka')
  })
})

describe('validasiPindahMasuk', () => {
  const ok = { nama_lengkap: 'A', nik: NIK, no_kk: KK, asal_daerah: 'Jember', tanggal: '2026-10-14', tanggal_lahir: '1990-01-01', tempat_lahir: 'Jember', ...ISIAN_KK }

  it('data lengkap → valid', () => expect(validasiPindahMasuk(ok)).toEqual({}))

  it('form Tambah (lengkap): semua kosong → semua pesan zip', () => {
    expect(validasiPindahMasuk({ nama_lengkap: '', nik: '', no_kk: '', asal_daerah: '', tanggal: '', tanggal_lahir: '', tempat_lahir: '', ...PILIHAN_KOSONG })).toEqual({
      ...PESAN_PILIHAN,
      nama_lengkap: 'Nama wajib diisi',
      nik: 'NIK harus 16 digit angka',
      no_kk: 'No. KK harus 16 digit angka',
      asal_daerah: 'Asal daerah wajib diisi',
      tanggal_lahir: 'Tanggal lahir wajib diisi',
      tempat_lahir: 'Tempat lahir wajib diisi',
      tanggal: 'Tanggal masuk wajib diisi',
    })
  })

  it('lengkap = false: tempat/tanggal lahir tidak diperiksa, tetapi isian KK tetap wajib', () => {
    const { tanggal_lahir, tempat_lahir, ...edit } = ok
    void tanggal_lahir; void tempat_lahir
    expect(validasiPindahMasuk(edit, false)).toEqual({})
    expect(Object.keys(validasiPindahMasuk({ ...edit, asal_daerah: '' }, false))).toEqual(['asal_daerah'])
    expect(Object.keys(validasiPindahMasuk({ ...edit, agama: '' }, false))).toEqual(['agama'])
  })

  it('alamat wajib hanya untuk Kepala Keluarga (KK mencetak alamat Kepala Keluarga)', () => {
    expect(validasiPindahMasuk({ ...ok, hubungan_keluarga: 'Anak', alamat: '' })).toEqual({})
    expect(validasiPindahMasuk({ ...ok, hubungan_keluarga: 'Kepala Keluarga', alamat: '  ' })).toEqual({ alamat: 'Alamat Kepala Keluarga wajib diisi' })
    expect(validasiPindahMasuk({ ...ok, hubungan_keluarga: 'Kepala Keluarga', alamat: 'KARANG SENGON' })).toEqual({})
  })

  it('golongan darah, nama ayah, dan nama ibu tidak wajib (kosong dicetak "-" di KK)', () => {
    expect(validasiPindahMasuk({ ...ok, golongan_darah: '', nama_ayah: '', nama_ibu: '' } as typeof ok)).toEqual({})
  })
})

describe('validasiKelahiran', () => {
  const ok = { nama_lengkap: 'Bayi', nik: NIK, no_kk: KK, tanggal_lahir: '2026-10-01', tempat_lahir: 'Bondowoso', nama_ayah: 'A', nama_ibu: 'B', ...ISIAN_KK, hubungan_keluarga: 'Anak', status_perkawinan: 'Belum Kawin', pendidikan: 'Tidak/Belum Sekolah', pekerjaan: 'Tidak/Belum Bekerja' }

  it('data lengkap → valid', () => expect(validasiKelahiran(ok)).toEqual({}))

  it('semua kosong → pesan zip (termasuk "Nama bayi")', () => {
    expect(validasiKelahiran({ nama_lengkap: '', nik: '', no_kk: '', tanggal_lahir: '', tempat_lahir: '', nama_ayah: '', nama_ibu: '', ...PILIHAN_KOSONG })).toEqual({
      ...PESAN_PILIHAN,
      nama_lengkap: 'Nama bayi wajib diisi',
      nik: 'NIK harus 16 digit angka',
      no_kk: 'No. KK harus 16 digit angka',
      tanggal_lahir: 'Tanggal lahir wajib diisi',
      tempat_lahir: 'Tempat lahir wajib diisi',
      nama_ayah: 'Nama ayah wajib diisi',
      nama_ibu: 'Nama ibu wajib diisi',
    })
  })
})

describe('validasiIsianKK (isian yang tercetak di KK)', () => {
  it('semua pilihan terisi → valid', () => expect(validasiIsianKK(ISIAN_KK)).toEqual({}))

  it('pilihan yang kosong atau hanya spasi ditolak satu per satu', () => {
    for (const k of Object.keys(PESAN_PILIHAN) as (keyof typeof PESAN_PILIHAN)[]) {
      expect(validasiIsianKK({ ...ISIAN_KK, [k]: '' })).toEqual({ [k]: PESAN_PILIHAN[k] })
      expect(validasiIsianKK({ ...ISIAN_KK, [k]: '   ' })).toEqual({ [k]: PESAN_PILIHAN[k] })
    }
  })

  it('isian yang tidak diberikan dianggap kosong', () => {
    expect(Object.keys(validasiIsianKK({})).sort()).toEqual(Object.keys(PESAN_PILIHAN).sort())
  })
})

describe('validasiKematian', () => {
  const ok = { nama: 'A', nik_target: NIK, no_kk: KK, sebab: 'Sakit', tanggal: '2026-10-14' }

  it('data lengkap → valid', () => expect(validasiKematian(ok)).toEqual({}))

  it('semua kosong → pesan zip', () => {
    expect(validasiKematian({ nama: '', nik_target: '', no_kk: '', sebab: '  ', tanggal: '' })).toEqual({
      nama: 'Nama wajib diisi',
      nik_target: 'NIK harus 16 digit angka',
      no_kk: 'No. KK harus 16 digit angka',
      sebab: 'Sebab kematian wajib diisi',
      tanggal: 'Tanggal wajib diisi',
    })
  })
})
