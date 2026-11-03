import { describe, it, expect, vi, afterEach } from 'vitest'
import { tanggalDariNik } from '@/lib/nik-tanggal'

// Hari ini difiksasi supaya tes tidak bergantung pada tanggal sebenarnya.
const HARI_INI = '2026-10-14'
const nik = (dd: string, mm: string, yy: string) => `351114${dd}${mm}${yy}0001`

describe('tanggalDariNik — tahun 2025/2026 (bug pivot tetap <= 24)', () => {
  it('bayi lahir 2025: tahun tersimpan 2025 dipilih, BUKAN 1925', () => {
    expect(tanggalDariNik(nik('12', '03', '25'), '2025-03-12', HARI_INI)).toEqual({ status: 'pasti', tanggal: '2025-03-12' })
  })

  it('bayi lahir 2026: tahun tersimpan 2026 dipilih, BUKAN 1926', () => {
    expect(tanggalDariNik(nik('05', '02', '26'), '2026-02-05', HARI_INI)).toEqual({ status: 'pasti', tanggal: '2026-02-05' })
  })

  it('tanggal tersimpan bergeser sehari (bug timezone lama) → koreksi tetap di tahun yang sama', () => {
    expect(tanggalDariNik(nik('12', '03', '25'), '2025-03-11', HARI_INI)).toEqual({ status: 'pasti', tanggal: '2025-03-12' })
  })

  it('tanggal 2026 yang belum terjadi dibuang: sisa 1926 saja', () => {
    // 20 Des 2026 > hari ini (14 Okt 2026)
    expect(tanggalDariNik(nik('20', '12', '26'), '', HARI_INI)).toEqual({ status: 'pasti', tanggal: '1926-12-20' })
  })

  it('hari ini difiksasi: 15 Jun 2026 belum terjadi pada 1 Mar 2026, tetapi sudah terjadi pada 14 Okt 2026', () => {
    expect(tanggalDariNik(nik('15', '06', '26'), '', '2026-03-01')).toEqual({ status: 'pasti', tanggal: '1926-06-15' })
    expect(tanggalDariNik(nik('15', '06', '26'), '', HARI_INI)).toEqual({
      status: 'ambigu',
      kandidat: ['1926-06-15', '2026-06-15'],
    })
  })

  it('tepat hari ini masih sah (bukan masa depan)', () => {
    expect(tanggalDariNik(nik('14', '10', '26'), '2026-10-14', HARI_INI)).toEqual({ status: 'pasti', tanggal: '2026-10-14' })
  })
})

describe('tanggalDariNik — tahun 00 (2000) dan abad ambigu', () => {
  it('tahun 00 dengan tanggal tersimpan 2000 → 2000', () => {
    expect(tanggalDariNik(nik('15', '06', '00'), '2000-06-15', HARI_INI)).toEqual({ status: 'pasti', tanggal: '2000-06-15' })
  })

  it('tahun 00 dengan tanggal tersimpan 1900 → 1900', () => {
    expect(tanggalDariNik(nik('15', '06', '00'), '1900-06-15', HARI_INI)).toEqual({ status: 'pasti', tanggal: '1900-06-15' })
  })

  it('tahun 25 tanpa tanggal tersimpan → AMBIGU (1925 atau 2025), tidak ditebak', () => {
    expect(tanggalDariNik(nik('12', '03', '25'), '', HARI_INI)).toEqual({
      status: 'ambigu',
      kandidat: ['1925-03-12', '2025-03-12'],
    })
    expect(tanggalDariNik(nik('12', '03', '25'), undefined, HARI_INI).status).toBe('ambigu')
    expect(tanggalDariNik(nik('12', '03', '25'), null, HARI_INI).status).toBe('ambigu')
  })

  it('tahun tersimpan tidak cocok dengan kedua kandidat → AMBIGU', () => {
    expect(tanggalDariNik(nik('12', '03', '25'), '1975-03-12', HARI_INI).status).toBe('ambigu')
  })

  it('tanggal tersimpan tak terbaca → AMBIGU', () => {
    expect(tanggalDariNik(nik('12', '03', '25'), 'bukan tanggal', HARI_INI).status).toBe('ambigu')
  })

  it('tanggal tersimpan format lama DD/MM/YYYY tetap dipakai untuk memilih abad', () => {
    expect(tanggalDariNik(nik('12', '03', '25'), '12/03/2025', HARI_INI)).toEqual({ status: 'pasti', tanggal: '2025-03-12' })
    expect(tanggalDariNik(nik('12', '03', '25'), '12/03/1925', HARI_INI)).toEqual({ status: 'pasti', tanggal: '1925-03-12' })
  })

  it('tanggal tersimpan dengan spasi di tepi tetap terbaca', () => {
    expect(tanggalDariNik(nik('12', '03', '25'), ' 2025-03-12 ', HARI_INI)).toEqual({ status: 'pasti', tanggal: '2025-03-12' })
  })
})

