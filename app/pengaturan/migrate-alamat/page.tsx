'use client'

import { useState } from 'react'
import { collection, getDocs, writeBatch, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { AksesDitolakAdmin } from '@/components/ui/akses-ditolak'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { alamatBawaan } from '@/lib/wilayah'
import { useRouter } from 'next/navigation'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { Search } from 'lucide-react'
import { MigLayout, MigBox, MigPrimary, MigEmpty, MigSummary, MigTable, MigRowBtn, MigFoot, MigDone, MigResultBox, MigError, MigGagal } from '@/components/pengaturan/migrasi-parts'
import { useToast } from '@/components/ui/toast'
import { tulisBertahap, pesanGalatTulis } from '@/lib/tulis-bertahap'

type PreviewItem = { id: string; nama: string; nik: string; done: boolean; loading: boolean }

export default function MigrateAlamatPage() {
  const { isAdmin } = useAuthStore()
  // Alamat bawaan = nama desa dari Pengaturan → Informasi wilayah (bukan nama tertanam)
  const alamat = alamatBawaan(useAppStore((s) => s.wilayah))
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
      const toUpdate = snap.docs
        .filter(d => !d.data().alamat?.trim())
        .map(d => ({ id: d.id, nama: String(d.data().nama_lengkap ?? ''), nik: String(d.data().nik ?? d.id), done: false, loading: false }))
      setSkipped(snap.docs.length - toUpdate.length)
      setItems(toUpdate)
      setStatus('preview')
    } catch (e) { setErrorMsg(String(e)); setStatus('error') }
  }

  // Eksekusi satu per satu
  async function handleOne(id: string) {
    if (!isAdmin()) return
    setItems(prev => prev.map(x => x.id === id ? { ...x, loading: true } : x))
    try {
      await updateDoc(doc(db, 'penduduk', id), { alamat })
      setItems(prev => prev.map(x => x.id === id ? { ...x, done: true, loading: false } : x))
      setUpdated(u => u + 1)
    } catch (e) {
      setItems(prev => prev.map(x => x.id === id ? { ...x, loading: false } : x))
      toast(`Gagal mengisi alamat: ${pesanGalatTulis(e)}`, 'error')
    }
  }

  // Eksekusi semua sekaligus. Hanya update (tidak membuat dokumen); baris gagal tidak menghentikan proses.
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
          for (const it of kelompok) batch.update(doc(db, 'penduduk', it.id), { alamat })
          await batch.commit()
        },
        tulisSatu: (it) => updateDoc(doc(db, 'penduduk', it.id), { alamat }),
        onProgress: (n) => setProgressCurrent(n),
      })
      // Ringkasan dari hasil nyata: tandai selesai HANYA yang berhasil; hitung bersama yang sudah selesai satuan
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
      <AppShell title="Migrasi alamat">
        <AksesDitolakAdmin />
      </AppShell>
    )
  }

  return (
    <AppShell title="Migrasi alamat">
      <MigLayout title="Migrasi alamat penduduk" desc={alamat ? `Isi alamat ${alamat} untuk yang belum punya alamat` : 'Isi nama desa di Pengaturan → Informasi wilayah terlebih dahulu'}>
        {status === 'idle' && (
          <>
            <MigBox>
              <p>Proses ini akan mengisi field alamat dengan <b>{alamat || '(nama desa belum diisi)'}</b> untuk semua penduduk yang belum memiliki alamat.</p>
            </MigBox>
            <MigPrimary onClick={handleScan} disabled={!isAdmin() || !alamat} icon={<Search className="i" />}>Scan data terlebih dahulu</MigPrimary>
          </>
        )}

        {status === 'scanning' && <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen dipindai" />}
        {status === 'running' && <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diproses" />}

        {(status === 'preview' || isDone) && items.length === 0 && (
          <MigEmpty title="Semua penduduk sudah punya alamat!" onBack={() => router.push('/pengaturan')} />
        )}

        {status === 'preview' && items.length > 0 && (
          <>
            <MigSummary>
              <span><b className="w">{pending.length}</b> penduduk belum punya alamat</span>
              <small>{skipped} sudah punya</small>
            </MigSummary>

            <MigTable head={<><th>Nama</th><th>NIK</th><th className="r">Aksi</th></>}>
              {items.map(item => (
                <tr key={item.id} className={item.done ? 'fin' : undefined}>
                  <td className="nmx">{item.nama || '—'}</td>
                  <td className="mn">{item.nik}</td>
                  <td className="r">
                    <MigRowBtn done={item.done} loading={item.loading} onClick={() => handleOne(item.id)} label="Isi alamat" />
                  </td>
                </tr>
              ))}
            </MigTable>

            <MigFoot
              selesai={isDone}
              selesaiText={<>Semua selesai! <strong>{updated}</strong> penduduk diperbarui.</>}
              onCancel={() => router.back()}
              onAll={handleAll}
              allLabel={`Isi Semua (${pending.length})`}
            />
          </>
        )}

        {status === 'done' && (
          <MigDone title="Migrasi selesai!" onBack={() => router.push('/pengaturan')}>
            <MigResultBox>
              <p><b>{updated}</b> penduduk berhasil diperbarui</p>
              <p style={{ color: 'var(--ink-3)' }}><b>{skipped}</b> penduduk sudah punya alamat</p>
            </MigResultBox>
            <MigGagal daftar={gagal} />
          </MigDone>
        )}

        {status === 'error' && <MigError msg={errorMsg} onRetry={() => setStatus('idle')} />}
      </MigLayout>
    </AppShell>
  )
}
