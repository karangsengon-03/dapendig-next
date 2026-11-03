/**
 * Penolakan yang disengaja oleh logika aplikasi (mis. NIK sudah terdaftar, penduduk masih berstatus
 * pindah keluar), BUKAN galat jaringan atau izin. Pesannya aman ditampilkan langsung ke pengguna.
 */
export class GalatTolak extends Error {
  constructor(pesan: string) {
    super(pesan)
    this.name = 'GalatTolak'
  }
}
