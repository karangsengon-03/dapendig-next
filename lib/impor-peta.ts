/**
 * impor-peta.ts
 * Pemetaan kolom file Excel ke field penduduk pada fitur Impor. Fungsi murni (tanpa Firebase/React) agar bisa dites.
 *
 * Aturan:
 *  1. Nama kolom yang PERSIS sama (setelah dinormalisasi) dengan key/label field atau sinonim bakunya → langsung dipetakan.
 *  2. Selain itu dipakai heuristik berbasis kata (token). Bila lebih dari SATU field yang masuk akal
 *     (mis. "Alamat KK", "Nama KK", "Tempat/Tgl Lahir") → '' (— skip —): lebih baik dilewati daripada salah petak.
 *  3. Kolom yang tidak dikenali → '' (— skip —).
 * Kesalahan lama: "Hub.KK" dipetakan ke "No. KK" karena heuristik mencari substring "kk" lebih dulu.
 */

export interface FieldImpor {
  k: string
  l: string
}

export const KDPD: readonly FieldImpor[] = [
  { k: 'id', l: 'ID Dokumen' },
  { k: 'no_kk', l: 'No. KK' },
  { k: 'nik', l: 'NIK' },
  { k: 'nama_lengkap', l: 'Nama Lengkap' },
  { k: 'jenis_kelamin', l: 'Jenis Kelamin' },
  { k: 'hubungan_keluarga', l: 'Hubungan Keluarga' },
  { k: 'status_perkawinan', l: 'Status Perkawinan' },
  { k: 'pendidikan', l: 'Pendidikan' },
  { k: 'pekerjaan', l: 'Pekerjaan' },
  { k: 'golongan_darah', l: 'Golongan Darah' },
  { k: 'agama', l: 'Agama' },
  { k: 'tempat_lahir', l: 'Tempat Lahir' },
  { k: 'tanggal_lahir', l: 'Tanggal Lahir' },
  { k: 'nama_ibu', l: 'Nama Ibu' },
  { k: 'nama_ayah', l: 'Nama Ayah' },
  { k: 'rt', l: 'RT' },
  { k: 'rw', l: 'RW' },
  { k: 'alamat', l: 'Alamat' },
  { k: 'status', l: 'Status' },
]

/** Header pada berkas template yang diunduh pengguna (downloadTemplate memakai persis daftar ini). */
export const TEMPLATE_HEADERS: readonly string[] = [
  'No.KK', 'NIK', 'Nama', 'JK', 'Hub.KK', 'Kawin', 'Pendidikan', 'Pekerjaan', 'Gol.Darah', 'Agama',
  'Tmp.Lahir', 'Tgl.Lahir', 'Nama Ibu', 'Nama Ayah', 'RT', 'RW', 'Status',
]

function normalisasi(s: string): string {
  return s.toLowerCase().replace(/[\s._\-/]/g, '')
}

/** Nama kolom (normalisasi, tanpa spasi/titik/garis) yang BAKU untuk satu field. */
const SINONIM: Record<string, string> = {
  id: 'id', iddokumen: 'id', docid: 'id',
  nokk: 'no_kk', kk: 'no_kk', nomorkk: 'no_kk', nokartukeluarga: 'no_kk', nomorkartukeluarga: 'no_kk',
  nik: 'nik', nonik: 'nik', nomornik: 'nik',
  nama: 'nama_lengkap', namalengkap: 'nama_lengkap',
  jk: 'jenis_kelamin', jeniskelamin: 'jenis_kelamin', gender: 'jenis_kelamin',
  hub: 'hubungan_keluarga', hubkk: 'hubungan_keluarga', hubkel: 'hubungan_keluarga', hubungan: 'hubungan_keluarga',
  hubungankeluarga: 'hubungan_keluarga', hubungankk: 'hubungan_keluarga', shdk: 'hubungan_keluarga',
  kawin: 'status_perkawinan', statuskawin: 'status_perkawinan', statusperkawinan: 'status_perkawinan', perkawinan: 'status_perkawinan',
  pendidikan: 'pendidikan', pekerjaan: 'pekerjaan',
  goldarah: 'golongan_darah', golongandarah: 'golongan_darah', darah: 'golongan_darah',
  agama: 'agama',
  tmplahir: 'tempat_lahir', tempatlahir: 'tempat_lahir',
  tgllahir: 'tanggal_lahir', tanggallahir: 'tanggal_lahir',
  namaibu: 'nama_ibu', namaayah: 'nama_ayah',
  rt: 'rt', rw: 'rw', alamat: 'alamat', status: 'status',
}

