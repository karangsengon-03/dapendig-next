'use client'

import { useState } from 'react'
import { collection, getDocs, writeBatch, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { CheckCircle, AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react'

const MIGRATION_MAP: Record<string, string> = {
  'SLTP/Sederajat': 'SMP/Sederajat',
  'SLTA/Sederajat': 'SMA/Sederajat',
}

type PreviewItem = { id: string; nama: string; nik: string; lama: string; baru: string; done: boolean; loading: boolean }

export default function MigratePendidikanPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'scanning' | 'preview' | 'running' | 'done' | 'error'>('idle')
  const [items, setItems] = useState<PreviewItem[]>([])
  const [updated, setUpdated] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)

  async function handleScan() {
    if (!isAdmin()) return
    setStatus('scanning')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      const toUpdate: PreviewItem[] = []
      for (const d of snap.docs) {
        const old = d.data().pendidikan as string | undefined
        if (old && MIGRATION_MAP[old]) toUpdate.push({ id: d.id, nama: String(d.data().nama_lengkap ?? ''), nik: String(d.data().nik ?? d.id), lama: old, baru: MIGRATION_MAP[old], done: false, loading: false })
      }
      setSkipped(snap.docs.length - toUpdate.length)
      setItems(toUpdate)
      setStatus('preview')
    } catch (e) { setErrorMsg(String(e)); setStatus('error') }
  }

  async function handleOne(id: string) {
    if (!isAdmin()) return
    const item = items.find(x => x.id === id)
    if (!item) return
    setItems(prev => prev.map(x => x.id === id ? { ...x, loading: true } : x))
    try {
      await updateDoc(doc(db, 'penduduk', id), { pendidikan: item.baru })
      setItems(prev => prev.map(x => x.id === id ? { ...x, done: true, loading: false } : x))
      setUpdated(u => u + 1)
    } catch { setItems(prev => prev.map(x => x.id === id ? { ...x, loading: false } : x)) }
  }

  async function handleAll() {
    if (!isAdmin()) return
    const pending = items.filter(x => !x.done)
    setStatus('running')
    setProgressTotal(pending.length)
    setProgressCurrent(0)
    let batch = writeBatch(db); let sz = 0
    for (let i = 0; i < pending.length; i++) {
      setProgressCurrent(i + 1)
      batch.update(doc(db, 'penduduk', pending[i].id), { pendidikan: pending[i].baru })
      sz++; if (sz >= 499) { await batch.commit(); batch = writeBatch(db); sz = 0 }
    }
    if (sz > 0) await batch.commit()
    setUpdated(pending.length)
    setItems(prev => prev.map(x => ({ ...x, done: true })))
    setStatus('done')
  }

  const pending = items.filter(x => !x.done)
  const isDone = status === 'done' || (status === 'preview' && pending.length === 0 && items.length > 0)

  return (
    <AppShell title="Migrasi Pendidikan">
      <div className="max-w-2xl mx-auto flex flex-col gap-4 pb-10">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0"><ArrowLeft size={15} /></button>
          <div><h1 className="text-base font-semibold text-slate-100">Migrasi Pendidikan</h1>
          <p className="text-xs text-slate-500">SLTP → SMP dan SLTA → SMA</p></div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-5 flex flex-col gap-4">
          {status === 'idle' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex flex-col gap-2">
                {Object.entries(MIGRATION_MAP).map(([old, nw]) => (
                  <div key={old} className="flex items-center gap-2 text-xs"><span className="text-rose-400 font-mono">{old}</span><span className="text-slate-600">→</span><span className="text-emerald-400 font-mono">{nw}</span></div>
                ))}
              </div>
              <button onClick={handleScan} disabled={!isAdmin()} className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white transition-colors disabled:opacity-40">Scan Data Terlebih Dahulu</button>
            </div>
          )}

          {status === 'scanning' && <MigrasiProgress current={0} total={0} label="dokumen dipindai" />}
          {status === 'running' && <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diproses" />}

          {status === 'preview' && items.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle size={32} className="text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">Tidak ada data yang perlu diubah!</p>
              <button onClick={() => router.push('/pengaturan')} className="px-4 py-2 rounded-xl bg-slate-700/60 border border-white/[0.08] text-sm text-slate-300 hover:bg-slate-700 transition-colors">Kembali</button>
            </div>
          )}

          {status === 'preview' && items.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200"><span className="text-amber-400">{pending.length}</span> data perlu diubah</p>
                <p className="text-xs text-slate-500">{skipped} tidak perlu diubah</p>
              </div>

              <div className="rounded-xl border border-white/[0.06] overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0d1424] z-10">
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Nama</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-rose-500 uppercase tracking-wider">Lama</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Baru</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className={`border-b border-white/[0.04] last:border-0 transition-colors ${item.done ? 'opacity-40' : 'hover:bg-white/[0.02]'}`}>
                        <td className="px-3 py-2 text-slate-300 font-medium truncate max-w-[120px]">{item.nama || '—'}</td>
                        <td className="px-3 py-2 text-rose-400 font-mono">{item.lama}</td>
                        <td className="px-3 py-2 text-emerald-400 font-mono">{item.baru}</td>
                        <td className="px-3 py-2 text-right">
                          {item.done
                            ? <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px]"><Check size={11} />Selesai</span>
                            : <button onClick={() => handleOne(item.id)} disabled={item.loading} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-medium hover:bg-sky-500/20 transition-colors disabled:opacity-40">
                                {item.loading ? <Loader2 size={10} className="animate-spin" /> : null}
                                {item.loading ? 'Proses...' : 'Ubah'}
                              </button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isDone
                ? <div className="flex items-center gap-2.5"><CheckCircle size={16} className="text-emerald-400" /><p className="text-sm text-emerald-400">Semua selesai! <span className="font-bold">{updated}</span> data diperbarui.</p></div>
                : <div className="flex gap-2.5">
                    <button onClick={() => router.back()} className="flex-1 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-slate-400 hover:bg-white/[0.06] transition-colors">Batal</button>
                    <button onClick={handleAll} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-colors">Ubah Semua ({pending.length})</button>
                  </div>}
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5"><CheckCircle size={18} className="text-emerald-400 shrink-0" /><p className="text-sm font-medium text-emerald-400">Migrasi selesai!</p></div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <p className="text-sm text-slate-300"><span className="font-bold text-emerald-400">{updated}</span> data berhasil diperbarui</p>
              </div>
              <button onClick={() => router.push('/pengaturan')} className="w-full py-2.5 rounded-xl bg-slate-700/60 border border-white/[0.08] text-sm text-slate-300 hover:bg-slate-700 transition-colors">Kembali ke Pengaturan</button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5"><AlertCircle size={18} className="text-rose-400 shrink-0" /><p className="text-sm font-medium text-rose-400">Gagal</p></div>
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
