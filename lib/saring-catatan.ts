/**
 * saring-catatan.ts
 * Pencarian, filter RT, dan urutan untuk daftar catatan Mutasi (pindah keluar/masuk) dan Vital
 * (kelahiran/kematian). Fungsi murni, tanpa Firestore: dipakai di klien dari data yang sudah dimuat.
 */
import { parseDate } from '@/lib/dateUtils'

/* ---------- Pencarian ---------- */

/**
 * Cocokkan kata kunci dengan beberapa kolom (nama, NIK, No. KK, ...), tanpa membedakan huruf besar/kecil.
 *  - Frasa harus muncul utuh di salah satu kolom (sama seperti sebelumnya): "anak a" tidak ikut menampilkan "Anak B".
 *  - Nomor NIK/No. KK yang ditempel dengan spasi, titik, atau strip ("3511 0300-0000-1826") tetap cocok;
 *    potongan nomor juga cocok (minimal 3 angka).
 * Kata kunci kosong = cocok semua.
 */
export function cocokCari(q: string, ...nilai: (string | undefined)[]): boolean {
  const k = q.trim().toLowerCase()
  if (!k) return true
  const teks = nilai.map((v) => (v ?? '').toLowerCase())
  if (teks.some((t) => t.includes(k))) return true

  const angka = k.replace(/[\s.-]/g, '')
  return angka.length >= 3 && /^\d+$/.test(angka) && teks.some((t) => t.replace(/\D/g, '').includes(angka))
}

/* ---------- RT ---------- */

/** "001", "1", " 01 " → "1" (bandingkan RT tanpa terpengaruh nol di depan). Bukan angka → apa adanya. */
export function normalRt(rt: string | undefined): string {
  const v = (rt ?? '').trim()
  return /^\d+$/.test(v) ? String(Number(v)) : v
}

/** RT dipilih kosong = semua RT. Baris tanpa RT tidak cocok dengan RT mana pun yang dipilih. */
export function cocokRt(dipilih: string, rtBaris: string | undefined): boolean {
  if (!dipilih) return true
  const r = normalRt(rtBaris)
  return r !== '' && r === normalRt(dipilih)
}

/**
 * Peta NIK → RT dari daftar penduduk, untuk catatan yang tidak menyimpan RT (Pindah keluar, Kematian).
 * Kunci: field `nik` dan ID dokumen (ID dokumen = NIK, tetapi dokumen lama bisa ber-ID acak).
 */
export function buatPetaRt(penduduk: readonly { id?: string; nik?: string; rt?: string }[] | undefined): Map<string, string> {
  const peta = new Map<string, string>()
  for (const p of penduduk ?? []) {
    const rt = (p.rt ?? '').trim()
    if (!rt) continue
    if (p.nik) peta.set(p.nik, rt)
    if (p.id && !peta.has(p.id)) peta.set(p.id, rt)
  }
  return peta
}

/* ---------- Urutan ---------- */

export type UrutCatatan = 'terbaru' | 'terlama' | 'nama-az' | 'nama-za' | 'rt' | 'kk' | 'nik'

export const URUT_BAWAAN: UrutCatatan = 'terbaru'

/** Label disamakan dengan menu Urutan di halaman Penduduk. */
export const OPSI_URUT_CATATAN: { nilai: UrutCatatan; label: string }[] = [
  { nilai: 'terbaru', label: 'Terbaru' },
  { nilai: 'terlama', label: 'Terlama' },
  { nilai: 'nama-az', label: 'Nama A–Z' },
  { nilai: 'nama-za', label: 'Nama Z–A' },
  { nilai: 'rt', label: 'RT ↑' },
  { nilai: 'kk', label: 'No. KK ↑' },
  { nilai: 'nik', label: 'NIK ↑' },
]

/** Kolom yang dipakai untuk mengurutkan satu baris; tiap halaman memetakan jenis catatannya ke sini. */
export interface BarisUrut {
  nama: string
  nik: string
  kk: string
  /** Tanggal kejadian (pindah / masuk / lahir / meninggal), format yang dipahami `parseDate`. */
  tanggal: string
  rt: string
  /** Waktu catatan dibuat (ms) untuk memisahkan baris yang tanggalnya sama; 0 = tidak diketahui. */
  dibuat: number
}

/** `created_at` bisa Firestore Timestamp (punya toMillis), string ISO, atau kosong → milidetik (0 bila tak diketahui). */
export function waktuBuat(v: unknown): number {
  if (v && typeof v === 'object' && typeof (v as { toMillis?: unknown }).toMillis === 'function') {
    const ms = (v as { toMillis: () => number }).toMillis()
    return Number.isFinite(ms) ? ms : 0
  }
  if (typeof v === 'string') {
    const ms = Date.parse(v)
    return Number.isNaN(ms) ? 0 : ms
  }
  return 0
}

const LOKAL = 'id'

function msTanggal(t: string): number | null {
  const d = t ? parseDate(t) : null
  return d ? d.getTime() : null
}

/** Kosong selalu di akhir, apa pun arah urutannya. */
function bandingTeks(a: string, b: string, opsi: { numerik?: boolean; turun?: boolean } = {}): number {
  if (a === '' && b === '') return 0
  if (a === '') return 1
  if (b === '') return -1
  const hasil = a.localeCompare(b, LOKAL, { sensitivity: 'base', numeric: opsi.numerik ?? false })
  return opsi.turun ? -hasil : hasil
}

function bandingAngka(a: number | null, b: number | null, arah: 1 | -1): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return (a - b) * arah
}

/**
 * Urutkan baris (tidak mengubah array asli; urutan stabil).
 *  - terbaru / terlama: tanggal kejadian; tanggal sama → yang dicatat lebih akhir/awal; lalu nama A–Z.
 *  - nama A–Z / Z–A: nama; sama → tanggal terbaru dulu.
 *  - rt / kk / nik: naik; kosong di akhir; sama → nama A–Z.
 * Baris dengan tanggal tak terbaca selalu di akhir.
 */
export function urutkanCatatan<T>(baris: readonly T[], urut: UrutCatatan, ambil: (r: T) => BarisUrut): T[] {
  const dekor = baris.map((r) => {
    const k = ambil(r)
    return { r, k, t: msTanggal(k.tanggal) }
  })
  type D = (typeof dekor)[number]
  const byNama = (a: D, b: D) => bandingTeks(a.k.nama, b.k.nama)
  const byTanggalBaru = (a: D, b: D) => bandingAngka(a.t, b.t, -1)

  const banding: (a: D, b: D) => number = (() => {
    switch (urut) {
      case 'terlama':
        return (a, b) => bandingAngka(a.t, b.t, 1) || a.k.dibuat - b.k.dibuat || byNama(a, b)
      case 'nama-az':
        return (a, b) => byNama(a, b) || byTanggalBaru(a, b)
      case 'nama-za':
        return (a, b) => bandingTeks(a.k.nama, b.k.nama, { turun: true }) || byTanggalBaru(a, b)
      case 'rt':
        return (a, b) => bandingTeks(normalRt(a.k.rt), normalRt(b.k.rt), { numerik: true }) || byNama(a, b)
      case 'kk':
        return (a, b) => bandingTeks(a.k.kk, b.k.kk, { numerik: true }) || byNama(a, b)
      case 'nik':
        return (a, b) => bandingTeks(a.k.nik, b.k.nik, { numerik: true }) || byNama(a, b)
      case 'terbaru':
      default:
        return (a, b) => byTanggalBaru(a, b) || b.k.dibuat - a.k.dibuat || byNama(a, b)
    }
  })()

  return dekor.sort(banding).map((d) => d.r)
}
