# Verifikasi Visual — Recharts v2 → v3 (v2.9.0)

Sama seperti upgrade jsPDF sebelumnya: semua yang bisa saya verifikasi lewat
kode (tsc, lint, test, build, smoke test HTTP) sudah lolos bersih. Yang
TIDAK bisa saya pastikan dari sandbox ini adalah tampilan visual chart yang
sebenarnya — karena saya tidak bisa merender browser sungguhan di sini.

## Cara cek cepat (± 1 menit)

1. `npm install` lalu `npm run dev`
2. Buka halaman **Beranda/Dashboard** — cek donut chart "Jenis Kelamin"
   dan bar chart RT di bagian bawah
3. Buka halaman **Monografi** — cek bar chart kelompok umur
4. Untuk masing-masing, cek:
   - [ ] Warna tiap batang/potongan masih sesuai (biru untuk laki-laki,
     ungu untuk perempuan, dst — warna didefinisikan di `COLORS` array
     tiap file, TIDAK berubah oleh upgrade ini)
   - [ ] Hover ke salah satu batang/potongan → tooltip muncul dengan
     angka yang benar (mis. "514 jiwa (47.0%)")
   - [ ] Angka di tooltip cocok dengan angka di legenda/label di
     bawahnya

## Kalau ada yang beda

Kemungkinan besar bukan soal warna/layout (itu murni CSS kita sendiri,
tidak disentuh), tapi soal perilaku tooltip — recharts v3 mengubah tipe
data yang diterima fungsi `formatter`, dan saya sudah perbaiki di 3 file
(`GenderChart.tsx`, `RTChart.tsx`, `UmurChart.tsx`) dengan type guard
`typeof value === 'number'`. Kalau tooltip menampilkan angka aneh (mis.
"0 jiwa" padahal harusnya ada data), kemungkinan ada bentuk data yang
belum saya antisipasi — beri tahu saya persis chart mana dan datanya
seperti apa, saya bisa telusuri titik spesifik itu.

## Kalau mau lebih aman: rollback

```bash
npm install recharts@2.15.4 --save
```
Lalu kembalikan 3 baris `formatter` di ketiga file chart ke versi
`(value: number) =>` seperti semula (lihat riwayat chat untuk kode
persisnya) — meski sebenarnya kode yang sekarang (dengan type guard)
tetap kompatibel dengan v2 juga, jadi rollback murni ganti versi paket
saja sudah cukup aman tanpa perlu ubah kode lagi.
