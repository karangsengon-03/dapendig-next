'use client'

import { useState, useRef } from 'react'
import { X, Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { formatTanggal } from '@/lib/utils'
import { db } from '@/lib/firebase'
import { doc, runTransaction, getDoc } from 'firebase/firestore'
import type { Penduduk } from '@/types'

export const JENIS_SURAT = [
  { value: 'domisili', label: 'Surat Keterangan Domisili' },
  { value: 'tidak_mampu', label: 'Surat Keterangan Tidak Mampu' },
  { value: 'usaha', label: 'Surat Keterangan Usaha' },
  { value: 'belum_menikah', label: 'Surat Keterangan Belum Menikah' },
] as const

export type JenisSurat = typeof JENIS_SURAT[number]['value']

interface SuratModalProps {
  penduduk: Penduduk
  onClose: () => void
}

const KODE_SURAT: Record<JenisSurat, string> = {
  domisili: '470',
  tidak_mampu: '474',
  usaha: '503',
  belum_menikah: '472',
}

// Ambil + increment counter dari Firestore secara atomic
// Path: counter_surat/{jenis_bulan_tahun}  field: urut
async function getNextNomor(jenis: JenisSurat): Promise<string> {
  const now = new Date()
  const bulan = String(now.getMonth() + 1).padStart(2, '0')
  const tahun = now.getFullYear()
  const counterKey = `${jenis}_${bulan}_${tahun}`
  const counterRef = doc(db, 'counter_surat', counterKey)

  const urut = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const current = snap.exists() ? (snap.data().urut as number) : 0
    const next = current + 1
    tx.set(counterRef, { jenis, bulan, tahun, urut: next }, { merge: true })
    return next
  })

  const nomorUrut = String(urut).padStart(3, '0')
  return `${nomorUrut}/${KODE_SURAT[jenis]}/KS.DS/${bulan}/${tahun}`
}

function getTanggalIndonesia(date = new Date()): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function hitungUmur(tanggalLahir: string): string {
  if (!tanggalLahir) return '-'
  const lahir = new Date(tanggalLahir + 'T00:00:00')
  const now = new Date()
  let umur = now.getFullYear() - lahir.getFullYear()
  const m = now.getMonth() - lahir.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < lahir.getDate())) umur--
  return `${umur} tahun`
}

// ── Konten surat ─────────────────────────────────────────────────────────────

