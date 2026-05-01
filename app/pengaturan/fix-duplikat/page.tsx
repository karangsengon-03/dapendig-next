'use client'

import { useState } from 'react'
import { collection, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'

export default function FixDuplikatPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [result, setResult] = useState<{
    dihapus: number
    dilewati: number
    duplikat: { nama: string; nik: string; oldId: string }[]
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFix() {
    if (!isAdmin()) return
    setStatus('loading')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      setProgressTotal(snap.docs.length)
      setProgressCurrent(0)

      let dihapus = 0
      let dilewati = 0
      const duplikat: { nama: string; nik: string; oldId: string }[] = []

      for (let i = 0; i < snap.docs.length; i++) {
        const d = snap.docs[i]
        setProgressCurrent(i + 1)
        const data = d.data()
        const nik = String(data.nik ?? '').trim()

        // Skip jika tidak ada NIK atau ID sudah = NIK
        if (!nik || d.id === nik) { dilewati++; continue }

        // Cek apakah sudah ada dokumen dengan ID = NIK
        const nikDoc = await getDoc(doc(db, 'penduduk', nik))
        if (nikDoc.exists()) {
          // Ada duplikat — hapus dokumen lama yang ID-nya random
          await deleteDoc(doc(db, 'penduduk', d.id))
          duplikat.push({
            nama: String(data.nama_lengkap ?? ''),
            nik,
            oldId: d.id,
          })
          dihapus++
        } else {
          dilewati++
        }
      }

      setResult({ dihapus, dilewati, duplikat })
      setStatus('done')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  return (
    <AppShell title="Fix Duplikat">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0">
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-base font-semibold text-slate-100">Fix Duplikat Dokumen</h1>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-slate-300">Hapus dokumen duplikat</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mencari dokumen yang ID-nya masih auto-generate (bukan NIK) tetapi NIK-nya
              sudah ada sebagai dokumen terpisah. Dokumen lama (ID random) akan dihapus,
              dokumen baru (ID = NIK) dipertahankan.
            </p>
          </div>

          {status === 'idle' && (
            <button onClick={handleFix} disabled={!isAdmin()}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white transition-colors disabled:opacity-40">
              Mulai Pemeriksaan & Fix
            </button>
          )}

          {status === 'loading' && (
            <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diperiksa" />
          )}

          {status === 'done' && result && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                <p className="text-sm font-medium text-emerald-400">Selesai!</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex flex-col gap-1.5">
                <p className="text-sm text-slate-300">
                  <span className="font-bold text-emerald-400">{result.dihapus}</span> dokumen duplikat dihapus
                </p>
                <p className="text-sm text-slate-500">
                  <span className="font-medium">{result.dilewati}</span> dokumen tidak perlu diubah
                </p>
              </div>
              {result.duplikat.length > 0 && (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">Dokumen yang dihapus</p>
                  {result.duplikat.map((d, i) => (
                    <div key={i} className="text-xs text-slate-400">
                      <span className="text-slate-200 font-medium">{d.nama}</span>
                      <span className="text-slate-600 ml-1.5">NIK: {d.nik}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.dihapus === 0 && (
                <p className="text-xs text-slate-500 text-center">Tidak ada duplikat ditemukan — semua data sudah bersih.</p>
              )}
              <button onClick={() => router.push('/penduduk')}
                className="w-full py-2.5 rounded-xl bg-slate-700/60 border border-white/[0.08] text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                Lihat Data Penduduk
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <p className="text-sm font-medium text-rose-400">Gagal</p>
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
