# Vendor files

File di folder ini disalin langsung dari `node_modules` saat build/development,
BUKAN ditulis manual. Dipakai oleh `components/penduduk/CetakKKModal.tsx` untuk
generate PDF Cetak KK Sementara di jendela print terpisah (yang butuh library
global `window.jsPDF`/`window.html2canvas`, bukan ES module import biasa).

Sebelumnya file-file ini dimuat langsung dari CDN (cdnjs.cloudflare.com) saat
runtime. Sejak v2.7.0, disajikan same-origin dari sini supaya fitur cetak
tidak bergantung koneksi internet ke pihak ketiga saat dipakai operator.

| File | Sumber npm package | Versi |
|---|---|---|
| `jspdf.umd.min.js` | `node_modules/jspdf/dist/jspdf.umd.min.js` | **4.2.1** (upgrade dari 2.5.1 di v2.7.0 — lihat catatan di bawah) |
| `html2canvas.min.js` | `node_modules/html2canvas/dist/html2canvas.min.js` | 1.4.1 |

## Catatan upgrade jsPDF 2.5.1 → 4.2.1 (v2.7.1)

Upgrade ini dilakukan untuk menghapus 1 kerentanan `critical` (jspdf) dan 1
`moderate` (dompurify, dependency jspdf) yang tercatat di `npm audit`.

Sudah diverifikasi secara terprogram:
- API yang dipakai (`new jsPDF({orientation, unit, format})`, `addPage()`,
  `addImage()`, `save()`) identik di dokumentasi resmi v4 — tidak ada
  perubahan signature.
- `tsc` dan `npm run build` lolos bersih.

BELUM bisa diverifikasi secara otomatis (perlu dicek manual sekali oleh
pengguna): apakah HASIL VISUAL PDF (layout, watermark, font) benar-benar
identik piksel-demi-piksel dengan versi 2.5.1 sebelumnya. Sandbox tempat
perubahan ini dikerjakan tidak punya akses jaringan ke Chrome/Chromium
binary sehingga tidak bisa merender & membandingkan screenshot PDF secara
otomatis — lihat `PANDUAN_VERIFIKASI_JSPDF_V4.md` di root project untuk
cara cek cepat.


## Cara update (jika suatu saat perlu)

```bash
npm install jspdf@<versi> html2canvas@<versi> --save
cp node_modules/jspdf/dist/jspdf.umd.min.js public/vendor/jspdf.umd.min.js
cp node_modules/html2canvas/dist/html2canvas.min.js public/vendor/html2canvas.min.js
```

**PENTING**: Sebelum upgrade versi, uji dulu hasil cetak KK Sementara secara
visual (layout, watermark, font) — versi baru library bisa mengubah cara
canvas di-render meski API-nya terlihat sama.

Folder ini sengaja dikecualikan dari ESLint (lihat `eslint.config.mjs`)
karena isinya file minified pihak ketiga, bukan source code project.
