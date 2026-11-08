/**
 * sinkron-catatan.ts — bagian murni (tanpa Firebase) dari Edit catatan Pindah masuk / Kelahiran ikut memperbarui data di menu Penduduk.
 *
 * Penduduk baru memang berasal dari catatan Pindah masuk atau Kelahiran (ID dokumen = NIK). Bila catatan diedit tetapi
 * penduduknya tidak, datanya berbeda dan bisa menimbulkan duplikat atau galat. Aturan:
 *  - Hanya kolom yang BERUBAH di catatan yang diteruskan ke penduduk. Isian yang sudah diubah lewat Edit penduduk tidak
 *    ditimpa kembali oleh isian lama dari catatan.
 *  - Catatan, penduduk, dan log ditulis dalam SATU transaksi: semuanya tersimpan atau tidak sama sekali.
 *  - NIK baru yang sudah dipakai penduduk lain ditolak (prinsip "tolak, jangan timpa"). ID dokumen penduduk tidak
 *    dipindah (sama seperti Edit penduduk): hanya isian `nik` yang berubah.
 *  - Penduduk tidak ditemukan (mis. sudah dihapus): catatan tetap diperbarui dan hasilnya memberi tahu pengguna.
 */
import { rt3 } from '@/lib/rt-rw'

/** Kolom catatan Pindah masuk yang menjadi isi dokumen penduduk (cermin dataPendudukDariMasuk di useMutasi). */
export const KOLOM_PENDUDUK_DARI_MASUK = [
  'nama_lengkap', 'nik', 'no_kk', 'jenis_kelamin', 'agama', 'hubungan_keluarga', 'nama_ayah', 'nama_ibu',
  'pendidikan', 'pekerjaan', 'rt', 'rw', 'status_perkawinan', 'tanggal_lahir', 'tempat_lahir', 'golongan_darah', 'alamat',
] as const

/** Kolom catatan Kelahiran yang menjadi isi dokumen penduduk (cermin addLahir di useVital). */
export const KOLOM_PENDUDUK_DARI_LAHIR = [
  'nama_lengkap', 'nik', 'no_kk', 'jenis_kelamin', 'agama', 'hubungan_keluarga', 'nama_ayah', 'nama_ibu',
  'pendidikan', 'pekerjaan', 'rt', 'rw', 'tanggal_lahir', 'tempat_lahir', 'alamat',
] as const

export const nilai = (kolom: string, v: unknown): string =>
  kolom === 'rt' || kolom === 'rw' ? rt3(v as string | number | null | undefined) : String(v ?? '').trim()

/** Kolom yang nilainya BERBEDA antara catatan lama dan isian baru (nilai baru sudah dinormalkan). Kolom yang tidak dikirim diabaikan. */
export function kolomBerubah(
  lama: Record<string, unknown>,
  baru: Record<string, unknown>,
  kolom: readonly string[],
): Record<string, string> {
  const hasil: Record<string, string> = {}
  for (const k of kolom) {
    if (baru[k] === undefined) continue
    const b = nilai(k, baru[k])
    if (nilai(k, lama[k]) !== b) hasil[k] = b
  }
  return hasil
}

export interface HasilSinkron {
  /** true = dokumen penduduk ditemukan dan ikut diperbarui (kolom bisa kosong bila tidak ada yang berbeda). */
  pendudukDiperbarui: boolean
  /** Nama kolom penduduk yang berubah. */
  kolom: string[]
}

/** Teks dan jenis toast untuk hasil Edit catatan. `hasil` kosong (mis. tiruan tes) dianggap berhasil biasa. */
export function pesanHasilSinkron(
  dasar: string,
  hasil?: HasilSinkron | null,
): { pesan: string; jenis: 'success' | 'warning' } {
  if (!hasil) return { pesan: dasar, jenis: 'success' }
  if (!hasil.pendudukDiperbarui) {
    return {
      pesan: `${dasar}. Penduduknya tidak ditemukan di menu Penduduk (mungkin sudah dihapus), jadi data penduduk tidak berubah.`,
      jenis: 'warning',
    }
  }
  if (hasil.kolom.length > 0) return { pesan: `${dasar}, termasuk data di menu Penduduk.`, jenis: 'success' }
  return { pesan: dasar, jenis: 'success' }
}
