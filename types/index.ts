import { Timestamp } from 'firebase/firestore'
import type {
  HubunganKeluarga,
  JenisKelamin,
  Agama,
  Pendidikan,
  Pekerjaan,
  StatusPerkawinan,
} from '@/lib/penduduk-constants'

export interface Penduduk {
  id: string
  nik: string
  nama_lengkap: string
  no_kk: string
  hubungan_keluarga: HubunganKeluarga
  nama_ayah?: string
  nama_ibu?: string
  jenis_kelamin: JenisKelamin
  tempat_lahir: string
  tanggal_lahir: string // YYYY-MM-DD
  agama: Agama
  golongan_darah?: string
  pendidikan: Pendidikan
  pekerjaan: Pekerjaan
  status_perkawinan: StatusPerkawinan
  rt: string
  rw: string
  alamat?: string
  status: 'aktif' | 'tidak aktif' | 'meninggal' | 'mutasi-keluar'
  hub_asli_backup?: string
  created_at?: Timestamp | string
  updated_at?: Timestamp | string
  created_by?: string
  updated_by?: string
}

export type PendudukFormData = Omit<Penduduk, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>

// Koleksi: lahir — field aktual dari Firestore
export interface Lahir {
  id: string
  nama_lengkap: string
  nik: string
  no_kk: string
  jenis_kelamin: JenisKelamin
  agama: Agama
  hubungan_keluarga: HubunganKeluarga
  nama_ayah: string
  nama_ibu: string
  rt: string
  rw: string
  status: 'aktif' | 'tidak aktif'
  status_perkawinan: StatusPerkawinan
  tanggal_lahir: string
  tempat_lahir: string
  pendidikan: string
  pekerjaan: string
  alamat: string
  created_at?: Timestamp | string
  created_by?: string
}

// Koleksi: meninggal — field aktual dari Firestore
export interface Meninggal {
  id: string
  nama: string
  nik_target: string
  no_kk: string
  hub_asli: string
  sebab: string
  tanggal: string
  created_at?: Timestamp | string
  created_by?: string
}

// Koleksi: mutasi_keluar — field aktual dari Firestore
export interface MutasiKeluar {
  id: string
  nama: string
  nik_target: string
  no_kk: string
  alasan: string
  tujuan: string
  tanggal: string
  created_at?: Timestamp | string
  created_by?: string
}

// Koleksi: mutasi_masuk — field aktual dari Firestore (data lengkap seperti penduduk)
export interface MutasiMasuk {
  id: string
  nama_lengkap: string
  nik: string
  no_kk: string
  agama: Agama
  asal_daerah: string
  hubungan_keluarga: HubunganKeluarga
  jenis_kelamin: JenisKelamin
  nama_ayah: string
  nama_ibu: string
  pekerjaan: Pekerjaan
  pendidikan: Pendidikan
  rt: string
  rw: string
  status: 'aktif' | 'tidak aktif'
  status_perkawinan: StatusPerkawinan
  tanggal: string
  tanggal_lahir: string
  tempat_lahir: string
  golongan_darah?: string
  created_at?: Timestamp | string
  updated_at?: Timestamp | string
  created_by?: string
}

export interface LogEntry {
  id: string
  aksi: string
  koleksi?: string
  nama?: string
  keterangan?: string
  nik_target?: string
  oleh: string
  ts: Timestamp
}

// config/wilayah — path aktual di Firestore
export interface ConfigWilayah {
  desa: string
  kecamatan: string
  kabupaten: string
  provinsi: string
  tahun?: string
  updated_at?: Timestamp | string
  updated_by?: string
}

export type WilayahConfig = ConfigWilayah

export type UserRole = 'admin' | 'operator' | 'viewer'

// users/{uid} — field aktual: email, nama, role
export interface AppUser {
  uid: string
  email: string
  nama?: string
  role: UserRole
}

// recycle_bin/{id}
export interface RecycleBinItem {
  id: string
  data_asli: Penduduk
  dihapus_oleh: string
  dihapus_at: Timestamp
}
