/**
 * dusun.ts — pemetaan RT → Dusun yang bisa diatur di Pengaturan ("Dusun dan RT"), disimpan di dokumen `config/dusun`.
 *
 * Dulu pemetaan ini tertulis tetap di hook dashboard sehingga aplikasi hanya cocok untuk satu desa. Sekarang:
 *  - Satu dusun = nama + daftar RT (tidak harus berurutan: RT 007 boleh masuk dusun yang sama dengan RT 001–003).
 *  - Pilihan RT di semua form dan filter = gabungan RT dari semua dusun. Menambah/menghapus RT di sini mengubah pilihannya.
 *  - Satu RT hanya boleh berada di satu dusun; nama dusun unik.
 *  - Belum ada dokumen → memakai DUSUN_BAWAAN (pemetaan Desa Karang Sengon), jadi perilaku lama tidak berubah.
 * RW juga dapat diatur (daftar RW desa; bawaan 001–005) dan disimpan di dokumen yang sama.
 * Berkas ini murni (tanpa Firebase) supaya mudah diuji dan aman diimpor komponen.
 */
import { rt3 } from '@/lib/rt-rw'

export interface DusunItem {
  nama: string
  /** RT 3 digit ("001"). */
  rt: string[]
}

export const DUSUN_BAWAAN: DusunItem[] = [
  { nama: 'Pesanggrahan', rt: ['001', '002', '003', '007'] },
  { nama: 'Paleran', rt: ['004', '005', '006'] },
  { nama: 'Sumber', rt: ['008', '009'] },
  { nama: 'Blangguan', rt: ['010', '011'] },
]

export const urutRt = (a: string, b: string) => Number(a) - Number(b) || a.localeCompare(b)

/** Rapikan data mentah (mis. dari Firestore): nama dipangkas, RT jadi 3 digit, unik, dan terurut. Bentuk tidak valid atau kosong → null. */
export function normalisasiDusun(mentah: unknown): DusunItem[] | null {
  if (!Array.isArray(mentah)) return null
  const hasil: DusunItem[] = []
  for (const it of mentah) {
    if (!it || typeof it !== 'object') return null
    const { nama, rt } = it as { nama?: unknown; rt?: unknown }
    if (typeof nama !== 'string' || !Array.isArray(rt)) return null
    const daftar = [...new Set(rt.map((r) => rt3(r as string | number)).filter(Boolean))].sort(urutRt)
    hasil.push({ nama: nama.trim(), rt: daftar })
  }
  return hasil.length > 0 ? hasil : null
}

/** Semua RT dari semua dusun, unik dan terurut. Inilah pilihan RT di form dan filter. */
export function daftarRt(dusun: readonly DusunItem[]): string[] {
  return [...new Set(dusun.flatMap((d) => d.rt.map((r) => rt3(r))).filter(Boolean))].sort(urutRt)
}

/** Nama dusun untuk sebuah RT; "" bila RT kosong atau belum masuk dusun mana pun. */
export function dusunDariRt(rt: string | number | null | undefined, dusun: readonly DusunItem[]): string {
  const v = rt3(rt)
  if (!v) return ''
  return dusun.find((d) => d.rt.some((r) => rt3(r) === v))?.nama ?? ''
}

export interface GalatDusun {
  umum?: string
  /** Satu entri per dusun, urutan sama dengan masukan. */
  baris: { nama?: string; rt?: string }[]
  ada: boolean
}

export function validasiDusun(dusun: readonly DusunItem[]): GalatDusun {
  const baris: GalatDusun['baris'] = dusun.map(() => ({}))
  if (dusun.length === 0) return { umum: 'Minimal harus ada satu dusun.', baris, ada: true }
  const namaTerpakai = new Set<string>()
  const pemilikRt = new Map<string, number>()
  dusun.forEach((d, i) => {
    const nama = d.nama.trim()
    if (!nama) baris[i].nama = 'Nama dusun wajib diisi'
    else if (namaTerpakai.has(nama.toLowerCase())) baris[i].nama = 'Nama dusun sudah dipakai dusun lain'
    else namaTerpakai.add(nama.toLowerCase())

    if (d.rt.length === 0) baris[i].rt = 'Pilih minimal satu RT'
    for (const r of d.rt) {
      if (!/^\d{1,3}$/.test(r.trim())) { baris[i].rt = `RT "${r}" tidak valid (angka 0–999)`; continue }
      const v = rt3(r)
      const pemilik = pemilikRt.get(v)
      if (pemilik === undefined) pemilikRt.set(v, i)
      else if (pemilik !== i) baris[i].rt = `RT ${v} sudah ada di dusun ${dusun[pemilik].nama.trim() || 'lain'}`
    }
  })
  const ada = baris.some((b) => b.nama || b.rt)
  return { baris, ada }
}

