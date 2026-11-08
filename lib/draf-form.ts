/**
 * draf-form.ts — isian form Tambah (Pindah keluar/masuk, Kelahiran, Kematian) yang belum disimpan.
 *
 * Saat petugas meninggalkan halaman lewat menu samping dengan form terbuka, isian TIDAK hilang: disimpan di memori
 * aplikasi (satu sesi), dan form terbuka lagi dengan isian yang sama begitu halaman dibuka kembali.
 * Draf dibuang bila form ditutup (Batal / Tutup form), berhasil disimpan, atau keluar akun. Sengaja hanya di memori (bukan
 * localStorage): data pribadi (NIK, nama) tidak tertinggal di perangkat dan hilang saat halaman dimuat ulang.
 *
 * Kunci: `<halaman>.<tab>.<bagian>`, mis. "mutasi.masuk.form". "Tab draf" = dua segmen pertama ("mutasi.masuk").
 */

const draf = new Map<string, unknown>()
// Tab yang baru ditutup: tulisan susulan dari komponen yang belum dilepas diabaikan, supaya draf yang sudah dibuang tidak hidup lagi.
const ditutup = new Set<string>()

const tabDari = (kunci: string): string => kunci.split('.').slice(0, 2).join('.')

export function bacaDraf<T>(kunci: string): T | undefined {
  return draf.has(kunci) ? (draf.get(kunci) as T) : undefined
}

export function tulisDraf(kunci: string, nilai: unknown): void {
  if (ditutup.has(tabDari(kunci))) return
  draf.set(kunci, nilai)
}

/** Form tab ini dibuka (lagi): tulisan draf diizinkan. */
export function bukaDraf(tab: string): void {
  ditutup.delete(tab)
}

/** Form tab ini ditutup/tersimpan: semua draf-nya dibuang. */
export function buangDraf(tab: string): void {
  for (const k of [...draf.keys()]) if (tabDari(k) === tab) draf.delete(k)
  ditutup.add(tab)
}

/** Tab (dari daftar `tabs` pada `halaman`) yang punya draf; null bila tidak ada. */
export function tabBerDraf(halaman: string, tabs: readonly string[]): string | null {
  for (const t of tabs) {
    const tab = `${halaman}.${t}`
    if ([...draf.keys()].some((k) => tabDari(k) === tab)) return t
  }
  return null
}

/** Keluar akun / pengosongan total. */
export function buangSemuaDraf(): void {
  draf.clear()
  ditutup.clear()
}
