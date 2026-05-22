# DaPenDig Next — v2.3.6 Changelog

## Perbaikan UI/UX & Bug Fix (Session Review Screenshots)

### 1. Monografi — Tombol "+Tambah" Terpotong di Mobile ✅
**Masalah:** Tombol "+ Tambah" di modal Rentang Umur Piramida terpotong di luar layar karena layout row horizontal (input Min — input Maks — tombol) terlalu lebar untuk layar HP.
**Fix:** Layout diubah menjadi 2 baris:
- Baris 1: input Umur Min + dash + input Umur Maks (full width)
- Baris 2: tombol "+ Tambah Kelompok" full width di bawahnya
Kini semua elemen terlihat penuh tanpa perlu scroll horizontal.

### 2. Mutasi — Form & Tabel Tampil Bersamaan (Bug Absurd) ✅
**Masalah:** Saat klik "+Tambah" di Pindah Keluar opsi "1 Keluarga (KK)", data penduduk dari tabel tetap muncul di bawah form karena kondisi render tabel hanya cek `tab`, bukan `!showForm`.
**Fix:** Tabel sekarang hanya dirender saat `!showForm`. Ketika form terbuka, tabel tidak tampil sama sekali — tidak ada lagi data yang "tembus" di bawah form.

### 3. Mutasi — Tidak Bisa Scroll Saat Form Terbuka ✅
**Masalah:** MutasiKeluarForm dan MutasiMasukForm (terutama 1 Keluarga yang sangat panjang) tidak bisa di-scroll karena berada dalam `h-full flex-col overflow-hidden` tanpa pembungkus scroll.
**Fix:** Form sekarang dibungkus dengan `div.flex-1.min-h-0.overflow-y-auto` — form bisa scroll penuh, tombol Simpan/Batal selalu bisa dicapai.

### 4. Vital — Form Kelahiran & Kematian Tidak Bisa Scroll ✅
**Masalah:** Sama persis dengan poin 3 — LahirForm (panjang, banyak field) tidak bisa di-scroll.
**Fix:** Solusi identik: form dibungkus `div.flex-1.min-h-0.overflow-y-auto`. Tabel juga hanya tampil saat `!showForm`.

### 5. Vital — Data Tabel Muncul di Bawah Form Kematian (Bug Absurd) ✅
**Masalah:** Sama dengan poin 2 — kondisi render tabel di Vital juga hanya cek `tab`, bukan `!showForm`.
**Fix:** Disamakan dengan fix poin 2.

### 6. Log Aktivitas — Tidak Bisa Scroll, Data Tembus, Pagination Aneh ✅
**Masalah (kompleks):**
- Container tabel `div.flex-1.min-h-0` tidak meneruskan batas tinggi ke inner `div.overflow-y-auto`, sehingga tabel meluap keluar batas card.
- Pagination berada di luar container tabel sebagai elemen terpisah dalam flex column, tapi tertimpa/tersembunyi oleh tabel yang overflow.
- Header kolom tidak sticky — saat scroll, header ikut naik.
**Fix:**
- Container tabel diubah menjadi `flex flex-col overflow-hidden` dengan inner `div.flex-1.min-h-0.overflow-x-auto.overflow-y-auto` untuk area scroll tabel.
- Header tabel diberi `sticky top-0 bg-[#0d1424] z-10` agar tetap terlihat saat scroll.
- Pagination dipindah masuk ke dalam container tabel, sebagai elemen `shrink-0` dengan border-top — tidak akan pernah tertimpa tabel.
- Padding px di tabel cells diseragamkan dari `px-2` menjadi `px-3`.

### 7. Detail Penduduk — CatatPindahKeluarModal & CatatMeninggalModal ✅
**Masalah:** Modal ini tidak memiliki `max-h` dan `overflow-y-auto`, sehingga bisa overflow di layar kecil.
**Fix:** Ditambahkan `max-h-[90dvh] overflow-y-auto` pada container modal keduanya.

## File yang Diubah
- `app/monografi/page.tsx` — layout input tambah kelompok umur
- `app/mutasi/page.tsx` — form/tabel render logic + scroll container
- `app/vital/page.tsx` — form/tabel render logic + scroll container
- `app/log/page.tsx` — tabel scroll fix + pagination pindah ke dalam container
- `components/penduduk/CatatPindahKeluarModal.tsx` — max-h overflow scroll
- `components/penduduk/CatatMeninggalModal.tsx` — max-h overflow scroll

## Versi
- Sebelumnya: v2.3.5
- Sekarang: **v2.3.6**
