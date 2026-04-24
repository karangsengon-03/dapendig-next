'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, FileSpreadsheet, Loader2, CheckCircle2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEksporData, type EksporKoleksi } from '@/hooks/useEkspor'
import { exportToExcel, exportBulanan, type ExportColumn } from '@/lib/exportExcel'
import { usePendudukList } from '@/hooks/usePenduduk'
import { useMutasiKeluar, useMutasiMasuk } from '@/hooks/useMutasi'
import { useLahir, useMeninggal } from '@/hooks/useVital'

// ── Definisi kolom per koleksi ───────────────────────────────────────────────

const KOLOM_PENDUDUK: ExportColumn[] = [
  { key: 'nik', header: 'NIK' },
  { key: 'nama_lengkap', header: 'Nama Lengkap' },
  { key: 'no_kk', header: 'No. KK' },
  { key: 'jenis_kelamin', header: 'Jenis Kelamin' },
  { key: 'tempat_lahir', header: 'Tempat Lahir' },
  { key: 'tanggal_lahir', header: 'Tanggal Lahir' },
  { key: 'agama', header: 'Agama' },
  { key: 'pendidikan', header: 'Pendidikan' },
  { key: 'pekerjaan', header: 'Pekerjaan' },
  { key: 'status_perkawinan', header: 'Status Perkawinan' },
  { key: 'golongan_darah', header: 'Gol. Darah' },
  { key: 'hubungan_keluarga', header: 'Hub. Keluarga' },
  { key: 'nama_ayah', header: 'Nama Ayah' },
  { key: 'nama_ibu', header: 'Nama Ibu' },
  { key: 'rt', header: 'RT' },
  { key: 'rw', header: 'RW' },
  { key: 'alamat', header: 'Alamat' },
  { key: 'status', header: 'Status' },
]

const KOLOM_LAHIR: ExportColumn[] = [
  { key: 'nik', header: 'NIK' },
  { key: 'nama_lengkap', header: 'Nama Lengkap' },
  { key: 'no_kk', header: 'No. KK' },
  { key: 'jenis_kelamin', header: 'Jenis Kelamin' },
  { key: 'tempat_lahir', header: 'Tempat Lahir' },
  { key: 'tanggal_lahir', header: 'Tanggal Lahir' },
  { key: 'agama', header: 'Agama' },
  { key: 'hubungan_keluarga', header: 'Hub. Keluarga' },
  { key: 'nama_ayah', header: 'Nama Ayah' },
  { key: 'nama_ibu', header: 'Nama Ibu' },
  { key: 'rt', header: 'RT' },
  { key: 'rw', header: 'RW' },
  { key: 'status_perkawinan', header: 'Status Perkawinan' },
  { key: 'status', header: 'Status' },
]

const KOLOM_MENINGGAL: ExportColumn[] = [
  { key: 'nik_target', header: 'NIK' },
  { key: 'nama', header: 'Nama' },
  { key: 'no_kk', header: 'No. KK' },
  { key: 'hub_asli', header: 'Hubungan Keluarga' },
  { key: 'sebab', header: 'Sebab Kematian' },
  { key: 'tanggal', header: 'Tanggal Meninggal' },
]

const KOLOM_MUTASI_KELUAR: ExportColumn[] = [
  { key: 'nik_target', header: 'NIK' },
  { key: 'nama', header: 'Nama' },
  { key: 'no_kk', header: 'No. KK' },
  { key: 'alasan', header: 'Alasan Pindah' },
  { key: 'tujuan', header: 'Tujuan' },
  { key: 'tanggal', header: 'Tanggal' },
]

const KOLOM_MUTASI_MASUK: ExportColumn[] = [
  { key: 'nik', header: 'NIK' },
  { key: 'nama_lengkap', header: 'Nama Lengkap' },
  { key: 'no_kk', header: 'No. KK' },
  { key: 'jenis_kelamin', header: 'Jenis Kelamin' },
  { key: 'tempat_lahir', header: 'Tempat Lahir' },
  { key: 'tanggal_lahir', header: 'Tanggal Lahir' },
  { key: 'agama', header: 'Agama' },
  { key: 'pendidikan', header: 'Pendidikan' },
  { key: 'pekerjaan', header: 'Pekerjaan' },
  { key: 'status_perkawinan', header: 'Status Perkawinan' },
  { key: 'hubungan_keluarga', header: 'Hub. Keluarga' },
  { key: 'nama_ayah', header: 'Nama Ayah' },
  { key: 'nama_ibu', header: 'Nama Ibu' },
  { key: 'asal_daerah', header: 'Asal Daerah' },
  { key: 'rt', header: 'RT' },
  { key: 'rw', header: 'RW' },
  { key: 'status', header: 'Status' },
  { key: 'tanggal', header: 'Tanggal Masuk' },
]

// ── Konfigurasi item ekspor ───────────────────────────────────────────────────

interface EksporItem {
  koleksi: EksporKoleksi
  label: string
  deskripsi: string
  kolom: ExportColumn[]
  filename: string
  sheetName: string
}

