import { describe, it, expect, vi, beforeEach } from 'vitest'

// ExcelJS ditiru: yang diuji hanya baris yang dibangun (isi sel), bukan berkas .xlsx-nya.
const { sheets } = vi.hoisted(() => ({ sheets: [] as { name: string; rows: unknown[][] }[] }))
vi.mock('exceljs', () => {
  class Workbook {
    xlsx = { writeBuffer: async () => new ArrayBuffer(0) }
    addWorksheet(name: string) {
      const s = { name, rows: [] as unknown[][] }
      sheets.push(s)
      return { addRow: (r: unknown[]) => { s.rows.push(r) }, getColumn: () => ({}) }
    }
  }
  return { default: { Workbook } }
})

import { exportToExcel, exportBulanan, type DataBulanan } from '@/lib/exportExcel'

beforeEach(() => {
  sheets.length = 0
  URL.createObjectURL = vi.fn(() => 'blob:uji')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

describe('exportToExcel — RT/RW selalu 3 digit di berkas Excel', () => {
  const kolom = [
    { key: 'nama', header: 'Nama' },
    { key: 'rt', header: 'RT' },
    { key: 'rw', header: 'RW' },
    { key: 'alamat', header: 'Alamat' },
    { key: 'tanggal_lahir', header: 'Tgl Lahir' },
  ]

  it('RT/RW "1", "01", angka, dan "Lain-lain"; kolom lain tidak ikut diubah', async () => {
    await exportToExcel([
      { nama: 'A', rt: '1', rw: '01', alamat: '1', tanggal_lahir: '2000-03-09' },
      { nama: 'B', rt: 3, rw: 2, alamat: '01', tanggal_lahir: '' },
      { nama: 'C', rt: 'Lain-lain', rw: '001', alamat: null, tanggal_lahir: null },
      { nama: 'D', rt: '', rw: undefined, alamat: '', tanggal_lahir: '1999-12-31' },
    ], kolom, 'uji')
    expect(sheets).toHaveLength(1)
    expect(sheets[0].name).toBe('Data')
    expect(sheets[0].rows).toEqual([
      ['Nama', 'RT', 'RW', 'Alamat', 'Tgl Lahir'],
      ['A', '001', '001', '1', '09/03/2000'],   // kolom Alamat "1" tetap "1"; tanggal → DD/MM/YYYY
      ['B', '003', '002', '01', ''],
      ['C', 'Lain-lain', '001', '', ''],
      ['D', '', '', '', '31/12/1999'],
    ])
  })

  it('hanya kunci rt dan rw yang dibulatkan 3 digit', async () => {
    await exportToExcel([{ rt: '5', rw: '9', rtx: '5', no_rt: '5' }], [
      { key: 'rt', header: 'RT' }, { key: 'rw', header: 'RW' }, { key: 'rtx', header: 'X' }, { key: 'no_rt', header: 'Y' },
    ], 'uji')
    expect(sheets[0].rows[1]).toEqual(['005', '009', '5', '5'])
  })

  it('data kosong: hanya baris judul', async () => {
    await exportToExcel([], kolom, 'uji')
    expect(sheets[0].rows).toEqual([['Nama', 'RT', 'RW', 'Alamat', 'Tgl Lahir']])
  })
})

describe('exportBulanan — sheet Kelahiran memakai RT/RW 3 digit', () => {
  const data = {
    mk: [], mm: [], mn: [], totalAktif: 1200,
    lh: [
      { nama_lengkap: 'Bayi A', jenis_kelamin: 'Laki-laki', tanggal_lahir: '2026-10-05', nama_ibu: 'Ibu', nama_ayah: 'Ayah', rt: '1', rw: '1' },
      { nama_lengkap: 'Bayi B', jenis_kelamin: 'Perempuan', tanggal_lahir: '2026-10-20', nama_ibu: 'Ibu2', nama_ayah: 'Ayah2', rt: '004', rw: '02' },
      { nama_lengkap: 'Bayi C', jenis_kelamin: 'Perempuan', tanggal_lahir: '2026-09-30', nama_ibu: 'Ibu3', nama_ayah: 'Ayah3', rt: '2', rw: '1' }, // bulan lain
    ],
  } as unknown as DataBulanan

  it('RT/RW tiap bayi di bulan terpilih 3 digit', async () => {
    await exportBulanan(data, '10', '2026')
    const lahir = sheets.find((s) => s.name === 'Kelahiran')
    expect(lahir).toBeDefined()
    expect(lahir!.rows[0]).toEqual(['Nama Bayi', 'JK', 'Tgl Lahir', 'Nama Ibu', 'Nama Ayah', 'RT', 'RW'])
    expect(lahir!.rows.slice(1)).toEqual([
      ['Bayi A', 'Laki-laki', '05/10/2026', 'Ibu', 'Ayah', '001', '001'],
      ['Bayi B', 'Perempuan', '20/10/2026', 'Ibu2', 'Ayah2', '004', '002'],
    ])
  })
  it('sheet Rekap menghitung hanya catatan di bulan terpilih', async () => {
    await exportBulanan(data, '10', '2026')
    expect(sheets[0].name).toBe('Rekap')
    expect(sheets[0].rows).toContainEqual(['Kelahiran', 2])
    expect(sheets[0].rows).toContainEqual(['Total Penduduk Aktif', 1200])
  })
})
