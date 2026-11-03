/**
 * validasi-catatan.ts
 * Validasi catatan Mutasi (pindah keluar/masuk) dan Vital (kelahiran/kematian). Satu sumber aturan dan pesan
 * untuk form TAMBAH dan modal EDIT, supaya keduanya tidak berbeda. Fungsi murni.
 * Mengembalikan objek { namaField: pesanGalat }; kosong = valid.
 */

export type GalatForm = Record<string, string>

const DIGIT16 = /^\d{16}$/

/** Pesan baku (persis seperti form Tambah). */
export const PESAN = {
  nama: 'Nama wajib diisi',
  nik: 'NIK harus 16 digit angka',
  noKk: 'No. KK harus 16 digit angka',
} as const

/** Pesan untuk pilihan yang tercetak di KK dan wajib dipilih (tanpa nilai bawaan yang bisa salah diam-diam). */
export const PESAN_KK = {
  jenis_kelamin: 'Jenis kelamin wajib dipilih',
  agama: 'Agama wajib dipilih',
  hubungan_keluarga: 'Hubungan keluarga wajib dipilih',
  status_perkawinan: 'Status perkawinan wajib dipilih',
  pendidikan: 'Pendidikan wajib dipilih',
  pekerjaan: 'Pekerjaan wajib dipilih',
  alamat: 'Alamat Kepala Keluarga wajib diisi',
} as const

export type IsianKK = {
  jenis_kelamin?: string
  agama?: string
  hubungan_keluarga?: string
  status_perkawinan?: string
  pendidikan?: string
  pekerjaan?: string
  alamat?: string
}

/**
 * Isian yang tercetak di KK dan tidak boleh kosong. Golongan darah, nama ayah, dan nama ibu opsional (kosong dicetak "-").
 * Alamat wajib hanya untuk Kepala Keluarga, karena KK mencetak alamat Kepala Keluarga.
 */
export function validasiIsianKK(f: IsianKK): GalatForm {
  const e: GalatForm = {}
  for (const k of ['jenis_kelamin', 'agama', 'hubungan_keluarga', 'status_perkawinan', 'pendidikan', 'pekerjaan'] as const) {
    if (!(f[k] ?? '').trim()) e[k] = PESAN_KK[k]
  }
  if (f.hubungan_keluarga === 'Kepala Keluarga' && !(f.alamat ?? '').trim()) e.alamat = PESAN_KK.alamat
  return e
}

export function validasiPindahKeluar(
  f: { nama: string; nik_target: string; no_kk: string; tujuan: string; tanggal: string },
  perorangan = true,
): GalatForm {
  const e: GalatForm = {}
  if (perorangan) {
    if (!f.nama.trim()) e.nama = PESAN.nama
    if (!DIGIT16.test(f.nik_target)) e.nik_target = PESAN.nik
  }
  if (!DIGIT16.test(f.no_kk)) e.no_kk = PESAN.noKk
  if (!f.tujuan.trim()) e.tujuan = 'Tujuan wajib diisi'
  if (!f.tanggal) e.tanggal = 'Tanggal wajib diisi'
  return e
}

/** @param lengkap false = modal Edit (tidak punya isian tempat/tanggal lahir): keduanya tidak diperiksa. */
export function validasiPindahMasuk(
  f: { nama_lengkap: string; nik: string; no_kk: string; asal_daerah: string; tanggal: string; tanggal_lahir?: string; tempat_lahir?: string } & IsianKK,
  lengkap = true,
): GalatForm {
  const e: GalatForm = {}
  if (!f.nama_lengkap.trim()) e.nama_lengkap = PESAN.nama
  if (!DIGIT16.test(f.nik)) e.nik = PESAN.nik
  if (!DIGIT16.test(f.no_kk)) e.no_kk = PESAN.noKk
  if (!f.asal_daerah.trim()) e.asal_daerah = 'Asal daerah wajib diisi'
  if (lengkap) {
    if (!f.tanggal_lahir) e.tanggal_lahir = 'Tanggal lahir wajib diisi'
    if (!(f.tempat_lahir ?? '').trim()) e.tempat_lahir = 'Tempat lahir wajib diisi'
  }
  if (!f.tanggal) e.tanggal = 'Tanggal masuk wajib diisi'
  return { ...e, ...validasiIsianKK(f) }
}

export function validasiKelahiran(f: {
  nama_lengkap: string; nik: string; no_kk: string; tanggal_lahir: string; tempat_lahir: string; nama_ayah: string; nama_ibu: string
} & IsianKK): GalatForm {
  const e: GalatForm = {}
  if (!f.nama_lengkap.trim()) e.nama_lengkap = 'Nama bayi wajib diisi'
  if (!DIGIT16.test(f.nik)) e.nik = PESAN.nik
  if (!DIGIT16.test(f.no_kk)) e.no_kk = PESAN.noKk
  if (!f.tanggal_lahir) e.tanggal_lahir = 'Tanggal lahir wajib diisi'
  if (!f.tempat_lahir.trim()) e.tempat_lahir = 'Tempat lahir wajib diisi'
  if (!f.nama_ayah.trim()) e.nama_ayah = 'Nama ayah wajib diisi'
  if (!f.nama_ibu.trim()) e.nama_ibu = 'Nama ibu wajib diisi'
  return { ...e, ...validasiIsianKK(f) }
}

export function validasiKematian(f: { nama: string; nik_target: string; no_kk: string; sebab: string; tanggal: string }): GalatForm {
  const e: GalatForm = {}
  if (!f.nama.trim()) e.nama = PESAN.nama
  if (!DIGIT16.test(f.nik_target)) e.nik_target = PESAN.nik
  if (!DIGIT16.test(f.no_kk)) e.no_kk = PESAN.noKk
  if (!f.sebab.trim()) e.sebab = 'Sebab kematian wajib diisi'
  if (!f.tanggal) e.tanggal = 'Tanggal wajib diisi'
  return e
}
