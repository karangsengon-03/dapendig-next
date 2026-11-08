/**
 * log-aksi.ts
 * Opsi filter aksi untuk halaman Log, dan penanda bahwa Log hanya memuat sebagian entri.
 * Murni (tanpa Firebase). Nilai aksi di bawah adalah yang BENAR-BENAR ditulis hook (writeLog / addDoc ke 'log'):
 *   tambah, edit, hapus, hapus_permanen, restore, rollback, meninggal, mutasi_keluar,
 *   normalisasi, import_excel, edit_wilayah.
 * Entri lama dari aplikasi versi awal bisa berhuruf besar ('Tambah', 'Hapus'): dicocokkan tanpa membedakan huruf.
 */

export interface OpsiAksi {
  value: string
  label: string
}

/** Label sama dengan lencana di tabel Log supaya filter dan baris tidak berbeda nama. */
export const OPSI_FILTER_AKSI: readonly OpsiAksi[] = [
  { value: '', label: 'Semua aksi' },
  { value: 'tambah', label: 'Tambah' },
  { value: 'edit', label: 'Edit' },
  { value: 'hapus', label: 'Hapus' }, // mencakup hapus dan hapus_permanen
  { value: 'restore', label: 'Pulihkan' },
  { value: 'rollback', label: 'Batal' },
  { value: 'meninggal', label: 'Meninggal' },
  { value: 'mutasi_keluar', label: 'Mutasi keluar' },
  { value: 'normalisasi', label: 'Normalisasi' },
  { value: 'import_excel', label: 'Import excel' },
  { value: 'edit_wilayah', label: 'Edit wilayah' },
]

/** Opsi yang mencakup lebih dari satu nilai aksi. */
const KELOMPOK_AKSI: Record<string, readonly string[]> = {
  hapus: ['hapus', 'hapus_permanen'],
}

/** Pencocokan EKSAK (bukan substring). Filter kosong = semua cocok. */
export function cocokAksi(aksiLog: string | undefined | null, nilaiFilter: string): boolean {
  if (!nilaiFilter) return true
  const a = String(aksiLog ?? '').trim().toLowerCase()
  return (KELOMPOK_AKSI[nilaiFilter] ?? [nilaiFilter]).includes(a)
}

/** Jumlah entri yang dimuat Log. HARUS sama dengan limit() di fetchAllLog (hooks/useLog.ts). */
export const BATAS_MUAT_LOG = 500

export interface InfoBatasLog {
  /** Entri yang dimuat mencapai batas: entri yang lebih lama mungkin ada tetapi tidak dimuat. */
  terpotong: boolean
  /** Rentang tanggal terpilih dimulai SEBELUM entri tertua yang dimuat (hasil bisa belum lengkap). */
  mulaiSebelumTertua: boolean
}

/**
 * @param jumlahDimuat jumlah entri yang termuat
 * @param dateFrom     tanggal awal filter (YYYY-MM-DD, boleh kosong)
 * @param tertua       tanggal lokal (YYYY-MM-DD) entri tertua yang termuat; null bila tidak ada
 */
export function infoBatasLog(jumlahDimuat: number, dateFrom: string, tertua: string | null): InfoBatasLog {
  const terpotong = jumlahDimuat >= BATAS_MUAT_LOG
  return { terpotong, mulaiSebelumTertua: terpotong && !!dateFrom && !!tertua && dateFrom < tertua }
}
