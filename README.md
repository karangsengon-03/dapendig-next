# DaPenDig Next — Data Penduduk Digital v2.3.6

Aplikasi manajemen data penduduk desa berbasis Next.js 15 untuk Desa Karang Sengon, Kecamatan Klabang, Kabupaten Bondowoso.

## Stack
- Next.js 15 App Router + TypeScript strict
- Tailwind CSS v4
- Firebase Firestore (project: dapendig, region: asia-southeast1)
- TanStack Query v5 + Zustand v5
- Lucide React, SheetJS

## Fitur Utama
- Data Penduduk (CRUD, filter, export Excel, import SIAK)
- Recycle Bin (soft delete + restore)
- KK Succession (saat Kepala Keluarga meninggal/pindah)
- Mutasi (Pindah Keluar/Masuk — perorangan & keluarga)
- Vital (Kelahiran & Kematian + rollback)
- Cetak Surat (4 template)
- Monografi (piramida umur dinamis + statistik)
- Log Aktivitas (filter, pagination)

## Deployment
- Platform: Vercel / Firebase Hosting
- Auto-deploy via GitHub push ke branch main

## Menjalankan Lokal
```bash
npm install
npm run dev
```

## Changelog v2.3.6
Lihat `CHANGELOG_v2_3_6.md` untuk detail lengkap perbaikan UI/UX dan bug fix session ini.

### Ringkasan perbaikan:
1. **Monografi** — tombol "+Tambah Kelompok" tidak lagi terpotong, layout 2 baris yang rapi
2. **Mutasi** — form dan tabel tidak tampil bersamaan (bug absurd hilang), form bisa scroll penuh
3. **Vital** — sama dengan Mutasi: form scrollable, tabel tersembunyi saat form terbuka
4. **Log Aktivitas** — tabel scroll benar di dalam container, data tidak tembus, pagination rapi di bawah tabel (tidak tertimpa), header kolom sticky
5. **Detail Penduduk** — CatatPindahKeluarModal dan CatatMeninggalModal kini bisa scroll di layar kecil
