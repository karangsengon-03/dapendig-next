/**
 * angka.ts — pembersih isian nomor (NIK dan No. KK).
 * Hanya angka dan maksimal 16 digit. Dipakai di onChange semua isian NIK/No. KK (form Tambah, modal Edit, Edit penduduk)
 * sehingga huruf tidak bisa masuk dan nomor yang ditempel dengan spasi/titik/strip ("3511 0300-0000.1826")
 * tetap menjadi 16 digit utuh. Atribut maxLength sengaja tidak dipakai di isian ini: peramban memotong teks tempelan
 * SEBELUM onChange, sehingga spasi dan strip ikut menghabiskan batas dan digit di ujung hilang tanpa pesan.
 */
export const PANJANG_NOMOR = 16

export function angka16(v: string): string {
  return v.replace(/\D/g, '').slice(0, PANJANG_NOMOR)
}
