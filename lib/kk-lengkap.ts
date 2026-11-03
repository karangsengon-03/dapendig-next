/**
 * kk-lengkap.ts — aturan data untuk Kartu Keluarga (KK): urutan anggota dan pemeriksaan kelengkapan.
 *
 * Skema isian (berlaku sama di form Tambah Pindah Masuk/Kelahiran, modal Edit, dan Edit penduduk):
 *  - WAJIB (tercetak di KK dan tidak boleh kosong): nama lengkap, NIK, jenis kelamin, tempat lahir, tanggal lahir, agama,
 *    pendidikan, pekerjaan, status perkawinan, hubungan keluarga; untuk Kepala Keluarga juga alamat dan RT/RW.
 *  - OPSIONAL (kosong dicetak "-"): golongan darah, nama ayah, nama ibu (di Kelahiran nama ayah/ibu wajib).
 *  - Tidak ada nilai bawaan yang diam-diam salah: pilihan wajib dibiarkan kosong sampai dipilih.
 */
import type { Penduduk } from '@/types'

/** Urutan hubungan pada KK: Kepala Keluarga, Istri/Suami, Anak, ... */
export const URUTAN_HUBUNGAN: Record<string, number> = {
  'Kepala Keluarga': 0,
  'Istri': 1,
  'Suami': 1,
  'Anak': 2,
  'Orang Tua': 3,
  'Mertua': 4,
  'Cucu': 5,
  'Menantu': 6,
  'Famili Lain': 7,
}

/** Urut sesuai KK: hubungan dulu, lalu yang lebih tua (tanggal lahir lebih awal) lebih dulu. Tidak mengubah array asli. */
export function urutAnggotaKK<T extends Pick<Penduduk, 'hubungan_keluarga' | 'tanggal_lahir'>>(anggota: readonly T[]): T[] {
  return [...anggota].sort(
    (a, b) =>
      (URUTAN_HUBUNGAN[a.hubungan_keluarga] ?? 8) - (URUTAN_HUBUNGAN[b.hubungan_keluarga] ?? 8) ||
      (a.tanggal_lahir ?? '').localeCompare(b.tanggal_lahir ?? ''),
  )
}

/** Kolom per anggota yang harus terisi agar KK lengkap. */
export const KOLOM_WAJIB_KK = [
  ['nama_lengkap', 'Nama lengkap'],
  ['nik', 'NIK'],
  ['jenis_kelamin', 'Jenis kelamin'],
  ['tempat_lahir', 'Tempat lahir'],
  ['tanggal_lahir', 'Tanggal lahir'],
  ['agama', 'Agama'],
  ['pendidikan', 'Pendidikan'],
  ['pekerjaan', 'Pekerjaan'],
  ['status_perkawinan', 'Status perkawinan'],
  ['hubungan_keluarga', 'Hubungan keluarga'],
] as const

/** Kolom tambahan yang harus terisi pada Kepala Keluarga (dicetak di kepala KK). */
export const KOLOM_WAJIB_KEPALA = [
  ['alamat', 'Alamat'],
  ['rt', 'RT'],
  ['rw', 'RW'],
] as const

export interface KelengkapanKK {
  /** Tidak ada anggota berhubungan "Kepala Keluarga". */
  tanpaKepala: boolean
  /** Jumlah anggota berhubungan "Kepala Keluarga" (seharusnya tepat 1). */
  jumlahKepala: number
  /** Anggota dengan kolom wajib yang masih kosong. */
  kosong: { nik: string; nama: string; field: string[] }[]
  /** true bila tidak ada masalah di atas. */
  lengkap: boolean
}

const kosongStr = (v: unknown) => String(v ?? '').trim() === ''

export function cekKelengkapanKK(anggota: readonly Penduduk[]): KelengkapanKK {
  const kepala = anggota.filter((p) => p.hubungan_keluarga === 'Kepala Keluarga')
  const kosong: KelengkapanKK['kosong'] = []
  for (const p of anggota) {
    const field: string[] = KOLOM_WAJIB_KK.filter(([k]) => kosongStr(p[k])).map(([, label]) => label)
    if (p.hubungan_keluarga === 'Kepala Keluarga') {
      field.push(...KOLOM_WAJIB_KEPALA.filter(([k]) => kosongStr(p[k])).map(([, label]) => label))
    }
    if (field.length > 0) kosong.push({ nik: p.nik, nama: p.nama_lengkap || p.nik || '(tanpa nama)', field })
  }
  const tanpaKepala = kepala.length === 0
  return { tanpaKepala, jumlahKepala: kepala.length, kosong, lengkap: !tanpaKepala && kepala.length === 1 && kosong.length === 0 }
}
