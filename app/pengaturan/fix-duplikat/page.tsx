'use client'

import { useState } from 'react'
import { collection, getDocs, runTransaction, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { AksesDitolakAdmin } from '@/components/ui/akses-ditolak'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { Search } from 'lucide-react'
import { MigLayout, MigBox, MigPrimary, MigEmpty, MigSummary, MigTable, MigRowBtn, MigFoot, MigDone, MigResultBox, MigError, MigGagal } from '@/components/pengaturan/migrasi-parts'
import { useToast } from '@/components/ui/toast'
import { GalatTolak } from '@/lib/galat-tolak'
import { pesanGalatTulis } from '@/lib/tulis-bertahap'

type PreviewItem = { id: string; nik: string; nama: string; done: boolean; loading: boolean }

export default function FixDuplikatPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<'idle' | 'scanning' | 'preview' | 'running' | 'done' | 'error'>('idle')
  const [items, setItems] = useState<PreviewItem[]>([])
  const [dihapus, setDihapus] = useState(0)
  const [gagal, setGagal] = useState<{ nama: string; pesan: string }[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)

  async function handleScan() {
    if (!isAdmin()) return
    setStatus('scanning')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      setProgressTotal(snap.docs.length)
      const found: PreviewItem[] = []
      for (let i = 0; i < snap.docs.length; i++) {
        setProgressCurrent(i + 1)
        const d = snap.docs[i]
        const data = d.data()
        const nik = String(data.nik ?? '').trim()
        if (!nik || d.id === nik) continue
        const nikDoc = await getDoc(doc(db, 'penduduk', nik))
        if (nikDoc.exists()) found.push({ id: d.id, nik, nama: String(data.nama_lengkap ?? ''), done: false, loading: false })
      }
      setItems(found)
      setStatus('preview')
    } catch (e) { setErrorMsg(String(e)); setStatus('error') }
  }

  // Hapus dokumen ber-ID acak HANYA bila dokumen ber-ID NIK masih ada (cek dan hapus dalam satu transaksi):
  // jangan sampai satu-satunya salinan terhapus karena hasil scan sudah basi.
  async function hapusDuplikat(item: PreviewItem) {
    await runTransaction(db, async (tx) => {
      const salinan = await tx.get(doc(db, 'penduduk', item.nik))
      if (!salinan.exists()) throw new GalatTolak('Dokumen ber-ID NIK tidak ditemukan; ini satu-satunya salinan')
      tx.delete(doc(db, 'penduduk', item.id))
    })
  }

  async function handleOne(id: string) {
    if (!isAdmin()) return
    const item = items.find(x => x.id === id)
    if (!item) return
    setItems(prev => prev.map(x => x.id === id ? { ...x, loading: true } : x))
    try {
      await hapusDuplikat(item)
      setItems(prev => prev.map(x => x.id === id ? { ...x, done: true, loading: false } : x))
      setDihapus(u => u + 1)
    } catch (e) {
      setItems(prev => prev.map(x => x.id === id ? { ...x, loading: false } : x))
      toast(`Gagal menghapus duplikat: ${pesanGalatTulis(e)}`, 'error')
    }
  }

  async function handleAll() {
    if (!isAdmin()) return
    const pending = items.filter(x => !x.done)
    setStatus('running')
    setProgressTotal(pending.length)
    setProgressCurrent(0)
    try {
      const berhasil = new Set<string>()
      const gagalBaru: { nama: string; pesan: string }[] = []
      for (let i = 0; i < pending.length; i++) {
        setProgressCurrent(i + 1)
        try {
          await hapusDuplikat(pending[i])
          berhasil.add(pending[i].id)
        } catch (e) {
          gagalBaru.push({ nama: pending[i].nama || pending[i].nik, pesan: pesanGalatTulis(e) })
        }
      }
      // Ringkasan dari hasil nyata: satuan + massal yang benar-benar terhapus
      setDihapus(u => u + berhasil.size)
      setItems(prev => prev.map(x => berhasil.has(x.id) ? { ...x, done: true } : x))
      setGagal(gagalBaru)
      setStatus('done')
    } catch (e) { setErrorMsg(String(e)); setStatus('error') }
  }

  const pending = items.filter(x => !x.done)
  const isDone = status === 'done' || (status === 'preview' && pending.length === 0 && items.length > 0)

  // Hanya admin; peran lain tidak melihat isi halaman (handler di bawah tetap memeriksa isAdmin() juga)
  if (!isAdmin()) {
    return (
      <AppShell title="Fix duplikat">
        <AksesDitolakAdmin />
      </AppShell>
    )
  }

  return (
    <AppShell title="Fix duplikat">
      <MigLayout title="Fix duplikat dokumen" desc="Hapus dokumen lama jika NIK sudah ada sebagai dokumen terpisah">
        {status === 'idle' && (
          <>
            <MigBox>
              <p>Mencari dokumen yang ID-nya masih auto-generate tetapi NIK-nya sudah ada sebagai dokumen terpisah. Dokumen lama (ID random) akan dihapus.</p>
            </MigBox>
            <MigPrimary onClick={handleScan} disabled={!isAdmin()} icon={<Search className="i" />}>Scan duplikat terlebih dahulu</MigPrimary>
          </>
        )}

        {(status === 'scanning' || status === 'running') && <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diperiksa" />}

        {status === 'preview' && items.length === 0 && (
          <MigEmpty title="Tidak ada duplikat ditemukan!" onBack={() => router.push('/pengaturan')} />
        )}

        {status === 'preview' && items.length > 0 && (
          <>
            <MigSummary>
              <span><b className="r">{pending.length}</b> dokumen duplikat ditemukan</span>
            </MigSummary>

            <MigTable head={<><th>Nama</th><th>NIK</th><th className="cx">ID Lama</th><th className="r">Aksi</th></>}>
              {items.map(item => (
                <tr key={item.id} className={item.done ? 'fin' : undefined}>
                  <td className="nmx">{item.nama || '—'}</td>
                  <td className="mn">{item.nik}</td>
                  <td className="x">{item.id}</td>
                  <td className="r">
                    <MigRowBtn done={item.done} loading={item.loading} onClick={() => handleOne(item.id)} label="Hapus" loadingLabel="Hapus..." doneLabel="Dihapus" tone="destructive" />
                  </td>
                </tr>
              ))}
            </MigTable>

            <MigFoot
              selesai={isDone}
              selesaiText={<>Semua selesai! <strong>{dihapus}</strong> duplikat dihapus.</>}
              onCancel={() => router.back()}
              onAll={handleAll}
              allLabel={`Hapus Semua (${pending.length})`}
              allVariant="danger"
            />
          </>
        )}

        {status === 'done' && (
          <MigDone title="Selesai!" onBack={() => router.push('/pengaturan')}>
            <MigResultBox>
              <p><b>{dihapus}</b> dokumen duplikat berhasil dihapus</p>
            </MigResultBox>
            <MigGagal daftar={gagal} />
          </MigDone>
        )}

        {status === 'error' && <MigError msg={errorMsg} onRetry={() => setStatus('idle')} />}
      </MigLayout>
    </AppShell>
  )
}
