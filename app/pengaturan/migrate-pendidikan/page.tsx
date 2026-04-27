'use client'

import { useState } from 'react'
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'

// Pemetaan nilai lama → nilai baru
const MIGRATION_MAP: Record<string, string> = {
  'SLTP/Sederajat': 'SMP/Sederajat',
  'SLTA/Sederajat': 'SMA/Sederajat',
}

export default function MigratePendidikanPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [updated, setUpdated] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [detail, setDetail] = useState<Record<string, number>>({})
  const [errorMsg, setErrorMsg] = useState('')

  async function handleMigrate() {
    if (!isAdmin()) return
    setStatus('loading')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      const toUpdate = snap.docs.filter(d => {
        const pddk = d.data().pendidikan as string | undefined
        return pddk && MIGRATION_MAP[pddk]
      })

      const counted: Record<string, number> = {}
      let updatedCount = 0
      let batchSize = 0
      let batch = writeBatch(db)

      for (const d of toUpdate) {
        const oldVal = d.data().pendidikan as string
        const newVal = MIGRATION_MAP[oldVal]
        batch.update(doc(db, 'penduduk', d.id), { pendidikan: newVal })
        counted[`${oldVal} → ${newVal}`] = (counted[`${oldVal} → ${newVal}`] ?? 0) + 1
        batchSize++
        updatedCount++
        if (batchSize === 499) {
          await batch.commit()
          batch = writeBatch(db)
          batchSize = 0
        }
      }
      if (batchSize > 0) await batch.commit()

      setUpdated(updatedCount)
      setSkipped(snap.docs.length - updatedCount)
      setDetail(counted)
      setStatus('done')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  return (
    <AppShell title="Migrasi Pendidikan">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-base font-semibold text-slate-100">Migrasi Pendidikan</h1>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-300">Perbarui nama tingkat pendidikan</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Proses ini mengganti nilai lama ke nilai baru yang konsisten untuk semua data penduduk:
            </p>
            <div className="mt-2 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex flex-col gap-2">
              {Object.entries(MIGRATION_MAP).map(([old, nw]) => (
                <div key={old} className="flex items-center gap-2 text-xs">
                  <span className="text-rose-400 font-mono">{old}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-emerald-400 font-mono">{nw}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Penduduk dengan nilai pendidikan lain tidak akan diubah.
            </p>
          </div>

          {status === 'idle' && (
            <button
              onClick={handleMigrate}
              disabled={!isAdmin()}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white transition-colors disabled:opacity-40"
            >
              Mulai Migrasi
            </button>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-2.5 py-2">
              <Loader2 size={18} className="text-sky-400 animate-spin" />
              <p className="text-sm text-slate-400">Memproses data penduduk...</p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                <p className="text-sm font-medium text-emerald-400">Migrasi selesai!</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex flex-col gap-2">
                <p className="text-sm text-slate-300">
                  <span className="font-bold text-emerald-400">{updated}</span> data berhasil diperbarui
                </p>
                {Object.entries(detail).map(([label, count]) => (
                  <p key={label} className="text-xs text-slate-500">
                    · {label}: <span className="text-slate-300 font-medium">{count} orang</span>
                  </p>
                ))}
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-medium">{skipped}</span> data tidak perlu diubah
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
