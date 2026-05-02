'use client'

import { useState } from 'react'
import { collection, getDocs, writeBatch, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { CheckCircle, AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react'

const PENDIDIKAN_MAP: Record<string, string> = {
  'Belum Tamat SD': 'Belum Tamat SD/Sederajat','SD': 'Tamat SD/Sederajat','SD/Sederajat': 'Tamat SD/Sederajat','Tamat SD': 'Tamat SD/Sederajat',
  'SMP': 'SMP/Sederajat','SLTP': 'SMP/Sederajat','SLTP/Sederajat': 'SMP/Sederajat',
  'SMA': 'SMA/Sederajat','SLTA': 'SMA/Sederajat','SLTA/Sederajat': 'SMA/Sederajat',
  'D1': 'Diploma I/II','D2': 'Diploma I/II','D1/D2': 'Diploma I/II','Diploma I': 'Diploma I/II','Diploma II': 'Diploma I/II',
  'D3': 'Diploma III','Akademi/Diploma III/S. Muda': 'Diploma III',
  'D4': 'Diploma IV/Strata I','S1': 'Diploma IV/Strata I','D4/S1': 'Diploma IV/Strata I','Diploma IV': 'Diploma IV/Strata I',
  'S2': 'Strata II','S3': 'Strata III',
}
const PEKERJAAN_MAP: Record<string, string> = {
  'Pegawai Negeri Sipil': 'ASN (PNS)','PNS': 'ASN (PNS)','PPPK': 'ASN (PPPK)','ASN PNS': 'ASN (PNS)','ASN PPPK': 'ASN (PPPK)',
  'Ibu Rumah Tangga': 'Mengurus Rumah Tangga','IBU RUMAH TANGGA': 'Mengurus Rumah Tangga','MENGURUS RUMAH TANGGA': 'Mengurus Rumah Tangga',
  'POLRI': 'Kepolisian RI','KEPOLISIAN RI': 'Kepolisian RI','TNI': 'Tentara Nasional Indonesia','TENTARA NASIONAL INDONESIA': 'Tentara Nasional Indonesia',
  'Guru/Dosen': 'Guru','GURU/DOSEN': 'Guru','GURU': 'Guru','BIDAN': 'Bidan','Tukang/Montir': 'Mekanik','TUKANG/MONTIR': 'Mekanik',
  'PEDAGANG': 'Pedagang','PETANI/PEKEBUN': 'Petani/Pekebun','BURUH HARIAN LEPAS': 'Buruh Harian Lepas','BURUH TANI/PERKEBUNAN': 'Buruh Tani/Perkebunan',
  'KARYAWAN SWASTA': 'Karyawan Swasta','KARYAWAN HONORER': 'Karyawan Honorer','PELAJAR/MAHASISWA': 'Pelajar/Mahasiswa',
  'PERANGKAT DESA': 'Perangkat Desa','WIRASWASTA': 'Wiraswasta','TIDAK/BELUM BEKERJA': 'Tidak/Belum Bekerja','BELUM/TIDAK BEKERJA': 'Tidak/Belum Bekerja',
}

type PreviewItem = { id: string; nama: string; nik: string; field: string; label: string; lama: string; baru: string; done: boolean; loading: boolean }

export default function MigrateStandarisasiPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'scanning' | 'preview' | 'running' | 'done' | 'error'>('idle')
  const [items, setItems] = useState<PreviewItem[]>([])
  const [updated, setUpdated] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)

  async function handleScan() {
    if (!isAdmin()) return
    setStatus('scanning')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      const found: PreviewItem[] = []
      for (const d of snap.docs) {
        const data = d.data()
        const nama = String(data.nama_lengkap ?? '')
        const nik = String(data.nik ?? d.id)
        for (const [field, map, label] of [['pendidikan', PENDIDIKAN_MAP, 'Pendidikan'], ['pekerjaan', PEKERJAAN_MAP, 'Pekerjaan']] as const) {
          const current = String(data[field] ?? '').trim()
          const mapped = (map as Record<string,string>)[current] ?? (map as Record<string,string>)[current.toUpperCase()]
          if (mapped && mapped !== current) found.push({ id: d.id, nama, nik, field, label, lama: current, baru: mapped, done: false, loading: false })
        }
      }
      setItems(found)
      setStatus('preview')
    } catch (e) { setErrorMsg(String(e)); setStatus('error') }
  }

  async function handleOne(id: string, field: string, baru: string) {
    if (!isAdmin()) return
    const key = id + field
    setItems(prev => prev.map(x => x.id + x.field === key ? { ...x, loading: true } : x))
    try {
      await updateDoc(doc(db, 'penduduk', id), { [field]: baru })
      setItems(prev => prev.map(x => x.id + x.field === key ? { ...x, done: true, loading: false } : x))
      setUpdated(u => u + 1)
    } catch { setItems(prev => prev.map(x => x.id + x.field === key ? { ...x, loading: false } : x)) }
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
      batch.update(doc(db, 'penduduk', pending[i].id), { [pending[i].field]: pending[i].baru })
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
    <AppShell title="Standarisasi Data">
      <div className="max-w-2xl mx-auto flex flex-col gap-4 pb-10">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0"><ArrowLeft size={15} /></button>
          <div><h1 className="text-base font-semibold text-slate-100">Standarisasi Pendidikan & Pekerjaan</h1>
          <p className="text-xs text-slate-500">Sesuai Permendagri 6/2026</p></div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-5 flex flex-col gap-4">
          {status === 'idle' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-500 leading-relaxed">Scan seluruh data penduduk untuk menemukan nilai pendidikan dan pekerjaan yang perlu distandarisasi, lalu pilih mana saja yang ingin diubah.</p>
              <button onClick={handleScan} disabled={!isAdmin()} className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white transition-colors disabled:opacity-40">Scan Data Terlebih Dahulu</button>
            </div>
          )}

          {status === 'scanning' && <MigrasiProgress current={0} total={0} label="dokumen dipindai" />}
          {status === 'running' && <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diproses" />}

          {status === 'preview' && items.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle size={32} className="text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">Semua data sudah standar!</p>
              <button onClick={() => router.push('/pengaturan')} className="px-4 py-2 rounded-xl bg-slate-700/60 border border-white/[0.08] text-sm text-slate-300 hover:bg-slate-700 transition-colors">Kembali</button>
            </div>
          )}

          {status === 'preview' && items.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200"><span className="text-amber-400">{pending.length}</span> data perlu distandarisasi</p>
              </div>

              <div className="rounded-xl border border-white/[0.06] overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0d1424] z-10">
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Nama</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Field</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-rose-500 uppercase tracking-wider">Lama</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Baru</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const key = item.id + item.field
                      return (
                        <tr key={key} className={`border-b border-white/[0.04] last:border-0 transition-colors ${item.done ? 'opacity-40' : 'hover:bg-white/[0.02]'}`}>
                          <td className="px-3 py-2 text-slate-300 font-medium truncate max-w-[100px]">{item.nama || '—'}</td>
                          <td className="px-3 py-2 text-[10px] text-slate-500 font-mono">{item.label}</td>
                          <td className="px-3 py-2 text-rose-400 font-mono truncate max-w-[100px]">{item.lama}</td>
                          <td className="px-3 py-2 text-emerald-400 font-mono truncate max-w-[100px]">{item.baru}</td>
                          <td className="px-3 py-2 text-right">
                            {item.done
                              ? <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px]"><Check size={11} />Selesai</span>
                              : <button onClick={() => handleOne(item.id, item.field, item.baru)} disabled={item.loading} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-medium hover:bg-sky-500/20 transition-colors disabled:opacity-40">
                                  {item.loading ? <Loader2 size={10} className="animate-spin" /> : null}
                                  {item.loading ? 'Proses...' : 'Ubah'}
                                </button>}
                          </td>
                        </tr>
                      )
                    })}
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
              <div className="flex items-center gap-2.5"><CheckCircle size={18} className="text-emerald-400 shrink-0" /><p className="text-sm font-medium text-emerald-400">Standarisasi selesai!</p></div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <p className="text-sm text-slate-300"><span className="font-bold text-emerald-400">{updated}</span> data berhasil distandarisasi</p>
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
