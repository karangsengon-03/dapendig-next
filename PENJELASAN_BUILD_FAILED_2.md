# Build Gagal Lagi — Akar Masalah Sama, Kali Ini Saya Cek Tuntas Seluruh Repo

## Ini bukan masalah baru — komit lama yang sama terus muncul

`162232cfa692194738c14b655570be8041b590cd` — komit ini muncul lagi, sama
persis dengan penyebab kegagalan sebelumnya. Ini bukan kebetulan: ada
riwayat git lokal di komputer Bapak yang **belum benar-benar sinkron**
dengan apa yang di-push ke GitHub. Setiap kali menambal 1-2 file yang
disebut di log error, komit lama ini akan terus muncul lagi di file lain
pada push berikutnya — karena akar masalahnya di level git, bukan di
level file.

## Kali ini saya tidak menebak dari log error saja

Saya unduh SELURUH isi repo langsung dari GitHub (commit `f0f5d2c`, yang
gagal build barusan), lalu pindai SEMUA file — bukan cuma yang disebut di
pesan error. Hasilnya:

- `lib/utils.ts` — 1 konflik nyata (yang bikin build gagal kali ini)
- `components/penduduk/CetakKKModal.tsx` — **2 konflik nyata yang BELUM
  sempat bikin build gagal**, tapi akan jadi masalah di push berikutnya
  kalau tidak ikut diperbaiki sekarang. Ini titik fitur Cetak KK
  Sementara yang paling saya hati-hati — konfliknya persis di bagian
  vendor lokal vs CDN lama, dan error handling try/catch vs tidak ada.
  Sisi `HEAD` (kerja kita) sudah benar di keduanya; sisi lama tidak ada
  yang perlu dipertahankan.
- `PENJELASAN_BUILD_FAILED.md` — muncul di pencarian tapi AMAN, itu cuma
  teks contoh di dalam panduan yang saya tulis sendiri, bukan konflik
  sungguhan.

Kedua file yang saya sertakan di package ini sudah saya cek eksplisit:
nol marker konflik, dan identik byte-demi-byte dengan versi yang sudah
lolos `tsc` + `lint` + `build` penuh sebelumnya di sesi kita.

## Supaya siklus ini benar-benar berhenti (bukan sekadar tambal lagi)

Menambal file yang disebut di log error, satu per satu, setiap kali push
gagal — itu tidak akan pernah selesai kalau akar masalah di git-nya
sendiri belum dibereskan. Saya sarankan, SEBELUM push berikutnya, Bapak
jalankan ini dari root project untuk memahami apa sebenarnya komit
`162232c` itu di riwayat lokal Bapak:

```bash
git log --oneline --all --graph | head -30
git show --stat 162232c
git status
```

Kemungkinan besar ada branch lokal yang divergen (terpisah) dari `main`
di GitHub, dan setiap kali proses pull/merge dilakukan, git mencoba
menggabungkan riwayat yang sudah lama tidak sinkron ini. Kalau `git
status` menunjukkan sesuatu seperti "Your branch and 'origin/main' have
diverged", itu konfirmasi penyebabnya.

Cara paling aman untuk benar-benar menutup siklus ini (pilih salah satu):

**Opsi A — kalau riwayat lokal `162232c` itu memang tidak penting lagi**
(sepertinya iya, karena isinya versi 2.6.5 yang sudah lama kita lewati):
```bash
git fetch origin
git reset --hard origin/main
```
⚠️ Ini akan MEMBUANG semua perubahan lokal yang belum di-push. Pastikan
tidak ada kerja penting yang cuma ada di lokal sebelum menjalankan ini.

**Opsi B — kalau ragu**, jalankan dulu perintah diagnosis di atas dan
kirim hasilnya ke saya — saya bantu baca dan tentukan langkah amannya
bersama, sebelum Bapak jalankan perintah apa pun yang berisiko.

## Langkah untuk sekarang

1. Timpa `lib/utils.ts` dan `components/penduduk/CetakKKModal.tsx` dengan
   file di package ini.
2. **Sebelum commit**, jalankan pemindaian menyeluruh sekali lagi dari
   root project (perintah yang sama seperti sebelumnya, sudah terbukti
   menemukan semua marker dengan tepat):
   ```bash
   grep -rn "<<<<<<<\|=======\|>>>>>>>" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . | grep -v node_modules
   ```
   Harus kosong sebelum push.
3. Setelah itu aman push seperti biasa. Tapi kalau tidak menjalankan
   diagnosis git di atas, kemungkinan besar akan ketemu file lain lagi
   di push berikutnya — komit `162232c` ini masih ada di riwayat lokal
   Bapak sampai benar-benar diselesaikan di level git.
