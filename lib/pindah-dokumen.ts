/**
 * pindah-dokumen.ts
 * Memindahkan dokumen ke ID baru (mis. ID acak → NIK) secara ATOMIK dan AMAN:
 *  - ditolak ('bentrok') bila dokumen ber-ID baru sudah ada: TIDAK menimpa diam-diam
 *    (kasus ini diselesaikan lewat Fix Duplikat);
 *  - dilewati ('hilang') bila dokumen lama sudah tidak ada (mis. sudah dipindah di proses sebelumnya):
 *    aman dijalankan dua kali;
 *  - tulis dokumen baru dan hapus dokumen lama dalam satu transaksi: keduanya terjadi atau tidak sama sekali.
 *
 * Murni: transaksi dan referensi diberikan pemanggil (halaman utilitas), jadi tidak mengimpor Firebase.
 */

export type HasilPindah = 'ok' | 'hilang' | 'bentrok'

type Dokumen = Record<string, unknown>

export interface TransaksiMinimal<R> {
  get(ref: R): Promise<{ exists(): boolean; data(): unknown }>
  set(ref: R, data: Dokumen): unknown
  delete(ref: R): unknown
}

export async function pindahDokumenAtomik<R>(tx: TransaksiMinimal<R>, refLama: R, refBaru: R): Promise<HasilPindah> {
  // Semua baca dulu (aturan transaksi), baru tulis
  const lama = await tx.get(refLama)
  if (!lama.exists()) return 'hilang'
  const baru = await tx.get(refBaru)
  if (baru.exists()) return 'bentrok'
  tx.set(refBaru, (lama.data() ?? {}) as Dokumen)
  tx.delete(refLama)
  return 'ok'
}
