'use client'

import { useState } from 'react'
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'

export default function MigrateAlamatPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [updated, setUpdated] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)

  async function handleMigrate() {
    if (!isAdmin()) return
    setStatus('loading')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      const toUpdate = snap.docs.filter(d => !d.data().alamat?.trim())
      setProgressTotal(snap.docs.length)
      setProgressCurrent(0)

      let updatedCount = 0
      let batchSize = 0
      let batch = writeBatch(db)
      let processed = 0

      for (const d of toUpdate) {
        batch.update(doc(db, 'penduduk', d.id), { alamat: 'KARANG SENGON' })
        batchSize++
        updatedCount++
        processed++
        setProgressCurrent(processed)
        if (batchSize === 499) {
          await batch.commit()
          batch = writeBatch(db)
          batchSize = 0
        }
      }
      if (batchSize > 0) await batch.commit()

      setUpdated(updatedCount)
      setSkipped(snap.docs.length - updatedCount)
      setStatus('done')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  return (
    <AppShell title="Migrasi Alamat">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-base font-semibold text-slate-100">Migrasi Alamat Penduduk</h1>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-300">Isi alamat semua penduduk</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Proses ini akan mengisi field alamat dengan nilai{' '}
              <span className="font-semibold text-slate-300">KARANG SENGON</span> untuk semua
              penduduk yang belum memiliki alamat. Penduduk yang sudah punya alamat tidak akan diubah.
            </p>
          </div>

          {status === 'idle' && (
            <button
              onClick={handleMigrate}
              disabled={!isAdmin()}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white transition-colors disabled:opacity-40"
            >
              Mulai Proses Migrasi
            </button>
          )}

          {status === 'loading' && (
            <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diproses" />
          )}

          {status === 'done' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                <p className="text-sm font-medium text-emerald-400">Migrasi selesai!</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex flex-col gap-1">
                <p className="text-sm text-slate-300">
                  <span className="font-bold text-emerald-400">{updated}</span> penduduk berhasil diperbarui
                </p>
                <p className="text-sm text-slate-500">
                  <span className="font-medium">{skipped}</span> penduduk sudah punya alamat (tidak diubah)
                </p>
              </div>
              <button
                onClick={() => router.push('/penduduk')}
                className="w-full py-2.5 rounded-xl bg-slate-700/60 border border-white/[0.08] text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Lihat Data Penduduk
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <p className="text-sm font-medium text-rose-400">Gagal melakukan migrasi</p>
              </div>
              <p className="text-xs text-slate-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                {errorMsg}
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="text-sm text-sky-400 hover:text-sky-300"
              >
                Coba lagi
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 text-center">
          Hanya dapat diakses oleh admin. Proses berjalan langsung ke Firestore.
        </p>
      </div>
    </AppShell>
  )
}
