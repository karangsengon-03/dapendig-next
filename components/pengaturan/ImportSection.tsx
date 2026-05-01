'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Download, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useImportPenduduk } from '@/hooks/useImport'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'

const KDPD = [
  { k: 'id', l: 'ID Dokumen' },
  { k: 'no_kk', l: 'No. KK' },
  { k: 'nik', l: 'NIK' },
  { k: 'nama_lengkap', l: 'Nama Lengkap' },
  { k: 'jenis_kelamin', l: 'Jenis Kelamin' },
  { k: 'hubungan_keluarga', l: 'Hubungan Keluarga' },
  { k: 'status_perkawinan', l: 'Status Perkawinan' },
  { k: 'pendidikan', l: 'Pendidikan' },
  { k: 'pekerjaan', l: 'Pekerjaan' },
  { k: 'golongan_darah', l: 'Golongan Darah' },
  { k: 'agama', l: 'Agama' },
  { k: 'tempat_lahir', l: 'Tempat Lahir' },
  { k: 'tanggal_lahir', l: 'Tanggal Lahir' },
  { k: 'nama_ibu', l: 'Nama Ibu' },
  { k: 'nama_ayah', l: 'Nama Ayah' },
  { k: 'rt', l: 'RT' },
  { k: 'rw', l: 'RW' },
  { k: 'alamat', l: 'Alamat' },
  { k: 'status', l: 'Status' },
]

const TEMPLATE_HEADERS = ['No.KK', 'NIK', 'Nama', 'JK', 'Hub.KK', 'Kawin', 'Pendidikan', 'Pekerjaan', 'Gol.Darah', 'Agama', 'Tmp.Lahir', 'Tgl.Lahir', 'Nama Ibu', 'Nama Ayah', 'RT', 'RW', 'Status']

function normalize(s: string) {
  return s.toLowerCase().replace(/[\s._-]/g, '')
}

function autoMap(excelCol: string): string {
  const n = normalize(excelCol)
  for (const { k, l } of KDPD) {
    if (normalize(k) === n || normalize(l) === n) return k
  }
  // Partial match heuristics
  if (n === 'id' || n === 'iddokumen' || n === 'docid') return 'id'
  if (n.includes('kk')) return 'no_kk'
  if (n.includes('nik')) return 'nik'
  if (n.includes('nama') && n.includes('ibu')) return 'nama_ibu'
  if (n.includes('nama') && n.includes('ayah')) return 'nama_ayah'
  if (n.includes('nama')) return 'nama_lengkap'
  if (n.includes('jk') || n.includes('kelamin') || n.includes('gender')) return 'jenis_kelamin'
  if (n.includes('hub')) return 'hubungan_keluarga'
  if (n.includes('kawin') || n.includes('nikah') || n.includes('perkawinan')) return 'status_perkawinan'
  if (n.includes('didik') || n.includes('pendidikan')) return 'pendidikan'
  if (n.includes('kerja') || n.includes('pekerjaan')) return 'pekerjaan'
  if (n.includes('darah') || n.includes('gol')) return 'golongan_darah'
  if (n.includes('agama')) return 'agama'
  if (n.includes('tmp') || (n.includes('tempat') && n.includes('lahir'))) return 'tempat_lahir'
  if (n.includes('tgl') || n.includes('tanggal') || n.includes('lahir')) return 'tanggal_lahir'
  if (n.includes('alamat')) return 'alamat'
  if (n === 'rt') return 'rt'
  if (n === 'rw') return 'rw'
  if (n.includes('status')) return 'status'
  return ''
}

type Step = 'upload' | 'mapping' | 'importing' | 'done'