function PersonTable({ p }: { p: Penduduk }) {
  const rows = [
    ['Nama Lengkap', p.nama_lengkap],
    ['NIK', p.nik],
    ['No. KK', p.no_kk],
    ['Tempat / Tgl. Lahir', `${p.tempat_lahir} / ${formatTanggal(p.tanggal_lahir)}`],
    ['Umur', hitungUmur(p.tanggal_lahir)],
    ['Jenis Kelamin', p.jenis_kelamin],
    ['Agama', p.agama],
    ['Pekerjaan', p.pekerjaan],
    ['Pendidikan', p.pendidikan],
    ['Status Perkawinan', p.status_perkawinan],
    ['Alamat', `RT ${p.rt} / RW ${p.rw}${p.alamat ? `, ${p.alamat}` : ''}`],
  ]
  return (
    <table className="w-full text-sm mb-1" style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className="py-0.5 pr-2 align-top" style={{ width: '200px' }}>{label}</td>
            <td className="py-0.5 pr-2 align-top" style={{ width: '8px' }}>:</td>
            <td className="py-0.5 align-top font-medium">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function KontenDomisili({ p, desa, kecamatan, kabupaten }: { p: Penduduk; desa: string; kecamatan: string; kabupaten: string }) {
  return (
    <p className="text-justify leading-loose">
      Yang bertanda tangan di bawah ini Kepala Desa {desa}, Kecamatan {kecamatan}, Kabupaten {kabupaten}, dengan ini menerangkan bahwa:
      <br /><br />
      <PersonTable p={p} />
      <br />
      Adalah benar warga yang berdomisili dan bertempat tinggal di Desa {desa}, Kecamatan {kecamatan}, Kabupaten {kabupaten}, RT {p.rt} / RW {p.rw}{p.alamat ? `, ${p.alamat}` : ''}.
      <br /><br />
      Surat keterangan ini dibuat untuk keperluan sebagaimana mestinya dan dapat dipergunakan seperlunya.
    </p>
  )
}

function KontenTidakMampu({ p, desa, kecamatan, kabupaten }: { p: Penduduk; desa: string; kecamatan: string; kabupaten: string }) {
  return (
    <p className="text-justify leading-loose">
      Yang bertanda tangan di bawah ini Kepala Desa {desa}, Kecamatan {kecamatan}, Kabupaten {kabupaten}, dengan ini menerangkan bahwa:
      <br /><br />
      <PersonTable p={p} />
      <br />
      Adalah benar warga Desa {desa} yang berdomisili di RT {p.rt} / RW {p.rw} dan termasuk dalam kategori keluarga tidak mampu / kurang mampu di wilayah Desa {desa}.
      <br /><br />
      Surat keterangan ini dibuat berdasarkan kenyataan yang sebenarnya dan dapat dipergunakan sebagaimana mestinya.
    </p>
  )
}

function KontenUsaha({ p, desa, kecamatan, kabupaten }: { p: Penduduk; desa: string; kecamatan: string; kabupaten: string }) {
  return (
    <p className="text-justify leading-loose">
      Yang bertanda tangan di bawah ini Kepala Desa {desa}, Kecamatan {kecamatan}, Kabupaten {kabupaten}, dengan ini menerangkan bahwa:
      <br /><br />
      <PersonTable p={p} />
      <br />
      Adalah benar warga Desa {desa} yang berdomisili di RT {p.rt} / RW {p.rw} dan benar-benar menjalankan kegiatan usaha di wilayah Desa {desa}, Kecamatan {kecamatan}, Kabupaten {kabupaten}.
      <br /><br />
      Surat keterangan ini dibuat untuk keperluan yang bersangkutan dan dapat dipergunakan sebagaimana mestinya.
    </p>
  )
}

function KontenBelumMenikah({ p, desa, kecamatan, kabupaten }: { p: Penduduk; desa: string; kecamatan: string; kabupaten: string }) {
  return (
    <p className="text-justify leading-loose">
      Yang bertanda tangan di bawah ini Kepala Desa {desa}, Kecamatan {kecamatan}, Kabupaten {kabupaten}, dengan ini menerangkan bahwa:
      <br /><br />
      <PersonTable p={p} />
      <br />
      Adalah benar warga Desa {desa} dan berdasarkan catatan kependudukan yang ada pada kami, yang bersangkutan sampai dengan saat ini <strong>belum pernah melangsungkan pernikahan</strong> / berstatus belum menikah.
      <br /><br />
      Surat keterangan ini dibuat untuk keperluan yang bersangkutan dan dapat dipergunakan sebagaimana mestinya.
    </p>
  )
}

// ── Preview surat (untuk tampil di modal) ────────────────────────────────────

function PreviewSurat({ jenis, nomor, penduduk, wilayah }: {
  jenis: JenisSurat
  nomor: string
  penduduk: Penduduk
  wilayah: { desa: string; kecamatan: string; kabupaten: string; provinsi: string }
}) {
  const { desa, kecamatan, kabupaten, provinsi } = wilayah
  const judulSurat = JENIS_SURAT.find(s => s.value === jenis)?.label ?? ''
  const tanggal = getTanggalIndonesia()

  const kontenMap: Record<JenisSurat, React.JSX.Element> = {
    domisili: <KontenDomisili p={penduduk} desa={desa} kecamatan={kecamatan} kabupaten={kabupaten} />,
    tidak_mampu: <KontenTidakMampu p={penduduk} desa={desa} kecamatan={kecamatan} kabupaten={kabupaten} />,
    usaha: <KontenUsaha p={penduduk} desa={desa} kecamatan={kecamatan} kabupaten={kabupaten} />,
    belum_menikah: <KontenBelumMenikah p={penduduk} desa={desa} kecamatan={kecamatan} kabupaten={kabupaten} />,
  }

  return (
    <div
      id="print-area"
      className="bg-white text-black font-serif text-sm"
      style={{ padding: '2.5cm 2cm 2cm 2.5cm', minHeight: '100%', fontFamily: 'Times New Roman, serif' }}
    >
      {/* Kop surat */}
      <div className="text-center border-b-2 border-black pb-3 mb-5">
        <p className="font-bold text-base uppercase tracking-wide">PEMERINTAH KABUPATEN {kabupaten.toUpperCase()}</p>
        <p className="font-bold text-base uppercase tracking-wide">KECAMATAN {kecamatan.toUpperCase()}</p>
        <p className="font-bold text-xl uppercase tracking-widest mt-0.5">DESA {desa.toUpperCase()}</p>
        <p className="text-xs mt-1 text-gray-600">
          Jl. Raya Desa {desa}, Kecamatan {kecamatan}, Kabupaten {kabupaten}, {provinsi}
        </p>
      </div>

      {/* Judul */}
      <div className="text-center mb-5">
        <p className="font-bold text-base uppercase underline tracking-wide">{judulSurat}</p>
        <p className="text-sm mt-1">Nomor: {nomor || '...memuat...'}</p>
      </div>

      {/* Isi surat */}
      <div className="text-sm leading-relaxed">
        {kontenMap[jenis]}
      </div>

      {/* TTD */}
      <div className="mt-8 flex justify-end">
        <div className="text-center" style={{ minWidth: '220px' }}>
          <p>{desa}, {tanggal}</p>
          <p className="mt-1">Kepala Desa {desa}</p>
          <div style={{ height: '70px' }} />
          <p className="font-bold underline">___________________________</p>
        </div>
      </div>
    </div>
  )
}

// ── Modal utama ──────────────────────────────────────────────────────────────

export function SuratModal({ penduduk, onClose }: SuratModalProps) {
  const [jenis, setJenis] = useState<JenisSurat>('domisili')
  // nomor: null = belum di-generate, '' = sedang loading, string = sudah dapat
  const [nomor, setNomor] = useState<string | null>(null)
  const [loadingNomor, setLoadingNomor] = useState(false)
  const [errorNomor, setErrorNomor] = useState('')
  const { wilayah } = useAppStore()

  // Ganti jenis → reset nomor supaya tidak pakai nomor jenis sebelumnya
  function handleJenisChange(val: JenisSurat) {
    setJenis(val)
    setNomor(null)
    setErrorNomor('')
  }

  // Generate nomor baru dari Firestore (hanya saat user klik Cetak pertama kali)
  async function fetchNomor(jenisVal: JenisSurat): Promise<string> {
    setLoadingNomor(true)
    setErrorNomor('')
    try {
      const n = await getNextNomor(jenisVal)
      setNomor(n)
      return n
    } catch {
      setErrorNomor('Gagal mengambil nomor surat. Cek koneksi.')
      throw new Error('nomor gagal')
    } finally {
      setLoadingNomor(false)
    }
  }

  async function handleCetak() {
    let nomorCetak = nomor
    if (!nomorCetak) {
      try {
        nomorCetak = await fetchNomor(jenis)
      } catch {
        return
      }
    }

    const content = document.getElementById('print-area')
    if (!content) return
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${JENIS_SURAT.find(s => s.value === jenis)?.label}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; }
            table { width: 100%; border-collapse: collapse; }
            td { vertical-align: top; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.onload = () => {
      win.print()
      win.close()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <h2 className="font-semibold text-slate-100 text-base">Cetak Surat Keterangan</h2>
            <p className="text-xs text-slate-500 mt-0.5">{penduduk.nama_lengkap}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Pilih jenis surat */}
        <div className="px-5 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex flex-wrap gap-2">
            {JENIS_SURAT.map((s) => (
              <button
                key={s.value}
                onClick={() => handleJenisChange(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  jenis === s.value
                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.07]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {/* Info nomor surat */}
          <div className="mt-2 min-h-[20px]">
            {loadingNomor && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Mengambil nomor surat...
              </p>
            )}
            {nomor && !loadingNomor && (
              <p className="text-xs text-emerald-400">
                Nomor: <span className="font-mono">{nomor}</span>
              </p>
            )}
            {errorNomor && (
              <p className="text-xs text-red-400">{errorNomor}</p>
            )}
            {!nomor && !loadingNomor && !errorNomor && (
              <p className="text-xs text-slate-600">Nomor surat akan di-generate saat klik Cetak</p>
            )}
          </div>
        </div>

        {/* Preview surat */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-inner overflow-hidden">
            <PreviewSurat jenis={jenis} nomor={nomor ?? ''} penduduk={penduduk} wilayah={wilayah} />
          </div>
        </div>

        {/* Footer modal */}
        <div className="px-5 py-3 border-t border-white/[0.06] shrink-0 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
          <Button
            size="sm"
            onClick={handleCetak}
            disabled={loadingNomor}
            className="bg-sky-600 hover:bg-sky-700 gap-1.5"
          >
            {loadingNomor ? (
              <><Loader2 size={13} className="animate-spin" /> Memuat...</>
            ) : (
              <><Printer size={14} /> Cetak</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
