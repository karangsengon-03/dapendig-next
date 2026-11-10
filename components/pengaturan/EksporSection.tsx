'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Download,
  Loader2,
  CircleCheck,
  BarChart3,
  Users,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { PERISTIWA } from '@/lib/visual'
import { Button } from '@/components/ui/button'
import { hariIni } from '@/lib/tanggal-lokal'
import { InBox } from '@/components/ui/field'
import { useEksporData, type EksporKoleksi } from '@/hooks/useEkspor'
import { exportToExcel, exportBulanan, type ExportColumn } from '@/lib/exportExcel'
import { usePendudukList } from '@/hooks/usePenduduk'
import { useMutasiKeluar, useMutasiMasuk } from '@/hooks/useMutasi'
import { useLahir, useMeninggal } from '@/hooks/useVital'

// ── Definisi kolom per koleksi ───────────────────────────────────────────────

const KOLOM_PENDUDUK: ExportColumn[] = [
  { key: 'id', header: 'ID' },
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
    label: 'Data penduduk',
    deskripsi: 'Seluruh data penduduk aktif dan tidak aktif',
    kolom: KOLOM_PENDUDUK,
    filename: 'data-penduduk',
    sheetName: 'Penduduk',
  },
  {
    koleksi: 'lahir',
    label: 'Data kelahiran',
    deskripsi: 'Catatan kelahiran yang telah direkam',
    kolom: KOLOM_LAHIR,
    filename: 'data-kelahiran',
    sheetName: 'Kelahiran',
  },
  {
    koleksi: 'meninggal',
    label: 'Data kematian',
    deskripsi: 'Catatan kematian yang telah direkam',
    kolom: KOLOM_MENINGGAL,
    filename: 'data-kematian',
    sheetName: 'Kematian',
  },
  {
    koleksi: 'mutasi_keluar',
    label: 'Mutasi pindah keluar',
    deskripsi: 'Data penduduk yang pindah keluar desa',
    kolom: KOLOM_MUTASI_KELUAR,
    filename: 'mutasi-keluar',
    sheetName: 'Mutasi Keluar',
  },
  {
    koleksi: 'mutasi_masuk',
    label: 'Mutasi pindah masuk',
    deskripsi: 'Data penduduk yang pindah masuk ke desa',
    kolom: KOLOM_MUTASI_MASUK,
    filename: 'mutasi-masuk',
    sheetName: 'Mutasi Masuk',
  },
]

// ── Ikon per koleksi (tampilan saja) ─────────────────────────────────────────

const IKON: Record<EksporKoleksi, LucideIcon> = {
  penduduk: Users,
  lahir: PERISTIWA.kelahiran.Icon,
  meninggal: PERISTIWA.kematian.Icon,
  mutasi_keluar: PERISTIWA.pindah_keluar.Icon,
  mutasi_masuk: PERISTIWA.pindah_masuk.Icon,
}

// ── Tombol ekspor satu koleksi ────────────────────────────────────────────────

function EksporButton({ item }: { item: EksporItem }) {
  const [triggered, setTriggered] = useState(false)
  const [done, setDone] = useState(false)
  const itemRef = useRef(item)
  useEffect(() => {
    itemRef.current = item
  })

  const { data, isFetching, isError } = useEksporData(item.koleksi, triggered)

  // Ketika data tersedia setelah trigger, lakukan ekspor
  useEffect(() => {
    if (triggered && data && !isFetching) {
      const { kolom, filename, sheetName } = itemRef.current
      const today = hariIni()
      exportToExcel(data, kolom, `${filename}-${today}`, sheetName).catch((err) => {
        console.error('Ekspor Excel gagal:', err)
      })
      // setState via setTimeout agar tidak setState synchronously dalam effect
      const t1 = setTimeout(() => { setTriggered(false); setDone(true) }, 0)
      const t2 = setTimeout(() => setDone(false), 3000)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [triggered, data, isFetching])

  const handleClick = () => {
    setDone(false)
    if (data && !isFetching) {
      // Data sudah di-cache — ekspor langsung tanpa fetch ulang
      const today = hariIni()
      exportToExcel(data, item.kolom, `${item.filename}-${today}`, item.sheetName).catch((err) => {
        console.error('Ekspor Excel gagal:', err)
      })
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } else {
      setTriggered(true)
    }
  }

  const loading = isFetching && triggered
  const Ikon = IKON[item.koleksi]

  return (
    <div className="a-mig">
      <div
        className="a-avatar"
        style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--navy-100)', color: 'var(--navy-700)' }}
      >
        <Ikon className="i" style={{ fontSize: 19 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{item.label}</b>
        <span className="mt">{item.deskripsi}</span>
        {isError && (
          <span className="mt" style={{ color: 'var(--bad)' }}>Gagal mengambil data. Coba lagi.</span>
        )}
      </div>
      <Button size="sm" variant="secondary" onClick={handleClick} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="i animate-spin" />
            Memuat...
          </>
        ) : done ? (
          <>
            <CircleCheck className="i" style={{ color: 'var(--ok)' }} />
            Terunduh
          </>
        ) : (
          <>
            <Download className="i" />
            Ekspor Excel
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
    exportBulanan({ mk, mm, lh, mn, totalAktif }, bulan, tahun).catch((err) => {
      console.error('Ekspor laporan bulanan gagal:', err)
    })
  }

  return (
    <div className="a-fs">
      <div className="fh">
        <h4>Laporan bulanan</h4>
        <p>Ekspor laporan multi-sheet: rekap, mutasi, kelahiran, dan kematian untuk bulan tertentu.</p>
      </div>
      <div className="act-c">
        <InBox className="lap-sel">
          <select aria-label="Bulan laporan" value={bulan} onChange={(e) => setBulan(e.target.value)}>
            {BULAN_OPTS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <ChevronDown className="i chev" />
        </InBox>
        <InBox className="lap-sel lap-th">
          <select aria-label="Tahun laporan" value={tahun} onChange={(e) => setTahun(e.target.value)}>
            {tahunOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown className="i chev" />
        </InBox>
        <Button variant="secondary" onClick={handleEkspor}>
          <BarChart3 className="i" />
          Ekspor Laporan
        </Button>
      </div>
    </div>
  )
}

// ── Komponen utama (isi seksi "Ekspor data" di Pengaturan) ───────────────────

export function EksporSection() {
  return (
    <>
      <div className="a-fs">
        <div className="fh">
          <h4>Ekspor data</h4>
          <p>Unduh data dalam format Excel (.xlsx)</p>
        </div>
        {EKSPOR_LIST.map((item) => (
          <EksporButton key={item.koleksi} item={item} />
        ))}
      </div>
      <LaporanBulananSection />
    </>
  )
}
