import { describe, it, expect } from 'vitest'
import { petakanKolomExcel, TEMPLATE_HEADERS, KDPD } from '@/lib/impor-peta'

describe('petakanKolomExcel — header template yang diunduh', () => {
  const harap: Record<string, string> = {
    'No.KK': 'no_kk', NIK: 'nik', Nama: 'nama_lengkap', JK: 'jenis_kelamin', 'Hub.KK': 'hubungan_keluarga',
    Kawin: 'status_perkawinan', Pendidikan: 'pendidikan', Pekerjaan: 'pekerjaan', 'Gol.Darah': 'golongan_darah',
    Agama: 'agama', 'Tmp.Lahir': 'tempat_lahir', 'Tgl.Lahir': 'tanggal_lahir', 'Nama Ibu': 'nama_ibu',
    'Nama Ayah': 'nama_ayah', RT: 'rt', RW: 'rw', Status: 'status',
  }

  it('daftar harapan mencakup SETIAP header template (tidak ada header yang terlewat)', () => {
    expect(Object.keys(harap).sort()).toEqual([...TEMPLATE_HEADERS].sort())
  })

  it.each(Object.entries(harap))('"%s" → %s', (header, field) => {
    expect(petakanKolomExcel(header)).toBe(field)
  })

  it('"Hub.KK" TIDAK dipetakan ke No. KK (bug lama: substring "kk")', () => {
    expect(petakanKolomExcel('Hub.KK')).toBe('hubungan_keluarga')
    expect(petakanKolomExcel('Hub.KK')).not.toBe('no_kk')
  })

  it('setiap header template dipetakan ke field yang berbeda-beda (tidak ada dua kolom ke satu field)', () => {
    const hasil = TEMPLATE_HEADERS.map(petakanKolomExcel)
    expect(hasil.every((h) => h !== '')).toBe(true)
    expect(new Set(hasil).size).toBe(hasil.length)
  })
})

describe('petakanKolomExcel — nama baku dan variasi umum', () => {
  it('label dan key field dipetakan persis (tidak peduli spasi/titik/huruf besar)', () => {
    for (const { k, l } of KDPD) {
      expect(petakanKolomExcel(l)).toBe(k)
      expect(petakanKolomExcel(k)).toBe(k)
      expect(petakanKolomExcel(l.toUpperCase())).toBe(k)
    }
  })

  it('variasi yang wajar tetap dikenali', () => {
    expect(petakanKolomExcel('No. KK')).toBe('no_kk')
    expect(petakanKolomExcel('Nomor KK')).toBe('no_kk')
    expect(petakanKolomExcel('No. Kartu Keluarga')).toBe('no_kk')
    expect(petakanKolomExcel('NIK/KTP')).toBe('nik')
    expect(petakanKolomExcel('Hubungan Dalam Keluarga')).toBe('hubungan_keluarga')
    expect(petakanKolomExcel('Hub. dalam KK')).toBe('hubungan_keluarga')
    expect(petakanKolomExcel('Status Kawin')).toBe('status_perkawinan')
    expect(petakanKolomExcel('Status Perkawinan')).toBe('status_perkawinan')
    expect(petakanKolomExcel('Pendidikan Terakhir')).toBe('pendidikan')
    expect(petakanKolomExcel('Golongan Darah')).toBe('golongan_darah')
    expect(petakanKolomExcel('Tempat Lahir')).toBe('tempat_lahir')
    expect(petakanKolomExcel('Tanggal Lahir')).toBe('tanggal_lahir')
    expect(petakanKolomExcel('Nama Ibu Kandung')).toBe('nama_ibu')
    expect(petakanKolomExcel('Nama Bapak')).toBe('nama_ayah')
    expect(petakanKolomExcel('Status Penduduk')).toBe('status')
  })
})

describe('petakanKolomExcel — ambigu atau tidak dikenal → "" (— skip —), bukan salah petak', () => {
  it('kolom yang menyebut dua hal sekaligus dilewati', () => {
    expect(petakanKolomExcel('Alamat KK')).toBe('')
    expect(petakanKolomExcel('Nama KK')).toBe('')
    expect(petakanKolomExcel('Nama Kepala Keluarga')).toBe('')
    expect(petakanKolomExcel('Tempat/Tgl Lahir')).toBe('')
    expect(petakanKolomExcel('RT/RW')).toBe('')
  })

  it('nama orang lain bukan nama penduduk', () => {
    expect(petakanKolomExcel('Nama Suami')).toBe('')
    expect(petakanKolomExcel('Nama Istri')).toBe('')
    expect(petakanKolomExcel('Nama Pelapor')).toBe('')
  })

  it('tanggal selain tanggal lahir tidak dipetakan ke tanggal_lahir (bug lama: substring "tgl")', () => {
    expect(petakanKolomExcel('Tgl Masuk')).toBe('')
    expect(petakanKolomExcel('Tanggal')).toBe('')
    expect(petakanKolomExcel('Tanggal Pindah')).toBe('')
  })

  it('"nikah" tidak dianggap NIK (bug lama: substring "nik")', () => {
    expect(petakanKolomExcel('Status Nikah')).toBe('status_perkawinan')
    expect(petakanKolomExcel('Nikah')).toBe('status_perkawinan')
  })

  it('kolom tak dikenal, kosong, atau bukan teks → ""', () => {
    expect(petakanKolomExcel('Keterangan')).toBe('')
    expect(petakanKolomExcel('Nomor Telepon')).toBe('')
    expect(petakanKolomExcel('')).toBe('')
    expect(petakanKolomExcel('   ')).toBe('')
    expect(petakanKolomExcel(undefined as unknown as string)).toBe('')
  })
})