const EKSPOR_LIST: EksporItem[] = [
  {
    koleksi: 'penduduk',
    label: 'Data Penduduk',
    deskripsi: 'Seluruh data penduduk aktif dan tidak aktif',
    kolom: KOLOM_PENDUDUK,
    filename: 'data-penduduk',
    sheetName: 'Penduduk',
  },
  {
    koleksi: 'lahir',
    label: 'Data Kelahiran',
    deskripsi: 'Catatan kelahiran yang telah direkam',
    kolom: KOLOM_LAHIR,
    filename: 'data-kelahiran',
    sheetName: 'Kelahiran',
  },
  {
    koleksi: 'meninggal',
    label: 'Data Kematian',
    deskripsi: 'Catatan kematian yang telah direkam',
    kolom: KOLOM_MENINGGAL,
    filename: 'data-kematian',
    sheetName: 'Kematian',
  },
  {
    koleksi: 'mutasi_keluar',
    label: 'Mutasi Pindah Keluar',
    deskripsi: 'Data penduduk yang pindah keluar desa',
    kolom: KOLOM_MUTASI_KELUAR,
    filename: 'mutasi-keluar',
    sheetName: 'Mutasi Keluar',
  },
  {
    koleksi: 'mutasi_masuk',
    label: 'Mutasi Pindah Masuk',
    deskripsi: 'Data penduduk yang pindah masuk ke desa',
    kolom: KOLOM_MUTASI_MASUK,
    filename: 'mutasi-masuk',
    sheetName: 'Mutasi Masuk',
  },
]

// ── Tombol ekspor satu koleksi ────────────────────────────────────────────────

function EksporButton({ item }: { item: EksporItem }) {
  const [triggered, setTriggered] = useState(false)
  const [done, setDone] = useState(false)
  const itemRef = useRef(item)
  itemRef.current = item

  const { data, isFetching, isError } = useEksporData(item.koleksi, triggered)

  // Ketika data tersedia setelah trigger, lakukan ekspor
  useEffect(() => {
    if (triggered && data && !isFetching) {
      const { kolom, filename, sheetName } = itemRef.current
      const today = new Date().toISOString().slice(0, 10)
      exportToExcel(data, kolom, `${filename}-${today}`, sheetName)
      setTriggered(false)
      setDone(true)
      const t = setTimeout(() => setDone(false), 3000)
      return () => clearTimeout(t)
    }
  }, [triggered, data, isFetching])

  const handleClick = () => {
    setDone(false)
    if (data && !isFetching) {
      // Data sudah di-cache — ekspor langsung tanpa fetch ulang
      const today = new Date().toISOString().slice(0, 10)
      exportToExcel(data, item.kolom, `${item.filename}-${today}`, item.sheetName)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } else {
      setTriggered(true)
    }
  }

  const loading = isFetching && triggered

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{item.label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{item.deskripsi}</p>
        {isError && (
          <p className="text-xs text-red-400 mt-0.5">Gagal mengambil data. Coba lagi.</p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={loading}
        className="ml-4 shrink-0 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Memuat...
          </>
        ) : done ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-400" />
            Terunduh
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Ekspor
          </>
        )}
      </Button>
    </div>
  )
}

// ── Laporan Bulanan ───────────────────────────────────────────────────────────

function LaporanBulananSection() {
  const now = new Date()
  const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(String(now.getFullYear()))

  const { data: allPenduduk = [] } = usePendudukList()
  const { data: mk = [] } = useMutasiKeluar()
  const { data: mm = [] } = useMutasiMasuk()
  const { data: lh = [] } = useLahir()
  const { data: mn = [] } = useMeninggal()

  const totalAktif = allPenduduk.filter((p) => p.status === 'aktif').length

  const currentYear = now.getFullYear()
  const tahunOptions = [currentYear - 2, currentYear - 1, currentYear].map(String)

  const BULAN_OPTS = [
    ['01','Januari'],['02','Februari'],['03','Maret'],['04','April'],
    ['05','Mei'],['06','Juni'],['07','Juli'],['08','Agustus'],
    ['09','September'],['10','Oktober'],['11','November'],['12','Desember'],
  ]

  function handleEkspor() {
    exportBulanan({ mk, mm, lh, mn, totalAktif }, bulan, tahun)
  }

  return (
    <div className="mt-5 pt-4 border-t border-white/[0.06]">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-sky-400" />
        <p className="text-sm font-semibold text-slate-200">Laporan Bulanan</p>
      </div>
      <p className="text-xs text-slate-500 mb-3">Ekspor laporan multi-sheet: rekap, mutasi, kelahiran, dan kematian untuk bulan tertentu.</p>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50"
        >
          {BULAN_OPTS.map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          value={tahun}
          onChange={(e) => setTahun(e.target.value)}
          className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50"
        >
          {tahunOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={handleEkspor} className="border-sky-600/40 text-sky-400 hover:bg-sky-500/10">
          <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
          Ekspor Laporan
        </Button>
      </div>
    </div>
  )
}

// ── Komponen utama ────────────────────────────────────────────────────────────

export function EksporSection() {
  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
        <h2 className="font-semibold text-slate-100">Ekspor Data</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Unduh data ke format Excel (.xlsx). Data diambil langsung dari Firestore saat tombol ditekan.
      </p>
      <div>
        {EKSPOR_LIST.map((item) => (
          <EksporButton key={item.koleksi} item={item} />
        ))}
      </div>
      <LaporanBulananSection />
    </div>
  )
}
