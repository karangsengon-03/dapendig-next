/**
 * tulis-bertahap.ts
 * Penulisan massal yang tidak berhenti total hanya karena satu baris gagal.
 *
 * Firestore `writeBatch` bersifat atomik: bila SATU dokumen di dalamnya gagal (mis. `not-found`
 * karena dokumen sudah dihapus), SELURUH batch ditolak. Helper ini mencoba batch dulu (cepat);
 * bila sebuah batch ditolak, batch itu diulang satu per satu supaya yang gagal terpisah dari
 * yang berhasil. Operasi yang diberikan harus aman dijalankan dua kali (idempoten) dan tidak
 * boleh membuat dokumen baru (mis. `update`, bukan `set`).
 *
 * Murni: tidak mengimpor Firebase. Pemanggil (halaman utilitas) yang memberi fungsi tulisnya,
 * sehingga logika ini bisa dites tanpa Firestore.
 */

export interface GagalTulis<T> {
  item: T
  pesan: string
}

export interface HasilTulis<T> {
  berhasil: T[]
  gagal: GagalTulis<T>[]
}

export interface OpsiTulisBertahap<T> {
  /** Tulis satu batch (semua atau tidak sama sekali). */
  tulisBatch: (kelompok: T[]) => Promise<void>
  /** Tulis satu item; dipakai hanya bila batch ditolak. */
  tulisSatu: (item: T) => Promise<void>
  /** Ukuran batch (Firestore maks 500 operasi); bawaan 400. */
  ukuranBatch?: number
  /** Dipanggil setelah tiap item/kelompok diproses dengan jumlah item yang sudah diproses. */
  onProgress?: (diproses: number, total: number) => void
}

/** Pesan galat singkat berbahasa Indonesia dari galat Firestore/umum. */
export function pesanGalatTulis(e: unknown): string {
  const kode = (e as { code?: unknown } | null)?.code
  if (kode === 'not-found') return 'Dokumen tidak ditemukan'
  if (kode === 'permission-denied') return 'Tidak punya izin menulis'
  if (kode === 'unavailable') return 'Gagal terhubung'
  const pesan = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  return pesan || 'kesalahan tidak diketahui'
}

export async function tulisBertahap<T>(items: T[], opsi: OpsiTulisBertahap<T>): Promise<HasilTulis<T>> {
  const ukuran = Math.max(1, Math.floor(opsi.ukuranBatch ?? 400))
  const hasil: HasilTulis<T> = { berhasil: [], gagal: [] }
  let diproses = 0

  for (let mulai = 0; mulai < items.length; mulai += ukuran) {
    const kelompok = items.slice(mulai, mulai + ukuran)
    try {
      await opsi.tulisBatch(kelompok)
      hasil.berhasil.push(...kelompok)
      diproses += kelompok.length
      opsi.onProgress?.(diproses, items.length)
    } catch {
      // Batch ditolak seluruhnya: ulangi per item agar hanya baris bermasalah yang gagal.
      for (const item of kelompok) {
        try {
          await opsi.tulisSatu(item)
          hasil.berhasil.push(item)
        } catch (e) {
          hasil.gagal.push({ item, pesan: pesanGalatTulis(e) })
        }
        diproses += 1
        opsi.onProgress?.(diproses, items.length)
      }
    }
  }
  return hasil
}
