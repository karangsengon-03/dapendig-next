/**
 * rt-rw.ts — RT dan RW selalu 3 digit angka (001, 002, ...).
 * Data lama bisa tersimpan sebagai "1" atau "01"; tampilan, editor, filter, statistik, ekspor, impor, dan Cetak KK
 * semuanya memakai fungsi ini supaya yang tampil dan yang diedit selalu 3 digit.
 */

/** "1" → "001", "03" → "003", "0004" → "004". Bukan angka (mis. "Lain-lain") dikembalikan apa adanya; kosong → "". */
export function rt3(v: string | number | null | undefined): string {
  const s = String(v ?? '').trim()
  return /^\d+$/.test(s) ? String(Number(s)).padStart(3, '0') : s
}

/** "003/001" untuk tampilan ringkas; bagian yang kosong ditulis "—". */
export function rtRw(rt: string | number | null | undefined, rw: string | number | null | undefined): string {
  return `${rt3(rt) || '—'}/${rt3(rw) || '—'}`
}

/**
 * Pilihan untuk menu RT/RW: daftar resmi, ditambah nilai yang sedang tersimpan bila tidak ada di daftar
 * (mis. RT lama di luar daftar) agar editor tidak menampilkan pilihan kosong.
 */
export function opsiRt(daftar: readonly string[], nilai: string | null | undefined): string[] {
  const v = rt3(nilai)
  return v && !daftar.includes(v) ? [v, ...daftar] : [...daftar]
}
