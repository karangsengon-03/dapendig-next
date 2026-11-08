/**
 * wilayah.ts — identitas desa (nama desa, kecamatan, kabupaten) untuk seluruh tampilan aplikasi.
 * Sumber utamanya Pengaturan → Informasi wilayah (config/wilayah → useAppStore().wilayah). Tidak ada nama desa yang tertanam di kode:
 * semua label, alamat bawaan form, dan teks migrasi dibuat dari fungsi di sini.
 *
 * Layar sebelum masuk (Login, memuat) belum bisa membaca Firestore, jadi nama desa terakhir disimpan di perangkat (localStorage)
 * setiap kali konfigurasi dimuat atau disimpan, dan dipakai sebagai tampilan sementara.
 */

export interface IdentitasDesa {
  desa: string
  kecamatan: string
  kabupaten: string
}

type Sumber = { desa?: string | null; kecamatan?: string | null; kabupaten?: string | null } | null | undefined

const rapi = (s: string | null | undefined): string => (s ?? '').trim()

export const IDENTITAS_KOSONG: IdentitasDesa = { desa: '', kecamatan: '', kabupaten: '' }

/** "Desa Karang Sengon"; kosong bila nama desa belum diisi. */
export function labelDesa(w: Sumber): string {
  const d = rapi(w?.desa)
  return d ? `Desa ${d}` : ''
}

/** "Kec. Klabang, Kab. Bondowoso"; bagian yang kosong dilewati. */
export function labelKecKab(w: Sumber): string {
  return [rapi(w?.kecamatan) && `Kec. ${rapi(w?.kecamatan)}`, rapi(w?.kabupaten) && `Kab. ${rapi(w?.kabupaten)}`].filter(Boolean).join(', ')
}

/** "Pemerintah Desa Karang Sengon, Kec. Klabang, Kab. Bondowoso" (tanpa bagian yang belum diisi). */
export function labelPemerintahDesa(w: Sumber): string {
  return ['Pemerintah', labelDesa(w) || 'Desa'].join(' ') + (labelKecKab(w) ? `, ${labelKecKab(w)}` : '')
}

/** Alamat bawaan untuk penduduk baru: nama desa huruf besar ("KARANG SENGON"); kosong bila nama desa belum diisi. */
export function alamatBawaan(w: Sumber): string {
  return rapi(w?.desa).toUpperCase()
}

/** Teks contoh pada kolom alamat. */
export function contohAlamat(w: Sumber): string {
  return `Contoh: ${alamatBawaan(w) || 'NAMA DESA'}`
}

// ── Cadangan di perangkat untuk layar sebelum masuk ──────────────────────────
export const KUNCI_IDENTITAS = 'dapendig_identitas_desa'

export function simpanIdentitas(w: Sumber): void {
  try {
    if (typeof window === 'undefined') return
    const i: IdentitasDesa = { desa: rapi(w?.desa), kecamatan: rapi(w?.kecamatan), kabupaten: rapi(w?.kabupaten) }
    if (!i.desa) window.localStorage.removeItem(KUNCI_IDENTITAS)
    else window.localStorage.setItem(KUNCI_IDENTITAS, JSON.stringify(i))
  } catch { /* penyimpanan tidak tersedia: tampilan sementara saja yang hilang */ }
}

/** Uraikan isi cadangan; null bila kosong atau rusak. */
export function uraiIdentitas(mentah: string | null | undefined): IdentitasDesa | null {
  if (!mentah) return null
  try {
    const o = JSON.parse(mentah) as Sumber
    const i: IdentitasDesa = { desa: rapi(o?.desa), kecamatan: rapi(o?.kecamatan), kabupaten: rapi(o?.kabupaten) }
    return i.desa ? i : null
  } catch { return null }
}