describe('tanggalDariNik — abad 1900-an', () => {
  it('tahun 99 → 1999 (2099 di masa depan dibuang), tanpa perlu tanggal tersimpan', () => {
    expect(tanggalDariNik(nik('31', '12', '99'), '', HARI_INI)).toEqual({ status: 'pasti', tanggal: '1999-12-31' })
  })

  it('tahun 27 → 1927 (2027 di masa depan)', () => {
    expect(tanggalDariNik(nik('01', '01', '27'), '1999-01-01', HARI_INI)).toEqual({ status: 'pasti', tanggal: '1927-01-01' })
  })

  it('tanggal lahir lain dengan tahun di atas pivot lama tidak berubah', () => {
    expect(tanggalDariNik(nik('15', '07', '90'), '1990-07-14', HARI_INI)).toEqual({ status: 'pasti', tanggal: '1990-07-15' })
  })
})

describe('tanggalDariNik — perempuan (tanggal + 40)', () => {
  it('tanggal 45 → hari 5', () => {
    expect(tanggalDariNik(nik('45', '07', '95'), '1995-07-03', HARI_INI)).toEqual({ status: 'pasti', tanggal: '1995-07-05' })
  })

  it('tanggal 71 → hari 31', () => {
    expect(tanggalDariNik(nik('71', '12', '88'), '', HARI_INI)).toEqual({ status: 'pasti', tanggal: '1988-12-31' })
  })

  it('perempuan lahir 2025: 41 → hari 1', () => {
    expect(tanggalDariNik(nik('41', '05', '25'), '2025-05-01', HARI_INI)).toEqual({ status: 'pasti', tanggal: '2025-05-01' })
  })

  it('hari 32–40 bukan tanggal laki-laki maupun perempuan → tidak valid', () => {
    expect(tanggalDariNik(nik('32', '01', '90'), '', HARI_INI).status).toBe('tidak-valid')
    expect(tanggalDariNik(nik('40', '01', '90'), '', HARI_INI).status).toBe('tidak-valid')
  })

  it('hari 72 ke atas tidak valid', () => {
    expect(tanggalDariNik(nik('72', '01', '90'), '', HARI_INI).status).toBe('tidak-valid')
  })
})

describe('tanggalDariNik — tanggal tidak valid', () => {
  it('31 Februari → tidak valid', () => {
    expect(tanggalDariNik(nik('31', '02', '90'), '1990-03-03', HARI_INI).status).toBe('tidak-valid')
  })

  it('hari 00 → tidak valid', () => {
    expect(tanggalDariNik(nik('00', '05', '90'), '', HARI_INI).status).toBe('tidak-valid')
  })

  it('bulan 00 dan bulan 13 → tidak valid', () => {
    expect(tanggalDariNik(nik('10', '00', '90'), '', HARI_INI).status).toBe('tidak-valid')
    expect(tanggalDariNik(nik('10', '13', '90'), '', HARI_INI).status).toBe('tidak-valid')
  })

  it('31 April → tidak valid', () => {
    expect(tanggalDariNik(nik('31', '04', '90'), '', HARI_INI).status).toBe('tidak-valid')
  })

  it('29 Februari tahun 00: 1900 bukan kabisat, 2000 kabisat → pasti 2000 tanpa tanggal tersimpan', () => {
    expect(tanggalDariNik(nik('29', '02', '00'), '', HARI_INI)).toEqual({ status: 'pasti', tanggal: '2000-02-29' })
  })

  it('29 Februari tahun 24: 1924 dan 2024 sama-sama kabisat → ambigu tanpa tanggal tersimpan', () => {
    expect(tanggalDariNik(nik('29', '02', '24'), '', HARI_INI).status).toBe('ambigu')
    expect(tanggalDariNik(nik('29', '02', '24'), '2024-02-29', HARI_INI)).toEqual({ status: 'pasti', tanggal: '2024-02-29' })
  })

  it('29 Februari tahun 25: 1925 dan 2025 bukan kabisat → tidak valid', () => {
    expect(tanggalDariNik(nik('29', '02', '25'), '2025-03-01', HARI_INI).status).toBe('tidak-valid')
  })

  it('NIK bukan 16 digit angka → tidak valid', () => {
    expect(tanggalDariNik('', '', HARI_INI).status).toBe('tidak-valid')
    expect(tanggalDariNik(null, '', HARI_INI).status).toBe('tidak-valid')
    expect(tanggalDariNik(undefined, '', HARI_INI).status).toBe('tidak-valid')
    expect(tanggalDariNik('35111412032500', '', HARI_INI).status).toBe('tidak-valid') // 14 digit
    expect(tanggalDariNik('35111412032500012', '', HARI_INI).status).toBe('tidak-valid') // 17 digit
    expect(tanggalDariNik('3511141203250AB1', '', HARI_INI).status).toBe('tidak-valid') // bukan angka
  })

  it('NIK dengan spasi di tepi tetap dibaca', () => {
    expect(tanggalDariNik(` ${nik('15', '07', '90')} `, '', HARI_INI)).toEqual({ status: 'pasti', tanggal: '1990-07-15' })
  })
})

describe('tanggalDariNik — hari ini bawaan', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('tanpa argumen hariIni memakai tanggal lokal sekarang', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 12, 0, 0)) // 1 Mar 2026, tengah hari lokal
    expect(tanggalDariNik(nik('15', '06', '26'), '')).toEqual({ status: 'pasti', tanggal: '1926-06-15' })
    vi.setSystemTime(new Date(2026, 9, 14, 12, 0, 0)) // 14 Okt 2026
    expect(tanggalDariNik(nik('15', '06', '26'), '').status).toBe('ambigu')
  })
})
