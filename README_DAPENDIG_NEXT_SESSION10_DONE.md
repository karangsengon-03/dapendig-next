# README — DaPenDig Next — Session 10 DONE

## Identitas Project
- **Nama Apps:** DaPenDig Next
- **Versi:** v2.0.0 (selesai Session 10)
- **Tagline:** Data Penduduk Digital
- **Desa:** Karang Sengon, Klabang, Bondowoso
- **Repo:** https://github.com/karangsengon-03/dapendig-next
- **Deploy:** Vercel (auto dari GitHub)
- **Firebase Project:** dapendig (Firestore asia-southeast1)

---

## Yang Dikerjakan di Session 10

### ✅ Update Types & Utils
- `types/index.ts` — tambah status `meninggal | mutasi-keluar`, field `hub_asli_backup`, interface `RecycleBinItem`
- `lib/utils.ts` — versi `v1.2.0` → `v2.0.0`

### ✅ Fitur I — Recycle Bin (Tempat Sampah)
- `hooks/useRecycleBin.ts` — BARU: `useRecycleBinList`, `useRestorePenduduk`, `useHapusPermanent`, `useHapusSemuaRecycleBin`
- `hooks/usePenduduk.ts` — `useDeletePenduduk` diubah: hapus penduduk → pindah ke `recycle_bin` (bukan hard delete)
- `app/recycle-bin/page.tsx` — BARU: halaman daftar recycle bin, tombol Pulihkan + Hapus Permanen + Hapus Semua
- `components/layout/Sidebar.tsx` — tambah menu "Tempat Sampah" (icon Trash2, route `/recycle-bin`)

### ✅ Behavior Fix 3 — Sort Default RT → KK → Nama
- `app/penduduk/page.tsx` — sort default diubah ke `rt_kk`
- `components/penduduk/PendudukFilter.tsx` — tambah opsi sort `rt_kk` sebagai default pertama + status `meninggal` & `mutasi-keluar`

### ✅ Fitur C — Quick Action "Catat Pindah Keluar" dari Detail
- `hooks/usePenduduk.ts` — tambah `useCatatPindahKeluar`
- `components/penduduk/CatatPindahKeluarModal.tsx` — BARU: modal form pindah keluar
- `app/penduduk/[id]/page.tsx` — pasang tombol + modal (hanya tampil jika status aktif)

### ✅ Fitur D — Quick Action "Catat Meninggal" + KK Succession
- `hooks/usePenduduk.ts` — tambah `useCatatMeninggal` dengan logika KK succession otomatis
- `components/penduduk/CatatMeninggalModal.tsx` — BARU: modal form catat kematian
- `app/penduduk/[id]/page.tsx` — pasang tombol + modal

### ✅ Fitur E — Modal Anggota Keluarga (Klik No. KK)
- `components/penduduk/KKModal.tsx` — BARU: daftar anggota KK dengan badge status & hubungan, klik → navigate
- `app/penduduk/[id]/page.tsx` — No. KK jadi link biru (hanya jika status aktif), klik buka KKModal

### ✅ Fitur F — Rollback Mutasi Keluar
- `hooks/useMutasi.ts` — tambah `useRollbackMutasiKeluar`, update `addMutasiKeluar` → ubah status penduduk, update `addMutasiMasuk` → tambah penduduk otomatis
- `app/mutasi/page.tsx` — tambah tombol 🔄 Batalkan + confirm dialog

### ✅ Fitur G — Rollback Kematian + KK Restoration
- `hooks/useVital.ts` — tambah `useRollbackMeninggal` dengan KK restoration, update `addLahir` → tambah penduduk otomatis, update `addMeninggal` → ubah status penduduk
- `app/vital/page.tsx` — tambah tombol 🔄 Batalkan & Kembalikan + confirm dialog

### ✅ Behavior Fix 1 & 2 — Auto-tambah Penduduk
- `hooks/useVital.ts` — `addLahir` sekarang otomatis `addDoc` ke `penduduk` dengan data bayi
- `hooks/useMutasi.ts` — `addMutasiMasuk` sekarang otomatis `addDoc` ke `penduduk`

### ✅ Behavior Fix 4 — Status Penduduk Berubah dari Form Mutasi/Vital
- `hooks/useMutasi.ts` — `addMutasiKeluar` update status penduduk → `mutasi-keluar`
- `hooks/useVital.ts` — `addMeninggal` update status penduduk → `meninggal`

### ✅ Fitur H — Normalisasi Data
- `hooks/usePengaturan.ts` — tambah `useNormalisasiData` (batch fix pekerjaan & hubungan_keluarga)
- `app/pengaturan/page.tsx` — tambah komponen NormalisasiSection dengan konfirmasi

### ✅ Fitur B — Ekspor Bulanan Multi-Sheet
- `lib/exportExcel.ts` — tambah fungsi `exportBulanan` (filter per bulan/tahun, multi-sheet: Rekap, Mutasi Keluar, Mutasi Masuk, Kelahiran, Kematian)
- `components/pengaturan/EksporSection.tsx` — tambah seksi "Laporan Bulanan" dengan pilihan bulan/tahun

### ✅ Fitur A — Import Excel dengan Column Mapping
- `hooks/useImport.ts` — BARU: `useImportPenduduk` dengan `normImportVal` per field
- `components/pengaturan/ImportSection.tsx` — BARU: 3-step UI (Upload → Mapping → Done), auto-mapping kolom, download template

### ✅ Firestore Rules
- `firestore.rules` — file lengkap termasuk aturan `recycle_bin` dan `counter_surat`

---

## Koleksi Firestore yang Digunakan

| Koleksi | Keterangan |
|---|---|
| `penduduk` | Data penduduk, status: aktif/tidak aktif/meninggal/mutasi-keluar |
| `lahir` | Catatan kelahiran |
| `meninggal` | Catatan kematian (field `hub_asli` untuk KK restoration) |
| `mutasi_keluar` | Pindah keluar |
| `mutasi_masuk` | Pindah masuk |
| `log` | Log aktivitas |
| `config/wilayah` | Konfigurasi wilayah desa |
| `users` | User & role |
| `counter_surat` | Counter nomor surat |
| `recycle_bin` | Tempat sampah (penduduk dihapus) |

---

## Firestore Rules

Terapkan rules di `firestore.rules` secara manual di Firebase Console → Firestore → Rules.
File lengkap sudah ada di root project: `firestore.rules`.

---

## Catatan untuk Session 11 (jika ada)

Fitur yang mungkin dikembangkan lanjut:
- Dashboard stats: counter penduduk meninggal & mutasi-keluar
- Filter/search di halaman Recycle Bin
- Export recycle bin
- Pagination di halaman Mutasi & Vital jika data banyak
- Validasi NIK duplikat saat import

---

## File yang Dikirim ke Chat Baru (jika perlu Session 11)

1. `dapendig-next-s10.zip` — full project Session 10
2. README blueprint session 11 (dibuat di akhir sesi ini jika diperlukan)

---

*Session 10 selesai — DaPenDig Next v2.0.0*
*Target semua fitur blueprint Session 10 telah diimplementasikan.*
