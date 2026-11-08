/**
 * keluarga.ts — jumlah keluarga (KK) dari daftar penduduk.
 * Satu definisi untuk Beranda ("dalam N kepala keluarga") dan Daftar Penduduk ("... di N kepala keluarga"), supaya angkanya selalu sama:
 * jumlah No. KK berbeda (tidak kosong), bukan jumlah baris "Kepala Keluarga" (yang menyimpang bila ada KK tanpa kepala atau kepala ganda).
 */
export function jumlahKeluarga(rows: readonly { no_kk?: string | null }[]): number {
  return new Set(rows.map((r) => (r.no_kk ?? '').trim()).filter(Boolean)).size
}
