# DaPenDig Next — v2.3.5 Changelog

## Bug Fixes & Improvements

### 1. Splash Screen — Dihapus
- Tidak ada splash screen "logo saja" terpisah di root.
- `app/page.tsx` tetap redirect ke `/login`.
- Loading screen yang sudah bagus (icon + spinner) di `AppShell` & `loading.tsx` **tidak diubah sama sekali**.

### 2. Dropdown Menu Topbar — Z-Index Diperbaiki ✅
**Problem:** Dropdown avatar (profil/logout) di Topbar berada di belakang konten pada halaman Penduduk, Mutasi, Vital, dan Log Aktivitas.
**Root Cause:** `<main>` di AppShell menggunakan `overflow-y-auto` yang membuat stacking context baru, sehingga `z-50` dropdown kalah dengan konten di dalam stacking context tersebut.
**Fix:**
- `AppShell`: Struktur diubah dari `min-h-screen` menjadi `h-[100dvh] overflow-hidden` — scroll sepenuhnya dikelola di dalam `main`.
- `<main>` tetap `overflow-y-auto` untuk scroll halaman, ditambah `relative`.
- Dropdown Topbar: z-index dinaikkan dari `z-50` menjadi `z-[200]` untuk memastikan selalu di atas semua konten.

### 3. Kolom Freeze (No & Nama) — Tidak Tembus Konten Scroll ✅
**Problem:** Konten yang discroll ke kanan menembus kolom No dan Nama di halaman Penduduk.
**Root Cause:** Wrapper tabel menggunakan `-mx-4 px-4` (negative margin trick) yang merusak stacking context sticky dan membuat kolom tidak terisolasi dengan benar.
**Fix — `PendudukTable.tsx`:**
- Hapus `-mx-4 px-4` dari wrapper, ganti dengan `overflow-x-auto overflow-y-auto max-h-[52dvh] rounded-xl` yang bersih.
- Sticky column No: `left-0 z-20` dengan `bg-[#0d1424] group-hover:bg-[#121a2e] transition-colors` **eksplisit** (bukan `bg-inherit`).
- Sticky column Nama: `left-9 z-20` (disesuaikan dengan lebar kolom No = 36px / `w-9`).
- Header freeze: `z-30` untuk header freeze vs `z-20` header biasa.
- Mutasi & Vital: `left-8` → `left-9`, z-index distandarisasi (`z-20`/`z-30`), width kolom No = `w-9`.

### 4. Scroll Luar Dihapus ✅
**Problem:** Halaman Penduduk, Mutasi, Vital memiliki dua level scroll — scroll halaman (outer) dan scroll tabel (inner). Pada mobile, scroll luar tidak diperlukan.
**Fix:** 
- `AppShell` kini `h-[100dvh] overflow-hidden` sehingga tidak ada scroll di level layout.
- Satu-satunya scroll adalah scroll `<main>` (atas-bawah seluruh halaman) dan scroll tabel (atas-bawah + kiri-kanan di dalam tabel).
- Ukuran tabel: `max-h-[52dvh]` di Penduduk (turun dari 60dvh) agar konten di bawah tabel (pagination) tetap terlihat tanpa scroll luar.

### 5. Konsistensi Font — Distandardisasi ✅
**Problem:** Campuran arbitrary font size `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[9px]` di hampir semua file (168 instance).
**Fix:** Semua arbitrary font size distandarisasi:
- `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]` → `text-xs` (12px)
- `text-[13px]` → `text-sm` (14px)
- Label tabel header: `text-xs font-semibold uppercase tracking-wider`
- Body cell tabel: `text-sm` minimum
- Sub-label / caption: `text-xs`
- File yang diubah: semua halaman utama, semua komponen shared, login form, pengaturan, dashboard, profil, monografi.

## File yang Diubah
- `components/layout/AppShell.tsx` — layout structure, h-[100dvh]
- `components/layout/Topbar.tsx` — z-[200] dropdown, font standardization
- `components/penduduk/PendudukTable.tsx` — sticky column fix, font
- `app/penduduk/page.tsx` — wrapper `overflow-hidden`
- `app/mutasi/page.tsx` — sticky z-index, left-9, font standardization
- `app/vital/page.tsx` — sticky z-index, left-9, font standardization
- `app/log/page.tsx` — font standardization
- `app/penduduk/[id]/page.tsx` — font standardization
- `components/penduduk/PendudukFilter.tsx` — font standardization
- `components/penduduk/CatatPindahKeluarModal.tsx` — font standardization
- `components/penduduk/KKModal.tsx` — font standardization
- `components/penduduk/PendudukForm.tsx` — font standardization
- `components/mutasi/MutasiForm.tsx` — font standardization
- `components/vital/VitalForm.tsx` — font standardization
- `components/layout/AppLogo.tsx` — font standardization
- `components/layout/Sidebar.tsx` — font standardization
- `components/dashboard/RecentActivity.tsx` — font standardization
- `components/dashboard/UmurChart.tsx` — font standardization
- `components/auth/LoginForm.tsx` — font standardization
- `app/pengaturan/**` — font standardization
- `app/monografi/page.tsx` — font standardization (label teks)
- `app/profil/page.tsx` — font standardization
- `app/dashboard/page.tsx` — font standardization
- `components/pengaturan/ImportSection.tsx` — font standardization

## Tidak Diubah (Intentional)
- `app/loading.tsx` — loading screen tidak diubah sama sekali sesuai permintaan
- `app/page.tsx` — redirect ke login tetap
- Warna palette sky/blue — tidak berubah
- Navigasi hamburger drawer — tidak berubah
- KK succession logic — tidak berubah
- Firebase Auth UID allowlist — tidak berubah
