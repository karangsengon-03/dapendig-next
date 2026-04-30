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
 */
export function parseDate(str: string): Date | null {
  if (!str) return null

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + 'T00:00:00')
    return isNaN(d.getTime()) ? null : d
  }

  // Format DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split('/')
    const d = new Date(`${year}-${month}-${day}T00:00:00`)
    return isNaN(d.getTime()) ? null : d
  }

  // Format D/M/YYYY atau D/MM/YYYY atau DD/M/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split('/')
    const d = new Date(`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T00:00:00`)
    return isNaN(d.getTime()) ? null : d
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
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
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
