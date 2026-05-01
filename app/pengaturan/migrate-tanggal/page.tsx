'use client'

import { useState } from 'react'
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { normalisasiTanggal } from '@/lib/dateUtils'

const KOLEKSI_TANGGAL: { koleksi: string; fields: string[] }[] = [
  { koleksi: 'penduduk',      fields: ['tanggal_lahir'] },
  { koleksi: 'lahir',         fields: ['tanggal_lahir'] },
  { koleksi: 'meninggal',     fields: ['tanggal'] },
  { koleksi: 'mutasi_keluar', fields: ['tanggal'] },
  { koleksi: 'mutasi_masuk',  fields: ['tanggal', 'tanggal_lahir'] },
]

export default function MigrateTanggalPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ updated: number; skipped: number; detail: Record<string, number> } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)

  async function handleMigrate() {
    if (!isAdmin()) return
    setStatus('loading')
    try {
      let totalUpdated = 0
      let totalSkipped = 0
      const detail: Record<string, number> = {}

      for (const { koleksi, fields } of KOLEKSI_TANGGAL) {
        const snap = await getDocs(collection(db, koleksi))
        if (koleksi === 'penduduk') { setProgressTotal(snap.docs.length); setProgressCurrent(0) }
        let batch = writeBatch(db)
        let batchSize = 0

        for (let _i = 0; _i < snap.docs.length; _i++) {
          const d = snap.docs[_i]
          if (koleksi === 'penduduk') setProgressCurrent(_i + 1)
          const data = d.data()
          const updates: Record<string, string> = {}

          for (const field of fields) {
            const val = String(data[field] ?? '').trim()
            if (!val) continue
            if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
              const normalized = normalisasiTanggal(val)
              if (normalized !== val) {
                updates[field] = normalized
                const key = `${koleksi}.${field}`
                detail[key] = (detail[key] ?? 0) + 1
                totalUpdated++
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            batch.update(doc(db, koleksi, d.id), updates)
            batchSize++
            if (batchSize >= 499) {
              await batch.commit()
              batch = writeBatch(db)
              batchSize = 0
            }
          } else {
            totalSkipped++
          }
        }

        if (batchSize > 0) await batch.commit()
      }

      setResult({ updated: totalUpdated, skipped: totalSkipped, detail })
      setStatus('done')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  return (
    <AppShell title="Migrasi Format Tanggal">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0">
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-base font-semibold text-slate-100">Migrasi Format Tanggal</h1>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-slate-300">Konversi DD/MM/YYYY → YYYY-MM-DD</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Memperbaiki semua field tanggal di Firestore yang tersimpan dalam format
              <span className="font-mono text-rose-400"> DD/MM/YYYY</span> menjadi
              <span className="font-mono text-emerald-400"> YYYY-MM-DD</span>.
              Ini memperbaiki bug NaN pada perhitungan umur, piramida umur, dan klasifikasi umur.
            </p>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-xs text-slate-500 flex flex-col gap-1">
              <p className="font-semibold text-slate-400 mb-0.5">Koleksi yang diproses:</p>
              {KOLEKSI_TANGGAL.map(({ koleksi, fields }) => (
                <p key={koleksi}>· <span className="text-slate-300 font-mono">{koleksi}</span> — {fields.join(', ')}</p>
              ))}
            </div>
          </div>

          {status === 'idle' && (
            <button onClick={handleMigrate} disabled={!isAdmin()}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white transition-colors disabled:opacity-40">
              Mulai Migrasi Tanggal
            </button>
          )}

          {status === 'loading' && (
            <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diperiksa" />
          )}

          {status === 'done' && result && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                <p className="text-sm font-medium text-emerald-400">Migrasi selesai!</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex flex-col gap-1.5">
                <p className="text-sm text-slate-300">
                  <span className="font-bold text-emerald-400">{result.updated}</span> field tanggal diperbarui
                </p>
                <p className="text-sm text-slate-500">
                  <span className="font-medium">{result.skipped}</span> dokumen sudah format benar
                </p>
              </div>
              {Object.keys(result.detail).length > 0 && (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex flex-col gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Rincian per koleksi</p>
                  {Object.entries(result.detail).map(([key, count]) => (
                    <p key={key} className="text-xs text-slate-400">
                      · <span className="font-mono text-slate-300">{key}</span>: {count} dokumen
                    </p>
                  ))}
                </div>
              )}
              <button onClick={() => router.push('/dashboard')}
                className="w-full py-2.5 rounded-xl bg-slate-700/60 border border-white/[0.08] text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                Kembali ke Beranda
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <p className="text-sm font-medium text-rose-400">Gagal migrasi</p>
              </div>
              <p className="text-xs text-slate-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{errorMsg}</p>
              <button onClick={() => setStatus('idle')} className="text-sm text-sky-400 hover:text-sky-300">Coba lagi</button>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-600 text-center">Hanya dapat diakses oleh admin.</p>
      </div>
    </AppShell>
  )
}
