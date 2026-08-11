/**
 * dateUtils.ts
 * Fungsi utilitas tanggal yang handle dua format:
 *   - YYYY-MM-DD (format internal Firestore — standar)
 *   - DD/MM/YYYY (format lama dari import Excel)
 *
 * Firestore harus SELALU menyimpan YYYY-MM-DD.
 * Fungsi ini sebagai safety net untuk data lama.
 */

/**
 * Parse string tanggal ke Date object.
 * Mendukung YYYY-MM-DD dan DD/MM/YYYY.
 *
 * PENTING: JavaScript Date secara diam-diam "roll-over" tanggal kalender
 * yang tidak valid alih-alih menolaknya — misalnya '2023-02-30' otomatis
 * jadi 2 Maret 2023 (Februari 2023 cuma 28 hari, jadi +2 hari lagi), dan
 * isNaN(d.getTime()) TIDAK menangkap ini karena hasilnya tetap Date yang
 * valid secara teknis, cuma salah. Fungsi ini melakukan round-trip check:
 * setelah parsing, komponen tahun/bulan/tanggal hasil harus cocok PERSIS
 * dengan input — kalau tidak, berarti terjadi roll-over dan input ditolak.
 */
function isRoundTripValid(d: Date, year: number, month: number, day: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

export function parseDate(str: string): Date | null {
  if (!str) return null

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, day] = str.split('-').map(Number)
    const d = new Date(str + 'T00:00:00')
    if (isNaN(d.getTime()) || !isRoundTripValid(d, y, m, day)) return null
    return d
  }

  // Format DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split('/')
    const d = new Date(`${year}-${month}-${day}T00:00:00`)
    if (isNaN(d.getTime()) || !isRoundTripValid(d, Number(year), Number(month), Number(day))) return null
    return d
  }

  // Format D/M/YYYY atau D/MM/YYYY atau DD/M/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split('/')
    const d = new Date(`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T00:00:00`)
    if (isNaN(d.getTime()) || !isRoundTripValid(d, Number(year), Number(month), Number(day))) return null
    return d
  }

  return null
}

/**
 * Hitung umur dalam tahun dari string tanggal lahir.
 * Return -1 jika tidak bisa diparse.
 */
export function hitungUmur(tanggalLahir: string): number {
  const lahir = parseDate(tanggalLahir)
  if (!lahir) return -1
  const now = new Date()
  let umur = now.getFullYear() - lahir.getFullYear()
  const m = now.getMonth() - lahir.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < lahir.getDate())) umur--
  return umur
}

/**
 * Format tanggal untuk tampilan: "31 Desember 2009"
 */
export function formatTanggalLahir(str: string): string {
  const d = parseDate(str)
  if (!d) return str || '—'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

/**
 * Normalisasi string tanggal ke format YYYY-MM-DD untuk Firestore.
 * Input: DD/MM/YYYY atau YYYY-MM-DD → Output: YYYY-MM-DD
 */
export function normalisasiTanggal(str: string): string {
  if (!str) return str

  // Sudah YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // DD/MM/YYYY atau variasi → YYYY-MM-DD
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split('/')
    return `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`
  }

  return str
}
