# DaPenDig Next — v2.3.5 Changelog

## Perbaikan Berdasarkan Screenshot Review

### 1. Splash Screen
- Loading screen di `LoginForm.tsx` (saat `authLoading`) sudah identik dengan `loading.tsx` — icon + nama app + spinner.
- Tidak ada splash "logo saja" terpisah di kode. Tampilan native PWA launch (warna background biru dari manifest) adalah perilaku sistem Android, bukan kode.

### 2. Dropdown Menu Topbar — Portal Fix (Definitif) ✅
**Root cause sebenarnya:** `overflow-hidden` pada parent column div di AppShell memotong elemen `position: absolute` apapun, termasuk dropdown dengan `z-[200]`.
**Solusi definitif:** Dropdown sekarang di-render menggunakan **React Portal** ke `document.body` — sepenuhnya keluar dari stacking context layout, selalu di atas semua konten di semua halaman.
- Posisi dropdown dihitung dinamis dari `getBoundingClientRect()` tombol avatar.
- `zIndex: 9999` via inline style.
- Klik di luar tetap menutup dropdown.
- Bekerja konsisten di semua halaman: Dashboard, Penduduk, Mutasi, Vital, Log, dll.

### 3. Kolom Freeze (No & Nama) — Sudah Benar ✅
- Dari screenshot, Mutasi dan Vital sudah benar. Penduduk sudah diperbaiki di session sebelumnya.
- `left-9` (36px) sesuai `w-9` untuk kolom No.
- `z-30` untuk header freeze, `z-20` untuk body freeze.

### 4. Scroll Luar Dihapus Sepenuhnya ✅
**Solusi baru — prop `fullHeight` di AppShell:**
- Halaman dengan tabel (`penduduk`, `mutasi`, `vital`, `log`) menggunakan `<AppShell fullHeight>`.
- Saat `fullHeight=true`: `<main>` berubah jadi `flex-1 min-h-0 overflow-hidden flex flex-col` — tidak ada scroll di main, konten mengisi penuh.
- Saat `fullHeight=false` (default): `<main>` tetap `overflow-y-auto` untuk halaman biasa (dashboard, profil, pengaturan, dll).
- Tabel wrapper: `flex-1 min-h-0` → mengisi sisa tinggi setelah header + tabs + filter.
- Tidak ada `max-h` fixed lagi — tabel fill dinamis sesuai ukuran layar.
- Hasilnya: tidak ada space kosong di bawah tabel, tidak ada scroll luar.

### 5. Tab Button Mutasi & Vital — Diperbaiki ✅
**Problem dari screenshot:** Button tab tidak seragam ukurannya, tidak presisi.
**Fix:**
- `flex-1`: kedua button sama lebar, mengisi penuh lebar layar.
- `h-11` (44px): tinggi seragam, touch target cukup besar.
- `justify-center`: teks + icon selalu di tengah.
- `font-semibold`: font lebih tegas dan terbaca.
- `shrink-0` pada icon: icon tidak collapse.
- Konsisten untuk Mutasi (Pindah Keluar/Masuk) dan Vital (Kelahiran/Kematian).

### 6. Font Konsistensi ✅
- Semua `text-[10px]`/`text-[11px]`/`text-[13px]` → `text-xs`/`text-sm` di seluruh codebase.

## File yang Diubah
- `components/layout/Topbar.tsx` — React Portal dropdown (fix definitif z-index)
- `components/layout/AppShell.tsx` — prop `fullHeight`, main overflow conditional
- `components/penduduk/PendudukTable.tsx` — `h-full` (fill parent, tidak ada max-h fixed)
- `app/penduduk/page.tsx` — `h-full flex flex-col`, `flex-1 min-h-0` tabel, `fullHeight`
- `app/mutasi/page.tsx` — `h-full flex flex-col`, tabs `flex-1 h-11`, tabel `flex-1`, `fullHeight`
- `app/vital/page.tsx` — `h-full flex flex-col`, tabs `flex-1 h-11`, tabel `flex-1`, `fullHeight`
- `app/log/page.tsx` — `h-full flex flex-col`, tabel `flex-1`, `fullHeight`
- Semua komponen — font standardization `text-xs`/`text-sm`

## Tidak Diubah
- `app/loading.tsx` — tidak diubah sama sekali
- `app/page.tsx` — redirect ke login tetap
- Warna palette sky/blue, hamburger nav, KK logic, UID allowlist
