'use client'

/**
 * CetakKKModal — Preview & cetak Kartu Keluarga Sementara
 *
 * Layout persis mengikuti format KK resmi terbaru (2 tabel terpisah):
 * - Tabel Atas  : No | Nama Lengkap | NIK | JK | Tempat Lahir | Tgl Lahir | Agama | Pendidikan | Pekerjaan | Gol. Darah
 * - Tabel Bawah : No | Status Kawin | Tgl Kawin/Cerai | Hub. Keluarga | Kewarganegaraan | No. Paspor | No. KITAP | Nama Ayah | Nama Ibu
 *
 * Cetak via window.print() — CSS @media print tersuntik ke <style> di dalam modal.
 * Tidak membutuhkan library tambahan.
 */

import { useEffect, useRef } from 'react'
import { X, Printer } from 'lucide-react'
import type { Penduduk } from '@/types'
import type { ConfigWilayah } from '@/types'
import { formatTanggalLahir } from '@/lib/dateUtils'

interface Props {
  noKk: string
  anggota: Penduduk[]   // sudah diurutkan: KK → Istri → Anak → dst
  wilayah: ConfigWilayah
  onClose: () => void
}

// Format tanggal cetak: DD Bulan YYYY (Indonesia)
function formatTanggalCetak(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Kepala Keluarga — anggota pertama dengan hubungan Kepala Keluarga
function getKepalaKeluarga(anggota: Penduduk[]): Penduduk | undefined {
  return anggota.find((p) => p.hubungan_keluarga === 'Kepala Keluarga')
}

export function CetakKKModal({ noKk, anggota, wilayah, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const kk = getKepalaKeluarga(anggota)
  const tanggalCetak = formatTanggalCetak(new Date())

  // Maksimal 10 baris sesuai format KK resmi
  const rows = anggota.slice(0, 10)

  // Isi baris kosong jika kurang dari 10 anggota
  const emptyRows = Array.from({ length: Math.max(0, 10 - rows.length) })

  function handleCetak() {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=1123,height=794')
    if (!printWindow) {
      alert('Pop-up diblokir browser. Izinkan pop-up untuk halaman ini.')
      return
    }

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>KK Sementara — ${noKk}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: A4 landscape;
      margin: 0;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 9pt;
      background: white;
      color: black;
    }
    .page {
      width: 297mm;
      min-height: 210mm;
      padding: 6mm 8mm 5mm 8mm;
      margin: 0 auto;
      background: white;
    }
    /* Header */
    .header {
      display: flex;
      align-items: flex-start;
      gap: 6mm;
      margin-bottom: 2mm;
    }
    .garuda-placeholder {
      width: 22mm;
      height: 22mm;
      border: 1px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7pt;
      text-align: center;
      flex-shrink: 0;
      color: #333;
    }
    .judul-block {
      flex: 1;
      text-align: center;
    }
    .judul-kk {
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 2px;
      line-height: 1.1;
    }
    .nomor-kk {
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 1px;
      margin-top: 1mm;
    }
    .info-block {
      width: 70mm;
      flex-shrink: 0;
    }
    .info-row {
      display: flex;
      font-size: 8pt;
      line-height: 1.5;
    }
    .info-label { width: 28mm; }
    .info-colon { width: 5mm; }
    .info-val { flex: 1; font-weight: bold; }
    .header-data {
      display: flex;
      gap: 4mm;
      margin-bottom: 2mm;
      margin-top: 1mm;
    }
    .kk-data-kiri { flex: 1; }
    .kk-data-kanan { width: 70mm; }
    .data-row { display: flex; font-size: 8pt; line-height: 1.6; }
    .data-label { width: 28mm; }
    .data-colon { width: 5mm; }
    .data-val { flex: 1; font-weight: bold; }
    /* TABEL */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.5mm;
      font-size: 7.5pt;
    }
    th, td {
      border: 0.5pt solid #000;
      padding: 1mm 1.5mm;
      vertical-align: middle;
      line-height: 1.3;
    }
    th {
      background: #d9d9d9;
      font-weight: bold;
      text-align: center;
      font-size: 7pt;
    }
    td { text-align: center; }
    td.left { text-align: left; }
    .col-no     { width: 5mm; }
    .col-nama   { width: 40mm; text-align: left; }
    .col-nik    { width: 28mm; font-family: 'Courier New', monospace; font-size: 7pt; }
    .col-jk     { width: 8mm; }
    .col-tl     { width: 24mm; }
    .col-ttl    { width: 20mm; }
    .col-agama  { width: 18mm; }
    .col-pend   { width: 26mm; }
    .col-pek    { width: 32mm; text-align: left; }
    .col-gol    { width: 10mm; }
    .col-statkawin { width: 20mm; }
    .col-tglkawin  { width: 18mm; }
    .col-hub    { width: 26mm; }
    .col-wn     { width: 14mm; }
    .col-paspor { width: 18mm; }
    .col-kitap  { width: 18mm; }
    .col-ayah   { width: 36mm; text-align: left; }
    .col-ibu    { width: 36mm; text-align: left; }
    tr.data-row td { height: 7.5mm; }
    /* Footer */
    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 2mm;
      gap: 4mm;
    }
    .ttd-block { text-align: center; width: 60mm; }
    .ttd-tengah { text-align: center; width: 60mm; }
    .ttd-kanan { text-align: center; width: 70mm; }
    .ttd-nama { font-weight: bold; font-size: 9pt; margin-top: 15mm; border-bottom: 0.5pt solid #000; padding-bottom: 1mm; }
    .ttd-jabatan { font-size: 8pt; margin-top: 1mm; }
    .ttd-nip { font-size: 8pt; }
    .tgl-dikeluarkan { font-size: 8.5pt; }
    .tgl-box { display: inline-block; border: 1pt solid #000; padding: 1mm 3mm; margin-left: 2mm; font-weight: bold; }
    .disclaimer {
      text-align: center;
      font-size: 7.5pt;
      margin-top: 2mm;
      padding-top: 2mm;
      border-top: 0.5pt solid #666;
      color: #333;
      font-style: italic;
    }
    @media print {
      body { margin: 0; }
      .page { padding: 5mm 7mm 4mm 7mm; }
    }
  </style>
</head>
<body>
${printContent.innerHTML}
</body>
</html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 300)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl flex flex-col w-full max-w-2xl max-h-[92dvh]">

        {/* Header modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
              <Printer size={17} className="text-sky-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-100 text-sm">Cetak KK Sementara</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">No. KK: {noKk}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Info & preview */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {/* Peringatan belum isi data kades */}
          {!wilayah.nama_kades && (
            <div className="mb-4 flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-amber-400 text-sm shrink-0">⚠</span>
              <p className="text-sm text-amber-300">
                Nama Kepala Desa belum diisi. Pergi ke{' '}
                <span className="font-semibold">Pengaturan → Informasi Wilayah</span>{' '}
                untuk mengisi data Kepala Desa sebelum mencetak.
              </p>
            </div>
          )}

          {/* Info ringkas */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              ['Kepala Keluarga', kk?.nama_lengkap ?? '—'],
              ['Jumlah Anggota', `${anggota.length} orang`],
              ['Desa', `Desa ${wilayah.desa}`],
              ['Tanggal Cetak', tanggalCetak],
            ].map(([label, val]) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-medium text-slate-200 mt-0.5">{val}</p>
              </div>
            ))}
          </div>

          {anggota.length > 10 && (
            <p className="text-xs text-amber-400 mb-3">
              KK ini memiliki {anggota.length} anggota. Format KK standar hanya menampilkan 10 baris pertama.
            </p>
          )}

          <p className="text-xs text-slate-500 mb-4">
            Dokumen akan dibuka di tab baru untuk dicetak atau disimpan sebagai PDF.
            Pastikan ukuran kertas diatur ke <span className="text-slate-300 font-medium">A4 Landscape</span> di dialog cetak browser.
          </p>
        </div>

        {/* Tombol aksi */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-t border-white/[0.06] shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleCetak}
            disabled={!wilayah.nama_kades}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            <Printer size={15} />
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* Konten HTML untuk dicetak — tersembunyi di layar */}
      <div className="hidden">
        <div ref={printRef}>
          <div className="page">
            {/* ── HEADER ── */}
            <div className="header">
              <div className="garuda-placeholder">
                [Lambang<br/>Garuda]
              </div>
              <div className="judul-block">
                <div className="judul-kk">KARTU KELUARGA SEMENTARA</div>
                <div className="nomor-kk">No. &nbsp; {noKk}</div>
              </div>
              <div className="info-block">
                <div className="info-row">
                  <span className="info-label">Desa/Kelurahan</span>
                  <span className="info-colon">:</span>
                  <span className="info-val">{wilayah.desa}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Kecamatan</span>
                  <span className="info-colon">:</span>
                  <span className="info-val">{wilayah.kecamatan}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Kabupaten/Kota</span>
                  <span className="info-colon">:</span>
                  <span className="info-val">{wilayah.kabupaten}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Provinsi</span>
                  <span className="info-colon">:</span>
                  <span className="info-val">{wilayah.provinsi}</span>
                </div>
              </div>
            </div>

            {/* Data KK Header */}
            <div className="header-data">
              <div className="kk-data-kiri">
                <div className="data-row">
                  <span className="data-label">Nama Kepala Keluarga</span>
                  <span className="data-colon">:</span>
                  <span className="data-val">{kk?.nama_lengkap ?? '—'}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Alamat</span>
                  <span className="data-colon">:</span>
                  <span className="data-val">{kk?.alamat ?? '—'}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">RT/RW</span>
                  <span className="data-colon">:</span>
                  <span className="data-val">{kk ? `${kk.rt}/${kk.rw}` : '—'}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Kode Pos</span>
                  <span className="data-colon">:</span>
                  <span className="data-val">—</span>
                </div>
              </div>
              <div className="kk-data-kanan" />
            </div>

            {/* ── TABEL ATAS ── */}
            <table>
              <thead>
                <tr>
                  <th className="col-no">No</th>
                  <th className="col-nama">Nama Lengkap</th>
                  <th className="col-nik">NIK</th>
                  <th className="col-jk">Jenis Kelamin</th>
                  <th className="col-tl">Tempat Lahir</th>
                  <th className="col-ttl">Tanggal Lahir</th>
                  <th className="col-agama">Agama</th>
                  <th className="col-pend">Pendidikan</th>
                  <th className="col-pek">Jenis Pekerjaan</th>
                  <th className="col-gol">Golongan Darah</th>
                </tr>
                <tr>
                  {['', '(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)'].map((n, i) => (
                    <th key={i}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="data-row">
                    <td>{i + 1}</td>
                    <td className="left">{p.nama_lengkap}</td>
                    <td className="col-nik">{p.nik || '-'}</td>
                    <td>{p.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                    <td>{p.tempat_lahir || '-'}</td>
                    <td>{p.tanggal_lahir ? formatTanggalLahir(p.tanggal_lahir) : '-'}</td>
                    <td>{p.agama || '-'}</td>
                    <td>{p.pendidikan || '-'}</td>
                    <td className="left">{p.pekerjaan || '-'}</td>
                    <td>{p.golongan_darah || '-'}</td>
                  </tr>
                ))}
                {emptyRows.map((_, i) => (
                  <tr key={`empty-a-${i}`} className="data-row">
                    <td>{rows.length + i + 1}</td>
                    <td>-</td><td>-</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── TABEL BAWAH ── */}
            <table>
              <thead>
                <tr>
                  <th className="col-no">No</th>
                  <th className="col-statkawin">Status Perkawinan</th>
                  <th className="col-tglkawin">Tanggal Perkawinan / Perceraian</th>
                  <th className="col-hub">Status Hubungan Dalam Keluarga</th>
                  <th className="col-wn">Kewarganegaraan</th>
                  <th className="col-paspor" colSpan={1}>
                    <div>Dokumen Imigrasi</div>
                    <div style={{display:'flex'}}>
                      <div style={{flex:1}}>No. Paspor</div>
                      <div style={{flex:1}}>No. KITAP</div>
                    </div>
                  </th>
                  <th className="col-kitap" style={{display:'none'}} />
                  <th colSpan={2}>Nama Orang Tua</th>
                </tr>
                <tr>
                  <th></th>
                  <th>(10)</th>
                  <th>(11)</th>
                  <th>(12)</th>
                  <th>(13)</th>
                  <th>(14)</th>
                  <th>(15)</th>
                  <th>(16)</th>
                  <th>(17)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="data-row">
                    <td>{i + 1}</td>
                    <td>{p.status_perkawinan || '-'}</td>
                    <td>-</td>
                    <td>{p.hubungan_keluarga || '-'}</td>
                    <td>WNI</td>
                    <td>-</td>
                    <td>-</td>
                    <td className="left">{p.nama_ayah || '-'}</td>
                    <td className="left">{p.nama_ibu || '-'}</td>
                  </tr>
                ))}
                {emptyRows.map((_, i) => (
                  <tr key={`empty-b-${i}`} className="data-row">
                    <td>{rows.length + i + 1}</td>
                    <td>-</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── FOOTER ── */}
            <div className="footer-section">
              {/* Kiri: tanggal dikeluarkan */}
              <div style={{paddingTop:'2mm'}}>
                <span className="tgl-dikeluarkan">
                  Dikeluarkan Tanggal:
                  <span className="tgl-box">{tanggalCetak}</span>
                </span>
              </div>

              {/* Tengah: Kepala Keluarga */}
              <div className="ttd-tengah">
                <div style={{fontSize:'8.5pt', fontWeight:'bold'}}>KEPALA KELUARGA</div>
                <div className="ttd-nama">{kk?.nama_lengkap ?? '................................'}</div>
                <div className="ttd-jabatan">Tanda Tangan/Cap Jempol</div>
              </div>

              {/* Kanan: Kepala Desa */}
              <div className="ttd-kanan">
                <div style={{fontSize:'8pt', fontWeight:'bold', textTransform:'uppercase', lineHeight:'1.4'}}>
                  {wilayah.jabatan_kades ?? 'KEPALA DESA'}
                </div>
                <div style={{fontSize:'7.5pt'}}>
                  DESA {(wilayah.desa ?? '').toUpperCase()}, KEC. {(wilayah.kecamatan ?? '').toUpperCase()}
                </div>
                <div style={{fontSize:'7.5pt'}}>
                  KAB. {(wilayah.kabupaten ?? '').toUpperCase()}
                </div>
                <div className="ttd-nama">
                  {wilayah.nama_kades ?? '................................'}
                </div>
                {wilayah.nip_kades && (wilayah.jabatan_kades === 'Pj. Kepala Desa' || wilayah.jabatan_kades === 'Plt. Kepala Desa') && (
                  <div className="ttd-nip">NIP. {wilayah.nip_kades}</div>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="disclaimer">
              Dokumen ini merupakan Kartu Keluarga Sementara yang diterbitkan oleh Pemerintah Desa {wilayah.desa},
              berlaku selama Kartu Keluarga definitif masih dalam proses penerbitan di Dinas Kependudukan dan Pencatatan Sipil.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
