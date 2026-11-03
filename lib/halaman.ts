/**
 * halaman.ts
 * Pembagian daftar menjadi halaman (paginasi sisi klien). Murni.
 */

/** Jumlah baris per halaman pada tabel catatan Mutasi dan Vital. */
export const UKURAN_HALAMAN = 25

/** Jumlah halaman (minimal 1, juga untuk daftar kosong). */
export function jumlahHalaman(total: number, ukuran: number = UKURAN_HALAMAN): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / ukuran))
}

/** Pastikan nomor halaman berada di antara 1 dan halaman terakhir (mis. setelah penyaringan memperpendek daftar). */
export function klemHalaman(halaman: number, total: number, ukuran: number = UKURAN_HALAMAN): number {
  const h = Number.isFinite(halaman) ? Math.floor(halaman) : 1
  return Math.min(Math.max(1, h), jumlahHalaman(total, ukuran))
}

/** Potongan daftar untuk satu halaman (halaman dikoreksi otomatis ke rentang yang sah). */
export function potongHalaman<T>(daftar: readonly T[], halaman: number, ukuran: number = UKURAN_HALAMAN): T[] {
  const h = klemHalaman(halaman, daftar.length, ukuran)
  return daftar.slice((h - 1) * ukuran, h * ukuran)
}
