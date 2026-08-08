# Perbaikan Build Failed — Merge Conflict di package.json & README.md

## Apa yang terjadi (dari bukti langsung, bukan dugaan)

Saya ambil isi asli `package.json` di commit yang gagal (f61925c) langsung
dari GitHub. Isinya:

```
{
  "name": "dapendig-next",
<<<<<<< HEAD
  "version": "2.7.1",
=======
  "version": "2.6.5",
>>>>>>> 162232cfa692194738c14b655570be8041b590cd
  "private": true,
  ...
```

Ini git merge conflict marker yang tertinggal mentah-mentah di file —
bukan bug dari isi ZIP yang saya berikan (ZIP itu sudah saya buktikan
valid: extract-install-build bersih di lokasi terpisah). Yang terjadi:
folder project Bapak ternyata masih terhubung ke riwayat git LOKAL yang
punya versi berbeda (`2.6.5`, dari commit `162232c` — sepertinya sesi
kerja lain sebelum kita, bukan bagian dari v2.7.0/v2.7.1 kita). Saat
`git pull`/`git merge`/`git push` dijalankan, Git menandai baris yang
sama-sama berubah di kedua sisi sebagai konflik, dan push dilakukan
sebelum marker itu dibersihkan.

`README.md` kena masalah yang sama persis, di 2 titik (baris versi &
baris changelog) — juga sudah saya cek langsung dari GitHub.

## File yang sudah saya siapkan (bersih, siap pakai)

`package.json` dan `README.md` di package ini adalah salinan dari kopi
kerja saya yang sudah terbukti valid — sudah saya validasi ulang dengan
JSON parser resmi (Python `json.load()`), bukan cuma dilihat mata.
Tinggal timpa kedua file ini ke project Bapak.

## Langkah selanjutnya

1. **Timpa kedua file ini** ke folder project.
2. **Cek dulu apakah masih ada marker konflik di file lain** yang belum
   ketahuan (saya sudah cek beberapa file kunci hasil kerja kita sesi ini
   dan semuanya bersih, tapi saya tidak bisa menjamin 100% seluruh 150+
   file di repo, karena saya hanya cek yang paling mungkin terdampak).
   Jalankan ini dari root project untuk memeriksa SELURUH repo sekaligus:
   ```bash
   grep -rn "<<<<<<<\|=======\|>>>>>>>" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . | grep -v node_modules
   ```
   Kalau ada hasil selain di 2 file yang sudah saya perbaiki, kirim ke
   saya isinya — saya bantu selesaikan.
3. **Commit & push seperti biasa.**

## Supaya tidak terulang

Akar masalahnya: ada riwayat git lokal lama (commit `162232c`, versi
2.6.5) yang **tidak sinkron** dengan alur kerja ZIP yang kita pakai
sepanjang sesi ini. Setiap kali saya kirim ZIP dan Bapak extract-timpa ke
folder yang PUNYA riwayat git aktif, ada risiko konflik seperti ini kalau
riwayat lokalnya belum di-pull/sinkron duluan.

Cara paling aman ke depan, pilih salah satu:
- **Sebelum extract ZIP saya**, jalankan `git pull` dulu di folder project
  supaya lokal Bapak sinkron dengan GitHub, baru timpa file dari ZIP.
- **Atau**, kalau mau lebih aman lagi: `git status` dulu sebelum menimpa
  apa pun, pastikan tidak ada "Your branch has diverged" atau sejenisnya.
- Kalau ragu, jalankan `git diff` setelah menimpa file dari ZIP, sebelum
  commit — supaya bisa lihat persis apa yang berubah, dan tangkap marker
  konflik seperti ini sebelum sempat ter-push.