/** Kata yang menandakan kolom "Nama ..." BUKAN nama penduduk itu sendiri. */
const KATA_NAMA_LAIN = ['kepala', 'suami', 'istri', 'pasangan', 'wali', 'pelapor', 'saksi', 'anak', 'kk']

/**
 * @returns key field penduduk, atau '' bila tidak dikenali / ambigu (berarti "— skip —").
 */
export function petakanKolomExcel(namaKolom: string): string {
  const mentah = String(namaKolom ?? '').trim()
  if (!mentah) return ''
  const n = normalisasi(mentah)

  // 1) cocok persis dengan key/label field atau sinonim baku
  for (const { k, l } of KDPD) {
    if (normalisasi(k) === n || normalisasi(l) === n) return k
  }
  if (SINONIM[n]) return SINONIM[n]

  // 2) heuristik berbasis kata
  const token = mentah.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const ada = (...kata: string[]) => kata.some((w) => token.includes(w))
  const mengandung = (...bagian: string[]) => bagian.some((b) => n.includes(b))

  const kandidat = new Set<string>()
  if (ada('kk') || (ada('kartu') && ada('keluarga'))) kandidat.add('no_kk')
  if (ada('nik')) kandidat.add('nik')
  if (ada('nama') && ada('ibu')) kandidat.add('nama_ibu')
  if (ada('nama') && ada('ayah', 'bapak')) kandidat.add('nama_ayah')
  if (ada('nama') && !ada('ibu', 'ayah', 'bapak') && !ada(...KATA_NAMA_LAIN)) kandidat.add('nama_lengkap')
  if (ada('jk', 'sex', 'gender') || mengandung('kelamin')) kandidat.add('jenis_kelamin')
  if (ada('hub', 'hubungan', 'shdk', 'hubkel')) kandidat.add('hubungan_keluarga')
  if (mengandung('kawin', 'perkawinan') || ada('nikah')) kandidat.add('status_perkawinan')
  if (mengandung('pendidikan', 'didik')) kandidat.add('pendidikan')
  if (mengandung('pekerjaan', 'kerja')) kandidat.add('pekerjaan')
  if (mengandung('darah') || ada('gol')) kandidat.add('golongan_darah')
  if (mengandung('agama')) kandidat.add('agama')
  if (ada('tmp') || (ada('tempat') && ada('lahir'))) kandidat.add('tempat_lahir')
  if ((ada('tgl', 'tanggal') && ada('lahir')) || ada('tgllahir')) kandidat.add('tanggal_lahir')
  if (mengandung('alamat')) kandidat.add('alamat')
  if (ada('rt')) kandidat.add('rt')
  if (ada('rw')) kandidat.add('rw')
  if (ada('status')) kandidat.add('status')

  // Kata yang lebih spesifik mengalahkan yang umum pada kolom yang sama
  if (kandidat.has('nama_ibu') || kandidat.has('nama_ayah')) kandidat.delete('nama_lengkap')
  if (kandidat.has('status_perkawinan')) kandidat.delete('status')
  if (kandidat.has('hubungan_keluarga')) kandidat.delete('no_kk') // "Hub. dalam KK": KK hanya keterangan hubungan

  // Nama orang lain (mis. "Nama Kepala Keluarga", "Nama KK") bukan nama penduduk: dilewati
  if (ada('nama') && ada(...KATA_NAMA_LAIN) && !ada('ibu', 'ayah', 'bapak')) return ''

  return kandidat.size === 1 ? [...kandidat][0] : ''
}
