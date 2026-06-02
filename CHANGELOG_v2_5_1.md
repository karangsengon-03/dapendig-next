# Changelog v2.5.1

**Tanggal:** 29 Mei 2026  
**Dari:** v2.5.0  

---

## Perbaikan

### 1 — Splash Screen Native Android Bersih (Tanpa Pinggiran Putih)

**Masalah:** Saat membuka app dari homescreen Android, splash screen native
menampilkan pinggiran/fringe putih tipis di sekitar ikon karena
`background_color` di manifest (`#16447a`) tidak sama persis dengan
warna background icon (`#164472`).

**Akar masalah:** Android PWA membuat splash screen dengan cara
menaruh ikon di atas background dengan warna `background_color`
dari manifest. Jika kedua warna berbeda — meski tipis — akan ada
fringe di area anti-aliasing tepi ikon.

**Fix:**
- `public/manifest.json` → `background_color` diubah dari `#16447a`
  ke `#164472` (sama persis dengan corner pixel icon-192.png).

**Loading screen in-app tidak diubah** — sudah benar di v2.4.0 dan
dikembalikan ke kondisi itu.

---

### 2 — Cetak KK Sementara: Landscape, Logo Garuda Nyata, 1 Halaman

**Masalah:**
- PDF hasil cetak masih portrait (bukan landscape A4 seperti KK resmi).
- Logo garuda hanya placeholder teks `[Lambang Garuda]`, bukan gambar nyata.
- Untuk data 3 anggota, dokumen terbagi menjadi 2 halaman.
- Kode Pos selalu menampilkan `—` karena belum ada field di config.

**Fix:** `components/penduduk/CetakKKModal.tsx` ditulis ulang total:

- **Landscape A4** — `@page { size: A4 landscape; }`, dimensi page
  `297mm × 210mm`, semua CSS dioptimalkan untuk lebar 297mm.
- **Garuda Pancasila nyata** — PNG garuda B&W (1418×1537px) di-embed
  sebagai base64 langsung di komponen agar selalu tersedia tanpa
  request ke server saat cetak. Di bawah garuda ditampilkan teks
  "REPUBLIK INDONESIA" sesuai referensi KK resmi.
- **1 halaman** — ukuran font, padding, dan tinggi baris dikecilkan
  secara proporsional agar seluruh konten (header + 2 tabel 10 baris
  + footer + disclaimer) muat dalam 1 halaman A4 landscape.
- **Kode Pos dari config** — menampilkan `wilayah.kode_pos` (fallback
  `'68284'`) bukan `—`.
- Label instruksi di UI modal diubah dari **"A4 Portrait"** →
  **"A4 Landscape"**.

---

### 3 — Pengaturan: Tambah Field Kode Pos

**Masalah:** Tidak ada field kode pos di halaman Pengaturan → Informasi
Wilayah, sehingga Kode Pos di KK Sementara selalu kosong/`—`.

**Fix:**
- `types/index.ts` → tambah `kode_pos?: string` ke interface
  `ConfigWilayah`.
- `hooks/usePengaturan.ts` → fallback default `kode_pos: '68284'`
  saat dokumen Firestore belum ada.
- `app/pengaturan/page.tsx` → tambah field input **Kode Pos** di
  antara Provinsi dan Tahun, dengan `placeholder="68284"`,
  `maxLength={5}`, `inputMode="numeric"`. State form dan `useEffect`
  sync data juga diperbarui.

---

## File Dimodifikasi (5 file)

| File | Perubahan |
|------|-----------|
| `public/manifest.json` | background_color disamakan ke `#164472` |
| `components/layout/AppShell.tsx` | Loading screen dikembalikan ke v2.4.0 (icon-192 + bg biru) |
| `types/index.ts` | Tambah field `kode_pos?: string` |
| `hooks/usePengaturan.ts` | Default kode_pos `'68284'` |
| `app/pengaturan/page.tsx` | Input Kode Pos baru |
| `components/penduduk/CetakKKModal.tsx` | Total rewrite: garuda nyata, landscape, 1 halaman, kode_pos |
