/**
 * exportExcel.ts
 * Utility ekspor data ke file .xlsx menggunakan ExcelJS
 * Dipanggil dari halaman /pengaturan — seksi Ekspor Data
 *
 * MIGRASI dari SheetJS (xlsx) ke ExcelJS di v2.7.1: paket 'xlsx' terkunci
 * permanen di versi 0.18.5 di npm registry sejak 2022 (kebijakan SheetJS
 * sendiri, bukan bug sementara) dan tidak bisa menerima fix untuk 2
 * kerentanan severity HIGH (prototype pollution, ReDoS) yang relevan
 * langsung dengan fitur impor Excel kita. ExcelJS aktif dipelihara dan
 * mendukung semua fitur yang dipakai di sini: multi-sheet, auto-width
 * kolom, read+write penuh.
 */

import ExcelJS from 'exceljs'

export interface ExportColumn {
  key: string
  header: string
}

// Konversi YYYY-MM-DD → DD/MM/YYYY untuk ekspor
function toDisplayDate(val: string): string {
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const [y, m, d] = val.split('-')
  return `${d}/${m}/${y}`
}

// Trigger download file di browser dari Buffer — ExcelJS tidak punya
// writeFile langsung di browser (itu API Node.js-nya), jadi kita generate
// buffer lalu download manual via Blob + anchor, pola standar ExcelJS
// untuk lingkungan browser.
async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Format nilai satu sel — dipakai untuk value final maupun untuk menghitung
// lebar kolom (harus konsisten, supaya auto-width benar-benar akurat).
function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  // Firestore Timestamp → DD/MM/YYYY
  if (
    typeof val === 'object' &&
    'seconds' in (val as object) &&
    'nanoseconds' in (val as object)
  ) {
    const ts = val as { seconds: number; nanoseconds: number }
    const d = new Date(ts.seconds * 1000)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }
  // Tanggal format YYYY-MM-DD → DD/MM/YYYY
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return toDisplayDate(val)
  }
  return String(val)
}

// Tambah 1 sheet berisi array-of-arrays (setara XLSX.utils.aoa_to_sheet +
// book_append_sheet), dengan auto-width kolom berdasarkan konten terpanjang.
function addAoaSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  header: string[],
  body: (string | number)[][]
): void {
  const ws = wb.addWorksheet(sheetName.slice(0, 31))
  ws.addRow(header)
  body.forEach((row) => ws.addRow(row))

  // Auto-width kolom — setara logika lama: panjang konten terpanjang per
  // kolom (termasuk header), dibatasi maksimal 50 karakter.
  header.forEach((h, ci) => {
    const maxLen = Math.max(
      h.length,
      ...body.map((row) => String(row[ci] ?? '').length)
    )
    ws.getColumn(ci + 1).width = Math.min(maxLen + 2, 50)
  })
}

/**
 * Ekspor array of objects ke file .xlsx
 * @param rows     - Array of plain objects (data dari Firestore, sudah di-flatten)
 * @param columns  - Daftar kolom yang ditampilkan dan headernya
 * @param filename - Nama file tanpa ekstensi (akan diberi .xlsx otomatis)
 * @param sheetName - Nama sheet dalam workbook (maks 31 karakter)
 */
export async function exportToExcel(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  sheetName = 'Data'
): Promise<void> {
  const header = columns.map((c) => c.header)
  const body = rows.map((row) => columns.map((c) => formatCellValue(row[c.key])))

  const wb = new ExcelJS.Workbook()
  addAoaSheet(wb, sheetName, header, body)

  await downloadWorkbook(wb, `${filename}.xlsx`)
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
  // Parse YYYY-MM-DD langsung tanpa Date object untuk hindari timezone shift
  const m = tgl.match(/^(\d{4})-(\d{2})-\d{2}/)
  if (m) return m[2] === bulan.padStart(2, '0') && m[1] === tahun
  // Fallback untuk format lain
  const d = new Date(tgl.length === 10 ? tgl + 'T00:00:00' : tgl)
  if (isNaN(d.getTime())) return false
  return String(d.getMonth() + 1).padStart(2, '0') === bulan && String(d.getFullYear()) === tahun
}

export async function exportBulanan(data: DataBulanan, bulan: string, tahun: string): Promise<void> {
  const namaBulan = NAMA_BULAN[parseInt(bulan, 10) - 1] ?? bulan

  const mk = data.mk.filter((r) => filterByBulanTahun(r.tanggal, bulan, tahun))
  const mm = data.mm.filter((r) => filterByBulanTahun(r.tanggal, bulan, tahun))
  const lh = data.lh.filter((r) => filterByBulanTahun(r.tanggal_lahir, bulan, tahun))
  const mn = data.mn.filter((r) => filterByBulanTahun(r.tanggal, bulan, tahun))

  const wb = new ExcelJS.Workbook()

  // Sheet Rekap
  addAoaSheet(wb, 'Rekap', ['Kategori', 'Jumlah'], [
    ['Mutasi Keluar', mk.length],
    ['Mutasi Masuk', mm.length],
    ['Kelahiran', lh.length],
    ['Kematian', mn.length],
    ['Total Penduduk Aktif', data.totalAktif],
  ])

  // Sheet Mutasi Keluar
  if (mk.length > 0) {
    addAoaSheet(wb, 'Mutasi Keluar',
      ['Nama', 'NIK', 'No. KK', 'Tujuan', 'Tanggal'],
      mk.map((r) => [r.nama, r.nik_target, r.no_kk, r.tujuan, toDisplayDate(r.tanggal)])
    )
  }

  // Sheet Mutasi Masuk
  if (mm.length > 0) {
    addAoaSheet(wb, 'Mutasi Masuk',
      ['Nama', 'NIK', 'No. KK', 'Asal Daerah', 'Tanggal'],
      mm.map((r) => [r.nama_lengkap, r.nik, r.no_kk, r.asal_daerah, toDisplayDate(r.tanggal)])
    )
  }

  // Sheet Kelahiran
  if (lh.length > 0) {
    addAoaSheet(wb, 'Kelahiran',
      ['Nama Bayi', 'JK', 'Tgl Lahir', 'Nama Ibu', 'Nama Ayah', 'RT', 'RW'],
      lh.map((r) => [r.nama_lengkap, r.jenis_kelamin, toDisplayDate(r.tanggal_lahir), r.nama_ibu, r.nama_ayah, r.rt, r.rw])
    )
  }

  // Sheet Kematian
  if (mn.length > 0) {
    addAoaSheet(wb, 'Kematian',
      ['Nama', 'NIK', 'Tgl Meninggal', 'Sebab'],
      mn.map((r) => [r.nama, r.nik_target, toDisplayDate(r.tanggal), r.sebab])
    )
  }

  await downloadWorkbook(wb, `Laporan-${namaBulan}-${tahun}.xlsx`)
}
