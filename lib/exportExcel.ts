/**
 * exportExcel.ts
 * Utility ekspor data ke file .xlsx menggunakan SheetJS (xlsx)
 * Dipanggil dari halaman /pengaturan — seksi Ekspor Data
 */

import * as XLSX from 'xlsx'

export interface ExportColumn {
  key: string
  header: string
}

/**
 * Ekspor array of objects ke file .xlsx
 * @param rows     - Array of plain objects (data dari Firestore, sudah di-flatten)
 * @param columns  - Daftar kolom yang ditampilkan dan headernya
 * @param filename - Nama file tanpa ekstensi (akan diberi .xlsx otomatis)
 * @param sheetName - Nama sheet dalam workbook (maks 31 karakter)
 */
export function exportToExcel(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  sheetName = 'Data'
): void {
  // Bangun array of arrays: baris pertama = header
  const header = columns.map((c) => c.header)
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key]
      if (val === null || val === undefined) return ''
      // Firestore Timestamp → string tanggal
      if (
        typeof val === 'object' &&
        'seconds' in (val as object) &&
        'nanoseconds' in (val as object)
      ) {
        const ts = val as { seconds: number; nanoseconds: number }
        return new Date(ts.seconds * 1000).toLocaleDateString('id-ID')
      }
      return String(val)
    })
  )

  const wsData = [header, ...body]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Auto-width kolom berdasarkan konten
  const colWidths = columns.map((c, ci) => {
    const maxLen = Math.max(
      c.header.length,
      ...body.map((row) => String(row[ci] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 50) }
  })
  ws['!cols'] = colWidths

  // Style header (bold) — hanya didukung bila pakai xlsx-style, tapi kita mark aja
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ── Ekspor Bulanan Multi-Sheet ────────────────────────────────────────────────

import type { MutasiKeluar, MutasiMasuk, Lahir, Meninggal } from '@/types'

export interface DataBulanan {
  mk: MutasiKeluar[]
  mm: MutasiMasuk[]
  lh: Lahir[]
  mn: Meninggal[]
  totalAktif: number
}

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function filterByBulanTahun(tgl: string, bulan: string, tahun: string): boolean {
  if (!tgl) return false
  const d = new Date(tgl)
  if (isNaN(d.getTime())) return false
  return String(d.getMonth() + 1).padStart(2, '0') === bulan && String(d.getFullYear()) === tahun
}

export function exportBulanan(data: DataBulanan, bulan: string, tahun: string): void {
  const namaBulan = NAMA_BULAN[parseInt(bulan, 10) - 1] ?? bulan

  const mk = data.mk.filter((r) => filterByBulanTahun(r.tanggal, bulan, tahun))
  const mm = data.mm.filter((r) => filterByBulanTahun(r.tanggal, bulan, tahun))
  const lh = data.lh.filter((r) => filterByBulanTahun(r.tanggal_lahir, bulan, tahun))
  const mn = data.mn.filter((r) => filterByBulanTahun(r.tanggal, bulan, tahun))

  const wb = XLSX.utils.book_new()

  // Sheet Rekap
  const rekap = [
    ['Kategori', 'Jumlah'],
    ['Mutasi Keluar', mk.length],
    ['Mutasi Masuk', mm.length],
    ['Kelahiran', lh.length],
    ['Kematian', mn.length],
    ['Total Penduduk Aktif', data.totalAktif],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rekap), 'Rekap')

  // Sheet Mutasi Keluar
  if (mk.length > 0) {
    const rows = [['Nama', 'NIK', 'No. KK', 'Tujuan', 'Tanggal'], ...mk.map((r) => [r.nama, r.nik_target, r.no_kk, r.tujuan, r.tanggal])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Mutasi Keluar')
  }

  // Sheet Mutasi Masuk
  if (mm.length > 0) {
    const rows = [['Nama', 'NIK', 'No. KK', 'Asal Daerah', 'Tanggal'], ...mm.map((r) => [r.nama_lengkap, r.nik, r.no_kk, r.asal_daerah, r.tanggal])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Mutasi Masuk')
  }

  // Sheet Kelahiran
  if (lh.length > 0) {
    const rows = [['Nama Bayi', 'JK', 'Tgl Lahir', 'Nama Ibu', 'Nama Ayah', 'RT', 'RW'], ...lh.map((r) => [r.nama_lengkap, r.jenis_kelamin, r.tanggal_lahir, r.nama_ibu, r.nama_ayah, r.rt, r.rw])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Kelahiran')
  }

  // Sheet Kematian
  if (mn.length > 0) {
    const rows = [['Nama', 'NIK', 'Tgl Meninggal', 'Sebab'], ...mn.map((r) => [r.nama, r.nik_target, r.tanggal, r.sebab])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Kematian')
  }

  XLSX.writeFile(wb, `Laporan-${namaBulan}-${tahun}.xlsx`)
}
