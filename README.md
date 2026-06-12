# DaPenDig Next — Data Penduduk Digital

Aplikasi PWA manajemen data penduduk desa untuk **Desa Karang Sengon, Kecamatan Klabang, Kabupaten Bondowoso**, dibangun dengan Next.js 15 + Firebase Firestore.

---

## Versi Saat Ini: v2.6.5

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 App Router + TypeScript strict |
| Styling | Tailwind CSS v4 |
| Database | Firebase Firestore (`dapendig`, region: `asia-southeast1`) |
| State | TanStack Query v5 + Zustand v5 |
| UI | Lucide React, Radix UI, Recharts |
| Export | SheetJS (Excel) |
| Deployment | Vercel (auto-deploy dari GitHub `main`) |

---

## Fitur Lengkap

### Data Penduduk
- CRUD lengkap dengan validasi NIK unik
- Filter multi-kolom (RT, jenis kelamin, agama, status, pekerjaan, pendidikan)
- Export Excel & Import dari SIAK Dukcapil
- Recycle Bin (soft delete + restore)
- Riwayat perubahan data per penduduk
- KK Succession otomatis saat Kepala Keluarga meninggal/pindah

### Mutasi
- Pindah Keluar — perorangan & batch per KK
- Pindah Masuk — entry manual dengan nomor KK baru
- Rollback mutasi

### Vital
- Kelahiran bayi (auto-assign KK)
- Kematian warga (auto-update KK succession)
- Rollback kejadian vital

### Monografi
- Statistik penduduk (piramida umur dinamis, jenis kelamin, agama, pekerjaan, pendidikan)
- Klik item statistik → filter otomatis ke tabel Data Penduduk
- Usia produktif & tanggungan

### Cetak Dokumen
- **Cetak KK Sementara** — PDF A4 Landscape (297×210mm eksak) via jsPDF + html2canvas
  - Watermark "SEMENTARA" diagonal
  - Layout pixel-accurate mengikuti format KK resmi Kemendagri
  - TTD Kepala Keluarga + Kepala Desa (nama, jabatan, NIP opsional)
  - Support multi-halaman untuk KK dengan >10 anggota
- Surat keterangan (4 template)

### Pengaturan
- Informasi wilayah (Desa, Kecamatan, Kabupaten, Provinsi, Kode Pos)
- Data Kepala Desa (nama, jabatan: Kepala Desa / Pj. / Plt., NIP opsional)
- Piramida umur (konfigurasi kelompok usia)

### Sistem
- Log Aktivitas (semua operasi tercatat dengan user + timestamp)
- PWA (installable, offline-ready)
- Auth: email/password dengan UID allowlist (5 UID terdaftar)
- Dark mode UI

---

## Arsitektur Penting

### Firestore Collections
```
penduduk/{nik}          — data penduduk (NIK sebagai document ID)
mutasi_keluar/{id}      — catatan pindah keluar
mutasi_masuk/{id}       — catatan pindah masuk
lahir/{id}              — catatan kelahiran
meninggal/{id}          — catatan kematian
recycle_bin/{id}        — data terhapus (soft delete)
log_aktivitas/{id}      — log semua operasi
config/wilayah          — konfigurasi wilayah + kepala desa
config/piramida_umur    — konfigurasi kelompok usia
```

### Pola Kritis
- **NIK sebagai document ID** — tidak boleh diubah
- **UID allowlist** di `hooks/use-auth.ts` — 5 UID, jangan dimodifikasi
- **APP_VERSION** di `lib/utils.ts` — harus sama dengan versi ZIP/deploy
- **Z-index tokens** di `lib/tokens.ts` — semua z-index pakai konstanta `Z.xxx`
- **Provider** — provider baru hanya di `components/shared/providers.tsx`
- **useAuthListener** — hanya dipanggil sekali di root `AuthProvider`

### Filter State
- Filter Data Penduduk disimpan di `sessionStorage`
- Navigasi dari Monografi → Penduduk: filter otomatis reset setelah diterapkan (tidak persisten ke sessionStorage)
- Navigasi dari Penduduk → Detail → kembali: filter ter-restore dari sessionStorage

---

## Setup Deployment Baru (Multi-Desa)

1. Buat project Firebase baru
2. Copy `firebase.config` dengan project ID baru
3. Find-replace nama desa di semua file config
4. Push ke GitHub repo baru → connect ke Vercel
5. Set environment variables di Vercel

---

## Menjalankan Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Pastikan file `.env.local` berisi Firebase config yang valid.

---

## Standar Kode

- TypeScript strict — **0 errors, 0 warnings** wajib sebelum deploy
- ESLint `eslint-config-next/typescript` — tidak ada `@ts-ignore`
- Font size: `text-xs` badge/header, `text-sm` konten terbaca
- Tidak ada breaking change tanpa diskusi terlebih dahulu

---

## Riwayat Versi Singkat

| Versi | Tanggal | Ringkasan |
|-------|---------|-----------|
| v2.6.5 | Jun 2026 | Cetak KK: PDF A4 eksak via jsPDF+html2canvas, watermark SVG fix |
| v2.6.x | Jun 2026 | Iterasi perbaikan ukuran kertas, watermark, dan centering KK |
| v2.5.x | Mei–Jun 2026 | Cetak KK Sementara (layout, garuda, landscape, footer, filter reset monografi) |
| v2.4.0 | Mei 2026 | Bug fixes: PWA splash, header scroll, filter persistence, KK print |
| v2.3.x | Apr–Mei 2026 | Audit ESLint/TS, design tokens, Zod schemas, Vitest 94 tests |
| v2.1.0 | Apr 2026 | Fase 1–4 refactoring: security, infrastructure, code quality, DevOps |
| v2.0.0 | Mar–Apr 2026 | Migrasi dari vanilla JS ke Next.js 15 + TypeScript + Tailwind v4 |
