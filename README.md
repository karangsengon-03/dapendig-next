# DaPenDig Next — Data Penduduk Digital

Aplikasi PWA manajemen data penduduk untuk **Desa Karang Sengon, Kecamatan Klabang, Kabupaten Bondowoso (Jawa Timur)**, dibangun dengan Next.js 16 + Firebase (Firestore & Authentication).

---

## Versi Saat Ini: v3.2.0

Rilis **fitur dan perbaikan** di atas redesain v3.0.0: Dusun, RT, dan RW dapat diatur dari Pengaturan, Edit catatan Pindah Masuk/Kelahiran ikut memperbarui menu Penduduk, ikon dan warna diseragamkan, toast di atas layar, dan Next.js 16.4.3. Struktur data Firestore dan `firestore.rules` **tidak berubah** dari v2.9.1, sehingga data lama tetap terbaca dan rules tidak perlu di-deploy ulang. Ringkasan lengkap ada di [Riwayat Versi](#riwayat-versi).

### Skema Versi

Format `vMAJOR.MINOR.PATCH`:

| Bagian | Dinaikkan bila | Contoh |
|--------|----------------|--------|
| **MAJOR** | Perubahan besar: redesain tampilan, perubahan alur utama, atau skema data | v3.0.0 (redesain) |
| **MINOR** | Fitur baru yang tidak mengubah alur yang sudah ada | v3.1.0 |
| **PATCH** | Perbaikan bug / keamanan / dependensi tanpa fitur baru | v3.0.1 |

Nomor versi harus **sama di empat tempat**: `package.json`, `package-lock.json` (dua baris `version` di bagian atas), `APP_VERSION` di `lib/utils.ts` (tampil di halaman Login dan sidebar), dan README ini (judul "Versi Saat Ini" + entri di Riwayat Versi). Tes `lib/versi.test.ts` menggagalkan `npm test` bila ada yang berbeda.

Cara menaikkan versi:

1. `npm run versi -- patch` (atau `minor`, `major`, atau versi eksplisit seperti `3.4.2`; tambahkan `--dry` untuk melihat dulu). Skrip mengubah `package.json`, `package-lock.json`, `APP_VERSION` di `lib/utils.ts`, judul "Versi Saat Ini", dan menambah kerangka entri `### vX.Y.Z` di Riwayat Versi.
2. Isi ringkasan perubahan di entri tersebut.
3. `npm test` (`lib/versi.test.ts` memastikan keempat tempat sama).

**Aturan**: setiap rilis yang diserahkan **menaikkan versi**, tidak pernah menimpa nomor yang sama. Perbaikan bug = `patch`; fitur baru = `minor`; redesain atau perubahan alur/skema data = `major`.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript strict |
| Styling | Tailwind CSS v4 + token gaya di `app/globals.css`; font Bricolage Grotesque (judul, angka) dan Instrument Sans (isi) |
| Tema | `next-themes` — terang (bawaan) / gelap, dipilih di Pengaturan → Tampilan |
| Database & Auth | Firebase Firestore (`dapendig`, region `asia-southeast1`) + Authentication email/kata sandi |
| State | TanStack Query v5 (data server) + Zustand v5 (sesi) |
| UI | Radix UI, Lucide React, Recharts v3 |
| Ekspor/Impor | ExcelJS |
| Cetak KK | jsPDF + html2canvas (dimuat lokal dari `public/vendor`, tanpa CDN) |
| Pengujian | Vitest + Testing Library, `@firebase/rules-unit-testing`, Playwright |
| Deployment | Vercel (auto-deploy dari GitHub `main`) |

---

## Menu dan Fitur

| Menu | Rute | Isi |
|------|------|-----|
| **Beranda** | `/dashboard` | Ringkasan jumlah penduduk dan selisih bulan lalu, kelompok umur, aktivitas terbaru, aksi cepat (hanya untuk peran yang boleh menambah), klik RT → daftar penduduk RT itu |
| **Penduduk** | `/penduduk`, `/penduduk/[id]`, `/penduduk/[id]/edit` | Daftar dengan pencarian dan filter multi-kolom (RT, jenis kelamin, agama, status perkawinan, pekerjaan, pendidikan, status), detail, edit dengan panel Perubahan, Pindah Keluar / Meninggal / Hapus, Cetak KK Sementara |
| **Mutasi** | `/mutasi` | Pindah Keluar (perorangan atau 1 KK) dan Pindah Masuk (1 orang atau 1 keluarga), Batalkan pindah keluar |
| **Kelahiran & Kematian** | `/vital` | Catat kelahiran (bayi masuk ke data penduduk) dan kematian (suksesi Kepala Keluarga otomatis), Batalkan kematian |
| **Monografi** | `/monografi` | Statistik penduduk (piramida umur dinamis, jenis kelamin, agama, pekerjaan, pendidikan, usia produktif dan tanggungan); klik item → tabel Penduduk terfilter |
| **Log Aktivitas** | `/log` | Semua operasi tulis dengan pengguna dan waktu; filter aksi, 500 entri terbaru |
| **Tempat Sampah** | `/recycle-bin` | Penduduk yang dihapus: Pulihkan, Hapus Permanen, Hapus Semua |
| **Profil** | `/profil` | Nama dan ganti kata sandi |
| **Pengaturan** | `/pengaturan` | Informasi wilayah, Kepala Desa, Pengguna, Tampilan, Ekspor data, Impor data, Pemeliharaan data (8 utilitas di `/pengaturan/*`) |

Lainnya: pencarian cepat **Ctrl+K**, tampilan HP berupa kartu, PWA yang bisa dipasang.

### Alur penduduk

- Penduduk baru **hanya** masuk lewat **Pindah Masuk** atau **Kelahiran** (`/penduduk/tambah` dialihkan ke daftar penduduk).
- Penduduk berkurang **hanya** lewat **Pindah Keluar** atau **Kematian**. Status `meninggal` / `mutasi-keluar` terkunci di Edit; kembalikan lewat **Batalkan**.
- **Pindah Masuk 1 keluarga**: isi tiap anggota lalu "Tambah Anggota"; anggota yang sedang diisi di formulir ikut tersimpan saat "Simpan Semua". Seluruh keluarga disimpan dalam satu transaksi (semua atau tidak sama sekali, aman diulang bila gagal). NIK yang sudah terdaftar sebagai penduduk aktif/meninggal ditolak (tidak menimpa); penduduk berstatus pindah keluar boleh masuk lagi.
- **Edit dan Detail catatan**: Edit Pindah Masuk dan Edit Kelahiran memakai isian yang sama persis dengan form Tambah (komponen `AnggotaFields` / `LahirFields` dipakai bersama), dan Detail menampilkan seluruh isian. Edit juga memperbarui data penduduk yang berasal dari catatan itu (hanya kolom yang Anda ubah; catatan, penduduk, dan log dalam satu transaksi).
- **Kelahiran**: catatan, penduduk, dan log disimpan dalam satu transaksi; NIK bayi yang sudah ada di data penduduk (status apa pun) ditolak, tidak menimpa.
- **Pencarian, urutan, dan filter** tersedia di keempat daftar catatan (Pindah Keluar, Pindah Masuk, Kelahiran, Kematian): cari nama / NIK / No. KK (nomor boleh ditempel dengan spasi atau strip), filter bulan dan RT, urutkan Terbaru / Terlama / Nama A–Z / Nama Z–A / RT / No. KK / NIK, tombol Reset. Logikanya ada di `lib/saring-catatan.ts`; RT untuk Pindah Keluar dan Kematian diambil dari data penduduk.

### RT/RW dan isian yang tercetak di KK

**RT dan RW selalu 3 digit** (`001`, `002`, ...) di tampilan, editor, filter, statistik Beranda/Monografi, ekspor Excel, impor Excel, dan Cetak KK (`lib/rt-rw.ts`). Data lama yang tersimpan sebagai `1` atau `01` otomatis tampil dan diedit sebagai `001`, dan tersimpan 3 digit saat disimpan ulang (tanpa migrasi massal).

**Skema isian** sama di form Tambah (Pindah Masuk, Kelahiran), modal Edit, dan Edit Penduduk. Isian yang dicetak di KK dibagi menjadi wajib dan opsional; pilihan wajib **tidak punya nilai bawaan** (dibiarkan kosong sampai dipilih) supaya tidak ada data salah yang tercetak diam-diam.

| Kolom KK | Isian | Status | Bila kosong, KK mencetak |
|----------|-------|--------|--------------------------|
| Nama Lengkap, NIK | `nama_lengkap`, `nik` | Wajib (NIK 16 digit) | — |
| Jenis Kelamin, Agama, Pendidikan, Jenis Pekerjaan, Status Perkawinan | pilihan | Wajib dipilih | — |
| Tempat dan Tanggal Lahir | `tempat_lahir`, `tanggal_lahir` | Wajib | — |
| Status Hubungan Dalam Keluarga | `hubungan_keluarga` | Wajib dipilih; satu Kepala Keluarga per KK | — |
| Alamat (kepala KK) | `alamat` | Wajib untuk Kepala Keluarga, opsional untuk anggota lain | `-` |
| RT/RW (kepala KK) | `rt`, `rw` | Wajib (selalu 3 digit) | `-` |
| Golongan Darah | `golongan_darah` | Opsional | `-` |
| Nama Ayah, Nama Ibu | `nama_ayah`, `nama_ibu` | Opsional (wajib di Kelahiran) | `-` |
| Tanggal Perkawinan, No. Paspor, No. KITAS | tidak ada isian | — | `-` (Kewarganegaraan dicetak WNI) |

Kelahiran memberi bawaan yang terlihat dan masuk akal untuk bayi: Hubungan `Anak`, Pendidikan `Tidak/Belum Sekolah`, Pekerjaan `Tidak/Belum Bekerja`, Status `Belum Kawin`. Jenis kelamin dan agama tetap harus dipilih.

**Cetak KK**: anggota diurutkan Kepala Keluarga, Istri, Anak (yang lebih tua dulu), dst.; kolom kosong dicetak `-`; alamat dan RT/RW diambil dari Kepala Keluarga (cadangan: anggota lain yang punya). Sebelum cetak, modal memperingatkan bila KK belum punya Kepala Keluarga, punya lebih dari satu, atau ada kolom wajib yang kosong (`lib/kk-lengkap.ts`). Peringatan tidak ikut tercetak.

### Hak akses

| Aksi | Admin | Operator | Viewer |
|------|:-----:|:--------:|:------:|
| Lihat semua data | ✓ | ✓ | ✓ |
| Tambah Pindah Masuk / Kelahiran, Pindah Keluar, Catat Meninggal, Edit penduduk | ✓ | ✓ | — |
| Edit catatan Mutasi/Kelahiran/Kematian, Batalkan, Hapus, Pulihkan, Pengaturan, atur kelompok umur | ✓ | — | — |
| Ganti kata sandi sendiri | ✓ | ✓ | ✓ |

Penjagaan di UI mengikuti `firestore.rules`; yang menentukan tetap rules di server.

---

## Arsitektur Penting

### Struktur folder
```
app/            Halaman (App Router)
components/     layout/ (AppShell, Sidebar, Topbar, CommandPalette), ui/ (rec-parts, dialog, field, ...),
                penduduk/, mutasi/, vital/, dashboard/, auth/, shared/ (AuthProvider)
hooks/          SEMUA akses tulis/baca Firestore (usePenduduk, useMutasi, useVital, useRecycleBin, ...)
lib/            Fungsi murni dan aturan (validasi-catatan, saring-catatan, angka, rt-rw, kk-lengkap, kk-succession, tanggal-lokal, ...)
store/          Zustand (authStore, appStore)
providers/      QueryProvider
e2e/            Playwright
firestore.rules Aturan keamanan (+ firestore.rules.test.ts)
```

### Firestore Collections
```
penduduk/{nik}          — data penduduk (NIK sebagai document ID)
mutasi_keluar/{id}      — catatan pindah keluar
mutasi_masuk/{id}       — catatan pindah masuk
lahir/{id}              — catatan kelahiran
meninggal/{id}          — catatan kematian
recycle_bin/{id}        — penduduk terhapus (dapat dipulihkan)
log/{id}                — log semua operasi
users/{uid}             — peran pengguna (admin / operator / viewer)
config/wilayah          — informasi wilayah + Kepala Desa
config/kelompok_umur    — konfigurasi kelompok umur
```

### Pola Kritis
- **NIK sebagai document ID** penduduk — jangan diubah. Tanggal tersimpan `YYYY-MM-DD`; "hari ini" memakai `hariIni()` (zona waktu setempat), bukan `toISOString()`.
- **Daftar UID yang diizinkan (5 UID)** ada di `firestore.rules` dan `hooks/useAuth.ts` — jangan diubah tanpa sengaja.
- **Penulisan data hanya lewat `hooks/`**; komponen tidak menulis ke Firestore langsung.
- **Tolak, jangan timpa**: Pindah Masuk, Kelahiran, Pulihkan, dan migrasi ID menolak bila NIK sudah ada, bukan menimpa diam-diam (pengecualian: Pindah Masuk boleh menimpa penduduk berstatus pindah keluar/tidak aktif — warga yang kembali).
- **Aturan validasi catatan satu sumber**: `lib/validasi-catatan.ts` dipakai form Tambah dan modal Edit.
- **Provider**: `ThemeProvider` dan `ToastProvider` hanya di root layout; `QueryProvider` di `providers/`; `useAuthListener` hanya dipanggil sekali, di `components/shared/AuthProvider.tsx`.
- **APP_VERSION** di `lib/utils.ts` harus sama dengan `package.json` dan README (dijaga `lib/versi.test.ts`).

---

## Menjalankan Lokal

```bash
npm ci
npm run dev
```

Buka `http://localhost:3000`. Buat `.env.local` berisi konfigurasi Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

| Perintah | Fungsi |
|----------|--------|
| `npm run lint` | ESLint |
| `npm test` | Vitest (tanpa emulator) |
| `npm run test:rules` | Tes `firestore.rules` (butuh Firebase emulator) |
| `npm run test:e2e` | Playwright (butuh Firebase asli) |
| `npm run build` | Build produksi |

Deploy `firestore.rules` bila berubah: lihat `PANDUAN_DEPLOY_RULES.md`.

---

## Setup Deployment Baru (Multi-Desa)

1. Buat project Firebase baru (Firestore + Authentication email/kata sandi) dan isi variabel `NEXT_PUBLIC_FIREBASE_*` di Vercel.
2. Ganti daftar UID di `firestore.rules` dan `hooks/useAuth.ts`, lalu deploy rules; buat dokumen `users/{uid}` dengan field `role`.
3. Ganti nama desa yang tertanam di kode: `app/layout.tsx`, `app/loading.tsx`, `components/auth/LoginForm.tsx`, `components/layout/*`, `store/appStore.ts`, `hooks/usePengaturan.ts`, `lib/utils.ts`, `public/manifest.json`; atur wilayah dan Kepala Desa di Pengaturan.
4. Push ke GitHub repo baru dan hubungkan ke Vercel.

---

## Standar Kode

- TypeScript strict — **0 error**; ESLint **0 error** sebelum deploy; tanpa `@ts-ignore`.
- `npm run lint`, `npm test`, dan `npm run build` harus lulus.
- Tanpa perubahan yang merusak data tanpa diskusi terlebih dahulu.

---

## Dokumen Pendukung

| Berkas | Isi |
|--------|-----|
| `PANDUAN_DEPLOY_RULES.md` | Cara deploy `firestore.rules` |
| `PANDUAN_VERIFIKASI_JSPDF_V4.md` | Cek visual hasil Cetak KK setelah upgrade jsPDF v4 |
| `PANDUAN_VERIFIKASI_RECHARTS_V3.md` | Cek visual grafik setelah upgrade Recharts v3 |
| `LAPORAN_TESTING_v2.8.0.md` | Laporan infrastruktur pengujian (v2.8.0) |
| `PENJELASAN_BUILD_FAILED*.md` | Catatan build gagal di Vercel akibat konflik merge (`package.json`, `README.md`) dan riwayat git yang tidak sinkron — saat memasang zip baru, ganti seluruh isi folder proyek, jangan menumpuk sebagian berkas |

---

## Riwayat Versi

### v3.2.0 — November 2026

Rilis **fitur dan perbaikan** di atas v3.1.0. Struktur data tetap; `firestore.rules` tidak berubah; tidak ada koleksi, field, atau query baru.

**Fitur baru**
- **Semua daftar angka bisa diklik, dengan petunjuk yang sama.** Di Beranda, kartu *Sebaran per dusun* dan *Kelompok umur* kini seperti *Sebaran per RT*: ada teks "Klik untuk melihat warga" dan tiap baris membuka Daftar Penduduk aktif yang sudah tersaring (kecuali baris "Lain-lain" yang bukan satu RT/dusun). Di Monografi, *Klasifikasi umur* juga bisa diklik (Agama, Status perkawinan, Tingkat pendidikan, dan Pekerjaan sudah). Pyramid dan Beban tanggungan sengaja tetap laporan (bukan daftar kategori).
- **Filter baru di Daftar Penduduk: Dusun dan Umur**, dan **Pendidikan menjadi chip biasa** yang bisa dipilih sendiri (dulu hanya tampil bila datang dari Monografi, sehingga tidak bisa dipilih atau diubah). Param URL: `?dusun=Nama`, `?umur=0-4` (rentang `min-maks`, `60-999` = 60+). Filter yang sedang aktif selalu tampil walau disembunyikan lewat "Tampilkan Filter". Kunci penyimpanan pilihan chip jadi `dapendig_filter_visible_v2` (sekali jalan, semua chip tampil lagi).
- **Tab Mutasi (Pindah keluar/masuk) dan Kelahiran & Kematian terkunci saat form Tambah atau Edit terbuka.** Dulu pindah tab menutup form diam-diam dan isiannya hilang. Kini tab lain tampak redup (`aria-disabled`), klik memunculkan pemberitahuan "Tutup form terlebih dahulu untuk pindah tab."; setelah form ditutup tab bebas dipindah.

**Perbaikan bug dan tampilan**
- **Angka umur Beranda disamakan dengan Daftar Penduduk dan Monografi** (`lib/umur.ts` memakai `hitungUmur` dari `dateUtils`). Dulu Beranda punya fungsi sendiri yang menganggap tanggal lahir rusak sebagai umur 0 (masuk "0–4 th"). Label kelompok umur Beranda kini rentang saja ("0–4 th"), tanpa nama Balita/Anak/dst., agar tidak bentrok dengan *Klasifikasi umur* Monografi yang memakai nama sama dengan rentang berbeda.
- **Bilah sebaran seragam**: lebar bilah sama di semua baris (baris yang tak bisa diklik dulu lebih panjang daripada yang bisa diklik karena ruang panah), sorotan *hover* hanya untuk baris yang bisa diklik, label panjang (mis. "Belum Tamat SD/Sederajat") membungkus alih-alih terpotong "…", dan di HP sempit bilah lebih lega (panah yang tak pernah tampil di layar sentuh tak lagi memakan ruang). Label tab Mutasi/Kelahiran & Kematian tidak lagi terbungkus dua baris di HP sempit.
- **Urutan Monografi**: Status perkawinan dan Tingkat pendidikan mengikuti urutan baku (jenjang), bukan jumlah terbanyak; Agama dan Pekerjaan tetap dari yang terbanyak.
- Nilai awal filter Daftar Penduduk kini satu sumber (`FILTER_AWAL`), bukan dua salinan; peringatan lint di `LoginForm.tsx` (pengalihan keras yang disengaja) diberi izin eksplisit sehingga `npm run lint` kembali 0 peringatan.

**Tes**: `lib/umur.test.ts` dan `components/ui/rec-parts.test.tsx` ditambahkan.

### v3.1.0 — November 2026

Rilis **fitur dan perbaikan** di atas redesain v3.0.0. Struktur data lama tetap terbaca; `firestore.rules` tidak berubah.

**Fitur baru**
- **Dusun, RT, dan RW dapat diatur** (Pengaturan → Dusun, RT, dan RW, khusus admin). Dulu pemetaan RT → Dusun tertulis tetap di hook dashboard (hanya cocok untuk satu desa). Sekarang tiap dusun punya nama dan daftar RT sendiri (RT tidak harus berurutan, mis. RT 007 boleh masuk dusun yang sama dengan RT 001–003); satu RT hanya di satu dusun, nama dusun unik. Gabungan RT semua dusun menjadi pilihan RT di semua form dan filter (Pindah Masuk, Kelahiran, Edit/Tambah penduduk, filter Penduduk/Mutasi/Kelahiran & Kematian) dan statistik dusun di Beranda. Form menampilkan isian **Dusun** hanya-baca yang mengikuti RT, dan Detail penduduk punya baris Dusun sendiri. **Daftar RW** juga diatur di seksi yang sama (bawaan 001–005, sama dengan `RW_LIST` lama) dan menjadi pilihan RW di semua form. Belum disimpan → memakai bawaan Desa Karang Sengon (hasilnya sama dengan sebelumnya). Disimpan di dokumen `config/dusun` (field `dusun` dan `rw`; koleksi `config` yang sudah ada). Kode: `lib/dusun.ts`, `hooks/useDusunAktif.ts`, `components/pengaturan/DusunRtSection.tsx`.
- **Edit catatan Pindah Masuk dan Kelahiran ikut memperbarui menu Penduduk** (dulu hanya catatan, sehingga catatan dan data penduduk bisa berbeda dan memicu duplikat atau galat). Hanya kolom yang berubah yang diteruskan, jadi isian yang sudah diubah lewat Edit penduduk tidak tertimpa isian lama; catatan, penduduk, dan log ditulis dalam satu transaksi; NIK baru yang sudah dipakai penduduk lain ditolak; bila penduduknya tidak ditemukan (mis. sudah dihapus), catatan tetap diperbarui dan toast memberi peringatan. Kode: `lib/sinkron-catatan.ts` (aturan murni) dan `lib/sinkron-catatan-tulis.ts` (transaksi Firestore).

**Perbaikan bug dan tampilan**
- **Konsistensi ikon dan warna** lewat satu registri (`lib/visual.ts`, `components/ui/jk-ikon.tsx`). Peristiwa: Kelahiran = Baby (hijau), Pindah masuk = ArrowLeftFromLine (hijau), Kematian = HeartCrack (abu-abu), Pindah keluar = ArrowRightFromLine (merah). Jenis kelamin: Laki-laki = Mars (biru `--lk`), Perempuan = Venus (merah muda `--pr`), filter campuran = VenusAndMars. Yang diperbaiki: Kematian di Beranda memakai HeartPulse (kini HeartCrack; HeartPulse hanya untuk menu gabungan "Kelahiran & Kematian"); Pindah keluar memakai LogOut/UserMinus (LogOut kini hanya untuk keluar akun); Pindah masuk di Beranda berwarna emas padahal di Mutasi hijau; kartu Perempuan di Monografi berwarna emas berikon User (kini Venus merah muda) dan donat/legenda laki-laki memakai biru navy bukan `--lk`; chip filter Jenis kelamin/Status kawin/Pekerjaan berikon Users/HeartPulse/IdCard (kini VenusAndMars/HeartHandshake/Briefcase); Pengguna di Pengaturan berikon Users (kini UserCog). `lib/visual.test.ts` memindai sumber supaya penyimpangan baru ketahuan.
- **Toast/notifikasi tampil di atas layar** (dulu di bawah, sering tertutup bilah bawah dan jempol di HP). **Kontrol Laki-laki/Perempuan** di Edit penduduk kini tegas di tema terang dan gelap (terpilih: isi biru penuh, teks putih tebal, ring; sebelumnya hampir sama dengan alasnya di tema gelap).

**Dependensi dan proses**
- **Next.js 16.4.3** (sebelumnya 16.3.0) beserta `eslint-config-next`; hanya paket turunan Next (`sharp`, `@swc/helpers`, dll.) yang ikut berubah di `package-lock.json`.
- **Skema versi dijalankan, bukan sekadar ditulis**: nomor versi naik pada setiap rilis yang diserahkan. `npm run versi -- patch|minor|major|X.Y.Z` mengubah keempat tempat versi sekaligus dan menambah kerangka entri di sini (`scripts/naikkan-versi.mjs`, diuji di `lib/naikkan-versi.test.ts`).

**Pengujian**: 477 tes Vitest (v3.0.0: 389). Tanpa koleksi, indeks, atau env baru; `firestore.rules` tidak berubah (`config/{doc}` sudah boleh ditulis admin). Satu dokumen baru `config/dusun` di koleksi `config` yang sudah ada.

**Belum bisa diverifikasi di sandbox**: Firestore/Auth asli (khususnya transaksi simpan Edit catatan + penduduk dan simpan `config/dusun`), e2e Playwright, unduhan PDF Cetak KK.

### v3.0.0 — Oktober 2026 (redesain)

**Tampilan dan alur**
- Redesain seluruh halaman: identitas navy dan emas dari logo balai desa, font Bricolage Grotesque + Instrument Sans, tema terang (bawaan) atau gelap, menu berkelompok, Beranda baru (kelompok umur, aktivitas terbaru, aksi cepat), pencarian cepat Ctrl+K, sidebar yang bisa diciutkan, tampilan kartu di HP.
- Penduduk baru hanya masuk lewat Pindah Masuk dan Kelahiran; halaman Vital menjadi **Kelahiran & Kematian**.
- Daftar Mutasi/Kelahiran/Kematian berpaginasi (25 baris per halaman).

**Fitur baru**
- **Urutan dan filter RT** di Pindah Keluar, Pindah Masuk, Kelahiran, dan Kematian, plus tombol Reset; pencarian nomor NIK/No. KK kini menerima spasi/strip.
- Isian **Golongan Darah** (opsional) di Pindah Masuk; modal Edit catatan memakai validasi yang sama dengan form Tambah.

**Perbaikan bug**
- **RT dan RW 3 digit** (`001`, `002`, ...) di semua tampilan, editor, filter, statistik, ekspor, impor, dan Cetak KK; data lama `1`/`01` otomatis tampil dan diedit sebagai `001` (`lib/rt-rw.ts`). Statistik RT di Beranda dan Monografi kini menggabungkan data lama dan baru (dulu `1` dan `001` terpisah, `1` masuk "Lain-lain").
- **Skema wajib/opsional isian dicocokkan dengan Cetak KK** (lihat tabel "RT/RW dan isian yang tercetak di KK"): jenis kelamin, agama, hubungan keluarga, status perkawinan, pendidikan, dan pekerjaan wajib dipilih tanpa nilai bawaan (dulu bawaan seperti Laki-laki, Islam, Kepala Keluarga, Tidak/Belum Sekolah tercetak salah diam-diam); alamat wajib untuk Kepala Keluarga; nama ayah/ibu dan golongan darah ditandai opsional; satu KK hanya boleh satu Kepala Keluarga di daftar Pindah Masuk 1 Keluarga; agama terbawa ke anggota berikutnya.
- **Edit penduduk** kini punya isian **Golongan Darah** (sebelumnya tercetak di KK tetapi tidak bisa diisi/diubah setelah Pindah Masuk atau impor); pilihan kosong pada data lama tampil kosong, tidak diam-diam diganti pilihan pertama.
- **Cetak KK**: urutan anggota benar di semua pintu masuk (dulu tidak berurutan bila dicetak dari halaman detail), kolom kosong dicetak `-` (dulu sel kosong), RT/RW 3 digit, alamat/RT/RW cadangan dari anggota lain, dan peringatan kelengkapan data sebelum cetak.
- **Status terpilih vs tidak terpilih** (tab, segmen Aktif/Semua/Lainnya, chip filter, menu samping, tombol Terang/Gelap, pilihan 1 Orang/1 Keluarga, navigasi Pengaturan, menu popover) diperjelas di tema terang dan gelap: terpilih berisi warna penuh dengan teks putih tebal, tidak terpilih berteks kuat di atas alas yang jelas berbeda (blok terakhir `app/globals.css`).
- **Isian NIK dan No. KK** di semua form Tambah, modal Edit, dan Edit penduduk hanya menerima angka (maksimal 16 digit); nomor yang ditempel dengan spasi/titik/strip tetap utuh (dulu huruf diterima, dan tempelan "3511 0300 0000 1826" terpotong di 13 digit karena `maxLength`). Helper: `lib/angka.ts`.
- **Edit catatan Pindah Masuk dan Kelahiran** kini memuat isian yang sama dengan form Tambah (19 dan 15 isian; dulu 10 dan 12: tanpa jenis kelamin, tempat/tanggal lahir, agama, hubungan keluarga, status perkawinan, nama ayah/ibu, golongan darah, RT/RW berupa teks bebas) dan Detail menampilkan semuanya.
- **Pindah Masuk 1 keluarga**: anggota yang sedang diisi (belum diklik "Tambah Anggota") tidak lagi hilang diam-diam saat "Simpan Semua" — hanya anggota paling atas yang tersimpan; seluruh keluarga disimpan atomik sehingga gagal di tengah tidak meninggalkan data setengah jadi dan mengulang tidak menggandakan catatan; NIK kembar di daftar atau yang sudah terdaftar ditolak; NIK kosong tidak lagi meninggalkan catatan tanpa penduduk.
- **Kelahiran**: NIK bayi yang sudah ada tidak lagi ditimpa diam-diam, NIK kosong tidak lagi meninggalkan catatan kelahiran tanpa penduduk, dan simpan atomik (tidak ada catatan setengah jadi); alasan penolakan tampil di toast.
- Tahun NIK 2 digit tidak lagi digeser 100 tahun (kasus ambigu ditandai "Perlu dicek manual").
- Pulihkan dari Tempat Sampah memakai transaksi ber-ID NIK dan menolak NIK ganda; "Hapus semua" memakai jumlah terbaru.
- Tanggal "hari ini" memakai zona waktu setempat (sebelumnya UTC: pukul 06.00 WIB terbaca kemarin).
- Kegagalan simpan tidak lagi senyap (toast galat, isian tetap), termasuk Impor; mapping kolom Impor Excel diperbaiki.
- Hapus catatan Pindah Keluar/Kematian dikunci selama penduduk masih berstatus itu; Edit penduduk tidak bisa mengubah status tersebut.
- UI hanya menawarkan aksi yang diizinkan rules (Pulihkan, Edit catatan, kelompok umur, nama Profil = admin); halaman utilitas dan Edit penduduk menolak peran yang tidak berhak.
- Log: opsi filter aksi sesuai nilai nyata, tombol Segarkan dan Reset terpisah, peringatan bila ada lebih dari 500 entri.
- Utilitas migrasi melaporkan hasil nyata (berhasil/gagal), `migrate-docid` tidak menimpa dokumen yang sudah ada; satu `ToastProvider`.

**Pengujian**: 389 tes Vitest (v2.9.1: 61). Tanpa koleksi, field, indeks, atau env baru; `firestore.rules` tidak berubah.

**Belum bisa diverifikasi di sandbox**: Firestore/Auth asli (khususnya transaksi simpan Pindah Masuk dan Pulihkan), e2e Playwright, unduhan PDF Cetak KK.

### Riwayat v2.x (sebelum redesain)

| Versi | Tanggal | Ringkasan |
|-------|---------|-----------|
| v2.9.1 | Ags 2026 | Fix scrollbar horizontal tipis yang muncul di atas ikon akun pada tampilan desktop — sidebar bersifat position:fixed sehingga berada di luar overflow-hidden parent-nya (perilaku CSS dasar), tambah overflow-hidden langsung di elemen sidebar untuk menutup celah tanpa menyentuh html/body atau scroll tabel di halaman lain |
| v2.9.0 | Ags 2026 | Bersihkan npm deprecation warning: overrides untuk uuid/glob/rimraf (10→4 warning, sisanya genuinely tak ada versi bersih), upgrade recharts v2→v3 (3 chart di dashboard, fix 3 Tooltip formatter untuk tipe ValueType baru, verified sama persis untuk data nyata) |
| v2.8.0 | Ags 2026 | Infrastruktur testing menyeluruh: Vitest (61 unit+integration test), Firebase Rules test, Playwright E2E — semua siap pakai. Bug ditemukan & diperbaiki lewat proses testing: validasi kalender tanggal (30 Feb dulu diam-diam diterima), dead code "Suami" di suksesi KK, 4 tempat zero-padding tanggal yang terlewat sesi lalu, dan XSS di Cetak KK Sementara (data penduduk kini di-escape sebelum masuk HTML) |
| v2.7.2 | Ags 2026 | Fix tanggal lahir tidak konsisten zero-padding (01 bukan 1) di 2 tempat, fix perataan card Komposisi Beban Tanggungan di Monografi, Tanggal Cetak KK Sementara kini bisa diubah manual (default hari ini) |
| v2.7.1 | Ags 2026 | Fix 3 kerentanan keamanan dari npm audit: upgrade firebase ke 12.17.1 (hapus 7 kerentanan SDK), upgrade jsPDF ke 4.2.1 (hapus kerentanan critical, perlu verifikasi visual cetak KK — lihat PANDUAN_VERIFIKASI_JSPDF_V4.md), migrasi xlsx (SheetJS, terkunci permanen di npm sejak 2022) ke ExcelJS untuk ekspor/impor data |
| v2.7.0 | Ags 2026 | Fix suksesi KK (unifikasi 2 jalur pencatatan kematian + rollback yang benar-benar memulihkan), fix race condition NIK duplikat (transaction), fix build gagal jika env Firebase kosong, cetak KK Sementara lepas dari CDN eksternal (vendor lokal), hapus fitur Surat Resmi (sudah tak dipakai), upgrade Next.js 16.3.0 |
