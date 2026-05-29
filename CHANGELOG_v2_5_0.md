# Changelog v2.5.0

**Tanggal:** 29 Mei 2026

## Bug Fixes & Improvements

### Fix #1 — Splash Screen PWA Lebih Bersih di Mobile

**Masalah:** Saat membuka app dari homescreen, splash screen native Android menampilkan warna latar yang berbeda (`#16447a` biru tua) tidak sinkron dengan tampilan loading di dalam app (`#050810` hampir hitam) — terasa ada "lompatan" warna yang tidak rapi.

**File diubah:**
- `public/manifest.json` — `background_color` disamakan ke `#0d1a2e` (gelap kebiruan, konsisten dengan loading screen), `short_name` dipersingkat menjadi `"DaPenDig"` (tanpa "Next") agar tidak terpotong di homescreen, tambah `scope` dan `lang`.
- `components/layout/AppShell.tsx` — Loading screen:
  - Background disamakan ke `#0d1a2e` agar transisi dari splash screen mulus.
  - Icon diganti dari `icon-192.png` (any) ke `icon-maskable-192.png` yang memiliki safe zone padding — terlihat lebih rapi dan proporsional di loading screen.
  - Ukuran icon naik dari 80px → 96px, border radius lebih besar (`rounded-3xl`), tambah `ring-1 ring-white/10` agar icon tidak "mengambang".
  - `min-h-screen` → `min-h-[100dvh]` agar konsisten dengan ukuran viewport dinamis di mobile.
  - Tambah `priority` pada Image agar icon loading dimuat lebih cepat.

---

### Fix #2 — Header Selalu Terlihat, Tidak Perlu Scroll Atas Dulu

**Masalah:** Pada beberapa perangkat Android, setelah scroll ke bawah lalu berhenti, header (Topbar) terlihat "hilang" dan perlu scroll ke atas sekali lagi untuk memunculkannya. Ini terjadi karena interaksi antara `h-[100dvh]` dan address bar mobile browser yang naik/turun mengubah tinggi viewport — efeknya konten bergeser.

**File diubah:**
- `components/layout/Topbar.tsx` — Header diberi `willChange: 'transform'` (via inline style) yang memaksa browser membuat layer compositing terpisah untuk elemen ini. Dengan layer terpisah, browser tidak ikut menggeser header ketika UI chrome (address bar) berubah. Background opacity naik sedikit (`bg-[#0a0f1e]` solid) agar tetap terbaca saat konten di belakangnya terlihat.
- `components/layout/AppShell.tsx` — Tambah `overscroll-none` pada `main` untuk mencegah scroll chaining ke browser yang bisa menyebabkan address bar bergerak tidak perlu.

---

### Fix #3 — Filter dari Monografi Auto-Reset Saat Pindah Menu

**Masalah:** Saat klik item clickable di menu Monografi (misal pekerjaan "Petani/Pekebun"), app navigasi ke `/penduduk?pekerjaan=Petani/Pekebun`. Filter aktif dan data ter-filter. **Masalahnya:** filter ini disimpan ke `sessionStorage`. Jadi saat user pindah ke menu lain (Mutasi, Vital, dll) lalu kembali ke menu Penduduk, filter "Petani/Pekebun" masih aktif dan harus di-reset manual.

**Perbedaan perilaku yang diinginkan:**
- Dari **Monografi → Penduduk**: filter aktif sesuai pilihan. Saat pindah menu lain dan kembali ke Penduduk → **filter sudah reset ke default**.
- Tetap di **Penduduk** (ubah filter sendiri): filter disimpan ke sessionStorage dan ter-restore saat navigasi antar halaman dalam sesi yang sama (misal masuk ke detail penduduk lalu kembali).

**Solusi:**
- `app/penduduk/page.tsx`:
  - Tambah `isFromMonografiRef` (`useRef`) sebagai flag apakah filter aktif saat ini berasal dari URL params monografi.
  - Saat URL params ada (`?pekerjaan=X`): set flag `true`, terapkan filter, lalu **bersihkan URL params** via `router.replace('/penduduk', { scroll: false })` — URL kembali bersih tanpa reload.
  - Effect `sessionStorage.setItem` sekarang **dilewati** selama flag `isFromMonografiRef.current === true` — filter monografi tidak pernah tersimpan ke sessionStorage.
  - `handleFilter` (user mengubah filter manual): **reset flag** ke `false` agar perubahan filter user selanjutnya kembali disimpan ke sessionStorage seperti biasa.
- Import `useRouter` ditambahkan (sebelumnya hanya `useSearchParams`).
- Import `useRef` ditambahkan.

---

### Fix #4 — Cetak KK Sementara Harus Landscape, Bukan Portrait

**Masalah:** Format Kartu Keluarga resmi adalah **A4 Landscape** (297mm × 210mm). App sebelumnya mencetak dalam Portrait (210mm × 297mm), membuat tabel terlalu sempit dan tidak sesuai format KK resmi.

**File diubah:**
- `components/penduduk/CetakKKModal.tsx`:
  - Tambah `@page { size: A4 landscape; margin: 0; }` di CSS print window agar browser/PDF auto-pilih orientasi landscape.
  - `.page` width diubah dari `210mm` → `297mm`, `min-height` dari `297mm` → `210mm`.
  - Semua lebar kolom tabel disesuaikan untuk memanfaatkan ruang horizontal yang lebih lebar: `col-nama` 34→40mm, `col-nik` 26→28mm, `col-tl` 22→24mm, `col-pek` 28→32mm, `col-ayah`/`col-ibu` 30→36mm, dll.
  - `info-block` dan `kk-data-kanan` lebar naik dari 65→70mm.
  - Teks instruksi di UI modal diubah dari **"A4 Portrait"** → **"A4 Landscape"**.

---

## File Dimodifikasi (5 file)

| File | Perubahan |
|------|-----------|
| `public/manifest.json` | background_color, short_name, scope, lang |
| `components/layout/AppShell.tsx` | Loading screen: icon maskable, warna bg, dvh, priority |
| `components/layout/Topbar.tsx` | willChange: transform, bg solid, overscroll-none |
| `app/penduduk/page.tsx` | Auto-reset filter monografi, URL cleanup, isFromMonografiRef |
| `components/penduduk/CetakKKModal.tsx` | Landscape A4, @page rule, kolom lebih lebar, label UI |
