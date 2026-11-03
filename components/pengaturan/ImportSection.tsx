'use client'

import { useState, useRef } from 'react'
import ExcelJS from 'exceljs'
import { Upload, Download, CircleCheck, ArrowLeft, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useImportPenduduk } from '@/hooks/useImport'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { useToast } from '@/components/ui/toast'
import { KDPD, TEMPLATE_HEADERS, petakanKolomExcel } from '@/lib/impor-peta'

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
  const { toast } = useToast()

  async function downloadTemplate() {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Template')
    ws.addRow([...TEMPLATE_HEADERS])
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-import-penduduk.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function parseFile(file: File) {
    const buffer = await file.arrayBuffer()
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    const ws = wb.worksheets[0]
    if (!ws) return

    // Baris 1 = header (setara wb.SheetNames[0] + baris pertama sheet_to_json)
    const headerRow = ws.getRow(1)
    const cols: string[] = []
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      cols.push(String(cell.value ?? '').trim())
    })
    if (!cols.length) return

    const rows: Record<string, unknown>[] = []
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      if (row.cellCount === 0) continue // skip baris kosong
      const obj: Record<string, unknown> = {}
      cols.forEach((colName, idx) => {
        const cell = row.getCell(idx + 1)
        let val: unknown = cell.value
        if (val instanceof Date) {
          // PENTING: exceljs mengembalikan tanggal Excel sebagai Date UTC.
          // Selalu pakai getUTC* (bukan getFullYear/getDate lokal) supaya
          // hasilnya konsisten YYYY-MM-DD tanpa tergeser timezone browser
          // operator — mereplikasi persis maksud cellDates+dateNF di SheetJS
          // sebelumnya.
          const y = val.getUTCFullYear()
          const m = String(val.getUTCMonth() + 1).padStart(2, '0')
          const d = String(val.getUTCDate()).padStart(2, '0')
          val = `${y}-${m}-${d}`
        } else if (val === null || val === undefined) {
          val = '' // setara defval: ''
        } else if (typeof val === 'object' && 'result' in (val as object)) {
          // Sel formula — ambil hasil kalkulasinya, bukan object formula
          val = (val as { result: unknown }).result ?? ''
        } else {
          val = String(val) // setara raw: false (nilai terformat sebagai string)
        }
        obj[colName] = val
      })
      rows.push(obj)
    }

    if (!rows.length) return
    const initMap: Record<string, string> = {}
    cols.forEach((c) => { initMap[c] = petakanKolomExcel(c) })
    setRawRows(rows)
    setExcelCols(cols)
    setMapping(initMap)
    setStep('mapping')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file).catch(() => {
      toast('Gagal membaca file Excel. Pastikan file tidak rusak dan berformat .xlsx.', 'error')
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file).catch(() => {
      toast('Gagal membaca file Excel. Pastikan file tidak rusak dan berformat .xlsx.', 'error')
    })
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
    try {
      const res = await importMutation.mutateAsync({
        rows: mapped,
        onProgress: (current, total) => {
          setProgressCurrent(current)
          setProgressTotal(total)
        },
      })
      setResult(res)
      setStep('done')
    } catch {
      // Kembali ke langkah Periksa (pemetaan kolom tetap) alih-alih macet di layar progres
      toast('Gagal mengimpor data', 'error')
      setStep('mapping')
    }
  }

  function reset() {
    setStep('upload')
    setRawRows([])
    setExcelCols([])
    setMapping({})
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const langkah: { n: number; label: string; kunci: Step[] }[] = [
    { n: 1, label: 'Pilih berkas', kunci: ['upload'] },
    { n: 2, label: 'Periksa', kunci: ['mapping'] },
    { n: 3, label: 'Impor', kunci: ['importing', 'done'] },
  ]
  const urut: Step[] = ['upload', 'mapping', 'importing', 'done']
  const posisi = urut.indexOf(step)

  return (
    <div className="a-fs">
      <div className="fh">
        <h4>Impor data</h4>
        <p>Unggah berkas Excel untuk menambah atau memperbarui penduduk</p>
      </div>

      <div className="a-step" style={{ marginBottom: 18 }}>
        {langkah.map((l, i) => {
          const aktif = l.kunci.includes(step) && step !== 'done'
          const selesai = step === 'done' || posisi > urut.indexOf(l.kunci[l.kunci.length - 1])
          return (
            <div key={l.n} style={{ display: 'contents' }}>
              {i > 0 && <div className={`ln${posisi >= urut.indexOf(l.kunci[0]) ? ' dn' : ''}`} />}
              <div className={`s${aktif ? ' on' : ''}${selesai ? ' dn' : ''}`}>
                <span className="c">{selesai ? <Check className="i" style={{ fontSize: 13 }} /> : l.n}</span>
                {l.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step 1 — Upload */}
      {step === 'upload' && (
        <div className="flex flex-col gap-3">
          <div
            role="button"
            tabIndex={0}
            className={`a-drop${dragging ? ' over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileRef.current?.click()
              }
            }}
          >
            <div className="di"><Upload className="i" style={{ fontSize: 24 }} /></div>
            <b>Tarik berkas .xlsx ke sini</b>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>atau klik untuk memilih dari perangkat</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>Format: .xlsx, .xls, .csv</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Pilih berkas Excel"
          />
          <Button variant="ghost" size="sm" onClick={downloadTemplate} style={{ alignSelf: 'flex-start' }}>
            <Download className="i" />
            Download Template Excel
          </Button>
        </div>
      )}

      {/* Step 2 — Mapping */}
      {step === 'mapping' && (
        <div className="flex flex-col gap-4">
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>
            Terdeteksi <b style={{ color: 'var(--ink)' }}>{rawRows.length} baris data</b>. Petakan kolom Excel ke field DAPENDIG:
          </p>
          <div className="a-tw imp-tw">
            <table className="a-t">
              <thead>
                <tr>
                  <th>Kolom di Excel</th>
                  <th>→ Field DAPENDIG</th>
                  <th>Contoh Nilai</th>
                </tr>
              </thead>
              <tbody>
                {excelCols.map((col) => (
                  <tr key={col}>
                    <td className="mn">{col}</td>
                    <td>
                      <select
                        className="mapsel"
                        aria-label={`Field untuk kolom ${col}`}
                        value={mapping[col] ?? ''}
                        onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })}
                      >
                        <option value="">— skip —</option>
                        {KDPD.map(({ k, l }) => (
                          <option key={k} value={k}>{l}</option>
                        ))}
                      </select>
                    </td>
                    <td className="mn" style={{ color: 'var(--ink-3)' }}>
                      {String(rawRows[0]?.[col] ?? '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="set-ft">
            <Button variant="outline" onClick={reset}>
              <ArrowLeft className="i" />
              Kembali
            </Button>
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? 'Mengimport...' : (<><CircleCheck className="i" />Import {rawRows.length} Data</>)}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Proses */}
      {step === 'importing' && (
        <div className="flex flex-col gap-4 py-2">
          <p style={{ margin: 0, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Mengimport data...</p>
          <MigrasiProgress current={progressCurrent} total={progressTotal} label="data diproses" />
          <p style={{ margin: 0, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>Jangan tutup halaman ini</p>
        </div>
      )}

      {step === 'done' && result && (
        <div className="imp-hasil">
          <div className="ok-ic"><CircleCheck className="i" /></div>
          <p style={{ fontFamily: 'var(--f-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Import Selesai!</p>
          <p className="cnt-l">
            {result.diperbarui > 0 && (
              <><b className="i2">{result.diperbarui}</b> data diperbarui<br /></>
            )}
            {result.berhasil > 0 && (
              <><b className="o">{result.berhasil}</b> data baru ditambahkan<br /></>
            )}
            {result.gagal > 0 && (
              <><b className="b">{result.gagal}</b> gagal</>
            )}
          </p>
          <small>
            Data yang sudah ada diperbarui berdasarkan kolom ID. Data baru ditambahkan jika NIK belum terdaftar.
          </small>
          <div className="set-ft" style={{ justifyContent: 'center' }}>
            <Button variant="outline" onClick={reset}>Import Lagi</Button>
            <Button onClick={() => router.push('/penduduk')}>
              Lihat Data Penduduk →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