// ── RW ──
/** Bawaan = daftar RW lama (001–005); dikunci tes. */
export const RW_BAWAAN: string[] = ['001', '002', '003', '004', '005']

/** Rapikan daftar RW: 3 digit, unik, terurut. Bukan daftar atau kosong → null. */
export function normalisasiRw(mentah: unknown): string[] | null {
  if (!Array.isArray(mentah)) return null
  const hasil = [...new Set(mentah.map((r) => rt3(r as string | number)).filter(Boolean))].sort(urutRt)
  return hasil.length > 0 ? hasil : null
}

/** Pesan galat untuk daftar RW; undefined bila valid. */
export function validasiRw(rw: readonly string[]): string | undefined {
  if (rw.length === 0) return 'Minimal harus ada satu RW.'
  for (const r of rw) if (!/^\d{1,3}$/.test(r.trim())) return `RW "${r}" tidak valid (angka 0–999)`
  return undefined
}

// ── RT/RW yang dipakai data penduduk ─────────────────────────────────────────
// Data penduduk adalah sumber kebenaran: RT/RW yang ada di data selalu tampil apa adanya dan menjadi pilihan di form/filter,
// walau belum didaftarkan di Pengaturan. Yang sudah terdaftar DAN dipakai penduduk dikunci (tidak bisa dihapus) di Pengaturan.

export const NAMA_DUSUN_LAIN = 'Lain-lain'

export interface RtRwTerpakai { rt: Record<string, number>; rw: Record<string, number> }

/** Jumlah penduduk per RT dan per RW (3 digit; "0" = "000"). RT/RW kosong tidak dihitung. Beri baris penduduk aktif saja. */
export function hitungRtRwTerpakai(rows: readonly { rt?: string | number | null; rw?: string | number | null }[]): RtRwTerpakai {
  const hasil: RtRwTerpakai = { rt: {}, rw: {} }
  for (const r of rows) {
    const a = rt3(r.rt)
    const b = rt3(r.rw)
    if (a) hasil.rt[a] = (hasil.rt[a] ?? 0) + 1
    if (b) hasil.rw[b] = (hasil.rw[b] ?? 0) + 1
  }
  return hasil
}

/** Gabungan daftar terdaftar dan yang dipakai data; unik dan terurut. Dipakai untuk pilihan RT/RW di form dan filter. */
export function gabungPilihan(terdaftar: readonly string[], terpakai: Record<string, number>): string[] {
  return [...new Set([...terdaftar.map((r) => rt3(r)), ...Object.keys(terpakai)].filter(Boolean))].sort(urutRt)
}

/** RT yang dipakai penduduk tetapi belum masuk dusun mana pun. */
export function rtBelumTerdaftar(dusun: readonly DusunItem[], terpakai: Record<string, number>): string[] {
  const resmi = new Set(daftarRt(dusun))
  return Object.keys(terpakai).filter((r) => !resmi.has(r)).sort(urutRt)
}

/** RW yang dipakai penduduk tetapi belum ada di Daftar RW. */
export function rwBelumTerdaftar(rw: readonly string[], terpakai: Record<string, number>): string[] {
  const resmi = new Set(rw.map((r) => rt3(r)))
  return Object.keys(terpakai).filter((r) => !resmi.has(r)).sort(urutRt)
}

/** Daftarkan semua RT/RW yang dipakai data tetapi belum terdaftar: RT masuk dusun "Lain-lain" (dibuat bila belum ada), RW masuk Daftar RW. */
export function daftarkanTerpakai(
  dusun: readonly DusunItem[], rw: readonly string[], terpakai: RtRwTerpakai,
): { dusun: DusunItem[]; rw: string[] } {
  const rtBaru = rtBelumTerdaftar(dusun, terpakai.rt)
  const rwBaru = rwBelumTerdaftar(rw, terpakai.rw)
  let dusunBaru = dusun.map((d) => ({ ...d, rt: [...d.rt] }))
  if (rtBaru.length > 0) {
    const i = dusunBaru.findIndex((d) => d.nama.trim().toLowerCase() === NAMA_DUSUN_LAIN.toLowerCase())
    if (i >= 0) dusunBaru[i] = { ...dusunBaru[i], rt: [...dusunBaru[i].rt, ...rtBaru].sort(urutRt) }
    else dusunBaru = [...dusunBaru, { nama: NAMA_DUSUN_LAIN, rt: rtBaru }]
  }
  return { dusun: dusunBaru, rw: [...rw, ...rwBaru].sort(urutRt) }
}
