# Verifikasi jsPDF v4 — Cetak KK Sementara

Ini SATU-SATUNYA hal dari perubahan `npm audit` yang tidak bisa saya
verifikasi sendiri secara otomatis (sudah saya coba pakai headless browser
di sandbox, tapi jaringan sandbox diblokir mengunduh binary Chrome). Semua
yang lain (tsc, lint, build, kompatibilitas API) sudah saya verifikasi
penuh dan lolos bersih.

Cara cek paling cepat (± 2 menit):

## Langkah

1. Jalankan `npm install` lalu `npm run dev` seperti biasa.
2. Buka halaman **Data Penduduk**, pilih satu KK yang sudah pernah
   dicetak sebelumnya (supaya ada pembanding hasil lama di memori/riwayat
   download Bapak).
3. Klik **Cetak KK Sementara** seperti biasa, tunggu PDF terdownload.
4. Buka PDF hasilnya, cocokkan 4 hal ini dengan hasil cetak lama:

   - [ ] **Watermark** — posisi, opacity, dan efek blend-nya masih sama (ini
     yang paling sensitif terhadap perubahan versi karena melibatkan
     kombinasi SVG + canvas)
   - [ ] **Font** — masih Arial, ukuran dan ketebalan terlihat sama, tidak
     ada teks yang terpotong/tumpang tindih
   - [ ] **Margin & ukuran kertas** — masih pas A4 landscape, tidak ada
     konten yang terpotong di tepi halaman
   - [ ] **Multi-halaman** (kalau KK-nya besar, lebih dari 1 halaman) —
     halaman ke-2 dst masih ter-generate dengan benar

5. Kalau ke-4nya sama persis seperti sebelumnya → aman, tidak perlu
   apa-apa lagi.

## Kalau ada yang beda

Jangan panik — kemungkinan besar cuma soal `scale` atau kompresi JPEG
(parameter `scale: 2` dan `toDataURL('image/jpeg', 0.97)` di kode masih
persis sama, tapi kalau ada, katakan ke saya persis bagian mana yang beda
(watermark/font/margin/multi-halaman), dan saya bisa langsung bandingkan
kode v2.5.1 vs v4.2.1 di bagian spesifik itu untuk cari penyebabnya —
jauh lebih cepat menelusuri kalau sudah tahu gejalanya, daripada menebak
dari awal lagi.

## Kalau mau lebih aman: rollback 1 baris

Kalau tidak sempat cek sekarang dan lebih nyaman pakai versi yang sudah
terbukti dulu, tinggal jalankan:

```bash
npm install jspdf@2.5.1 --save
cp node_modules/jspdf/dist/jspdf.umd.min.js public/vendor/jspdf.umd.min.js
```

Ini mengembalikan persis ke versi sebelumnya (kerentanan `critical` akan
muncul lagi di `npm audit`, tapi itu di dev-dependency yang tidak
langsung terekspos ke internet — jadi bukan risiko darurat kalau Bapak
lebih memilih menunggu waktu yang lebih leluasa untuk uji visual).