export function ImportSection() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([])
  const [excelCols, setExcelCols] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ berhasil: number; diperbarui: number; gagal: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const importMutation = useImportPenduduk()

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS])
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'template-import-penduduk.xlsx')
  }

  function parseFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      if (!rows.length) return
      const cols = Object.keys(rows[0])
      const initMap: Record<string, string> = {}
      cols.forEach((c) => { initMap[c] = autoMap(c) })
      setRawRows(rows)
      setExcelCols(cols)
      setMapping(initMap)
      setStep('mapping')
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  async function handleImport() {
    const mapped = rawRows.map((row) => {
      const out: Record<string, unknown> = {}
      for (const [excelCol, fieldKey] of Object.entries(mapping)) {
        if (fieldKey) out[fieldKey] = row[excelCol]
      }
      return out
    })
    setProgressCurrent(0)
    setProgressTotal(mapped.length)
    setStep('importing' as Step)
    const res = await importMutation.mutateAsync({
      rows: mapped,
      onProgress: (current, total) => {
        setProgressCurrent(current)
        setProgressTotal(total)
      },
    })
    setResult(res)
    setStep('done')
  }

  function reset() {
    setStep('upload')
    setRawRows([])
    setExcelCols([])
    setMapping({})
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Upload className="w-5 h-5 text-violet-400" />
        <h2 className="font-semibold text-slate-100">Import Data Excel</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Import data penduduk dari file Excel (.xlsx, .xls) atau CSV dengan pemetaan kolom otomatis.
      </p>

      {/* Step 1 — Upload */}
      {step === 'upload' && (
        <div className="flex flex-col gap-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${dragging ? 'border-violet-500/60 bg-violet-500/5' : 'border-white/[0.15] hover:border-sky-500/40 hover:bg-sky-500/5'}`}
          >
            <FileSpreadsheet className="w-10 h-10 text-slate-500" />
            <div className="text-center">
              <p className="text-sm text-slate-300 font-medium">Klik atau drag file ke sini</p>
              <p className="text-xs text-slate-500 mt-1">Format: .xlsx, .xls, .csv</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 transition-colors self-start"
          >
            <Download className="w-3.5 h-3.5" />
            Download Template Excel
          </button>
        </div>
      )}

      {/* Step 2 — Mapping */}
      {step === 'mapping' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-400">
            Terdeteksi <span className="font-semibold text-slate-200">{rawRows.length} baris data</span>. Petakan kolom Excel ke field DAPENDIG:
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Kolom di Excel</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">→ Field DAPENDIG</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Contoh Nilai</th>
                </tr>
              </thead>
              <tbody>
                {excelCols.map((col) => (
                  <tr key={col} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2 text-slate-300 font-mono">{col}</td>
                    <td className="px-3 py-2">
                      <select
                        value={mapping[col] ?? ''}
                        onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })}
                        className="bg-[#0d1424] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50 w-full"
                      >
                        <option value="">— skip —</option>
                        {KDPD.map(({ k, l }) => (
                          <option key={k} value={k}>{l}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-slate-500 font-mono truncate max-w-[120px]">
                      {String(rawRows[0]?.[col] ?? '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={reset}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Kembali
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {importMutation.isPending ? 'Mengimport...' : (<><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Import {rawRows.length} Data</>)}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 'importing' && (
        <div className="flex flex-col gap-4 py-4">
          <p className="text-sm font-medium text-slate-300 text-center">Mengimport data...</p>
          <MigrasiProgress current={progressCurrent} total={progressTotal} label="data diproses" />
          <p className="text-xs text-slate-600 text-center">Jangan tutup halaman ini</p>
        </div>
      )}

      {step === 'done' && result && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-100">Import Selesai!</p>
            <p className="text-sm text-slate-400 mt-1">
              {result.diperbarui > 0 && (
                <><span className="text-sky-400 font-semibold">{result.diperbarui}</span> data diperbarui<br /></>
              )}
              {result.berhasil > 0 && (
                <><span className="text-emerald-400 font-semibold">{result.berhasil}</span> data baru ditambahkan<br /></>
              )}
              {result.gagal > 0 && (
                <><span className="text-rose-400 font-semibold">{result.gagal}</span> gagal</>
              )}
            </p>
          </div>
          <p className="text-xs text-slate-600 text-center max-w-xs">
            Data yang sudah ada diperbarui berdasarkan kolom ID. Data baru ditambahkan jika NIK belum terdaftar.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={reset}>Import Lagi</Button>
            <Button size="sm" onClick={() => router.push('/penduduk')}>
              Lihat Data Penduduk →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
