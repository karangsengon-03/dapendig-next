'use client'

import { useState } from 'react'
import { collection, getDocs, writeBatch, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { AksesDitolakAdmin } from '@/components/ui/akses-ditolak'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { Search } from 'lucide-react'
import { MigLayout, MigBox, MigPrimary, MigEmpty, MigSummary, MigTable, MigRowBtn, MigFoot, MigDone, MigResultBox, MigError, MigGagal } from '@/components/pengaturan/migrasi-parts'
import { useToast } from '@/components/ui/toast'
import { tulisBertahap, pesanGalatTulis } from '@/lib/tulis-bertahap'

const MIGRATION_MAP: Record<string, string> = {
  'SLTP/Sederajat': 'SMP/Sederajat',
  'SLTA/Sederajat': 'SMA/Sederajat',
}

type PreviewItem = { id: string; nama: string; nik: string; lama: string; baru: string; done: boolean; loading: boolean }

export default function MigratePendidikanPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<'idle' | 'scanning' | 'preview' | 'running' | 'done' | 'error'>('idle')
  const [items, setItems] = useState<PreviewItem[]>([])
  const [updated, setUpdated] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [gagal, setGagal] = useState<{ nama: string; pesan: string }[]>([])
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
    } catch (e) {
      setItems(prev => prev.map(x => x.id === id ? { ...x, loading: false } : x))
      toast(`Gagal memperbarui pendidikan: ${pesanGalatTulis(e)}`, 'error')
    }
  }

  // Hanya update (tidak membuat dokumen); baris gagal tidak menghentikan proses
  async function handleAll() {
    if (!isAdmin()) return
    const pending = items.filter(x => !x.done)
    setStatus('running')
    setProgressTotal(pending.length)
    setProgressCurrent(0)
    try {
      const hasil = await tulisBertahap(pending, {
        ukuranBatch: 499,
        tulisBatch: async (kelompok) => {
          const batch = writeBatch(db)
          for (const it of kelompok) batch.update(doc(db, 'penduduk', it.id), { pendidikan: it.baru })
          await batch.commit()
        },
        tulisSatu: (it) => updateDoc(doc(db, 'penduduk', it.id), { pendidikan: it.baru }),
        onProgress: (n) => setProgressCurrent(n),
      })
      // Ringkasan dari hasil nyata: satuan + massal yang benar-benar berhasil
      const berhasil = new Set(hasil.berhasil.map(x => x.id))
      setUpdated(u => u + berhasil.size)
      setItems(prev => prev.map(x => berhasil.has(x.id) ? { ...x, done: true } : x))
      setGagal(hasil.gagal.map(g => ({ nama: g.item.nama || g.item.nik, pesan: g.pesan })))
      setStatus('done')
    } catch (e) { setErrorMsg(String(e)); setStatus('error') }
  }

  const pending = items.filter(x => !x.done)
  const isDone = status === 'done' || (status === 'preview' && pending.length === 0 && items.length > 0)

  // Hanya admin; peran lain tidak melihat isi halaman (handler di bawah tetap memeriksa isAdmin() juga)
  if (!isAdmin()) {
    return (
      <AppShell title="Migrasi pendidikan">
        <AksesDitolakAdmin />
      </AppShell>
    )
  }

  return (
    <AppShell title="Migrasi pendidikan">
      <MigLayout title="Migrasi pendidikan" desc="SLTP → SMP dan SLTA → SMA">
        {status === 'idle' && (
          <>
            <MigBox>
              {Object.entries(MIGRATION_MAP).map(([old, nw]) => (
                <div key={old} className="mig-map"><span className="x mono">{old}</span><span className="ar">→</span><span className="y mono">{nw}</span></div>
              ))}
            </MigBox>
            <MigPrimary onClick={handleScan} disabled={!isAdmin()} icon={<Search className="i" />}>Scan data terlebih dahulu</MigPrimary>
          </>
        )}

        {status === 'scanning' && <MigrasiProgress current={0} total={0} label="dokumen dipindai" />}
        {status === 'running' && <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diproses" />}

        {status === 'preview' && items.length === 0 && (
          <MigEmpty title="Tidak ada data yang perlu diubah!" onBack={() => router.push('/pengaturan')} />
        )}

        {status === 'preview' && items.length > 0 && (
          <>
            <MigSummary>
              <span><b className="w">{pending.length}</b> data perlu diubah</span>
              <small>{skipped} tidak perlu diubah</small>
            </MigSummary>

            <MigTable head={<><th>Nama</th><th className="cx">Lama</th><th className="cy">Baru</th><th className="r">Aksi</th></>}>
              {items.map(item => (
                <tr key={item.id} className={item.done ? 'fin' : undefined}>
                  <td className="nmx">{item.nama || '—'}</td>
                  <td className="x">{item.lama}</td>
                  <td className="y">{item.baru}</td>
                  <td className="r">
                    <MigRowBtn done={item.done} loading={item.loading} onClick={() => handleOne(item.id)} label="Ubah" />
                  </td>
                </tr>
              ))}
            </MigTable>

            <MigFoot
              selesai={isDone}
              selesaiText={<>Semua selesai! <strong>{updated}</strong> data diperbarui.</>}
              onCancel={() => router.back()}
              onAll={handleAll}
              allLabel={`Ubah Semua (${pending.length})`}
            />
          </>
        )}

        {status === 'done' && (
          <MigDone title="Migrasi selesai!" onBack={() => router.push('/pengaturan')}>
            <MigResultBox>
              <p><b>{updated}</b> data berhasil diperbarui</p>
            </MigResultBox>
            <MigGagal daftar={gagal} />
          </MigDone>
        )}

        {status === 'error' && <MigError msg={errorMsg} onRetry={() => setStatus('idle')} />}
      </MigLayout>
    </AppShell>
  )
}
