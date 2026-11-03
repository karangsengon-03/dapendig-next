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
import { normalisasiTanggal } from '@/lib/dateUtils'

const KOLEKSI_TANGGAL: { koleksi: string; fields: string[] }[] = [
  { koleksi: 'penduduk',      fields: ['tanggal_lahir'] },
  { koleksi: 'lahir',         fields: ['tanggal_lahir'] },
  { koleksi: 'meninggal',     fields: ['tanggal'] },
  { koleksi: 'mutasi_keluar', fields: ['tanggal'] },
  { koleksi: 'mutasi_masuk',  fields: ['tanggal', 'tanggal_lahir'] },
]

type PreviewItem = { koleksi: string; id: string; nama: string; field: string; lama: string; baru: string; done: boolean; loading: boolean }

export default function MigrateTanggalPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<'idle' | 'scanning' | 'preview' | 'running' | 'done' | 'error'>('idle')
  const [items, setItems] = useState<PreviewItem[]>([])
  const [updated, setUpdated] = useState(0)
  const [gagal, setGagal] = useState<{ nama: string; pesan: string }[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)

  async function handleScan() {
    if (!isAdmin()) return
    setStatus('scanning')
    try {
      const found: PreviewItem[] = []
      for (const { koleksi, fields } of KOLEKSI_TANGGAL) {
        const snap = await getDocs(collection(db, koleksi))
        for (const d of snap.docs) {
          const data = d.data()
          for (const field of fields) {
            const val = String(data[field] ?? '').trim()
            if (!val || /^\d{4}-\d{2}-\d{2}$/.test(val)) continue
            const normalized = normalisasiTanggal(val)
            if (normalized !== val) found.push({ koleksi, id: d.id, nama: String(data.nama_lengkap ?? data.nama ?? ''), field, lama: val, baru: normalized, done: false, loading: false })
          }
        }
      }
      setItems(found)
      setStatus('preview')
    } catch (e) { setErrorMsg(String(e)); setStatus('error') }
  }

  const kunci = (x: { koleksi: string; id: string; field: string }) => x.koleksi + x.id + x.field

  async function handleOne(koleksi: string, id: string, field: string, baru: string) {
    if (!isAdmin()) return
    const key = koleksi + id + field
    setItems(prev => prev.map(x => kunci(x) === key ? { ...x, loading: true } : x))
    try {
      await updateDoc(doc(db, koleksi, id), { [field]: baru })
      setItems(prev => prev.map(x => kunci(x) === key ? { ...x, done: true, loading: false } : x))
      setUpdated(u => u + 1)
    } catch (e) {
      setItems(prev => prev.map(x => kunci(x) === key ? { ...x, loading: false } : x))
      toast(`Gagal mengonversi tanggal: ${pesanGalatTulis(e)}`, 'error')
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
          for (const it of kelompok) batch.update(doc(db, it.koleksi, it.id), { [it.field]: it.baru })
          await batch.commit()
        },
        tulisSatu: (it) => updateDoc(doc(db, it.koleksi, it.id), { [it.field]: it.baru }),
        onProgress: (n) => setProgressCurrent(n),
      })
      // Ringkasan dari hasil nyata: satuan + massal yang benar-benar berhasil
      const berhasil = new Set(hasil.berhasil.map(kunci))
      setUpdated(u => u + berhasil.size)
      setItems(prev => prev.map(x => berhasil.has(kunci(x)) ? { ...x, done: true } : x))
      setGagal(hasil.gagal.map(g => ({ nama: g.item.nama || `${g.item.koleksi}/${g.item.id}`, pesan: g.pesan })))
      setStatus('done')
    } catch (e) { setErrorMsg(String(e)); setStatus('error') }
  }

  const pending = items.filter(x => !x.done)
  const isDone = status === 'done' || (status === 'preview' && pending.length === 0 && items.length > 0)

  // Hanya admin; peran lain tidak melihat isi halaman (handler di bawah tetap memeriksa isAdmin() juga)
  if (!isAdmin()) {
    return (
      <AppShell title="Migrasi Format Tanggal">
        <AksesDitolakAdmin />
      </AppShell>
    )
  }

  return (
    <AppShell title="Migrasi Format Tanggal">
      <MigLayout title="Migrasi Format Tanggal" desc="Konversi DD/MM/YYYY → YYYY-MM-DD di semua koleksi">
        {status === 'idle' && (
          <>
            <MigBox>
              {KOLEKSI_TANGGAL.map(({ koleksi, fields }) => (
                <p key={koleksi}>· <span className="mig-code">{koleksi}</span> — {fields.join(', ')}</p>
              ))}
            </MigBox>
            <MigPrimary onClick={handleScan} disabled={!isAdmin()} icon={<Search className="i" />}>Scan Semua Koleksi</MigPrimary>
          </>
        )}

        {status === 'scanning' && <MigrasiProgress current={0} total={0} label="koleksi dipindai" />}
        {status === 'running' && <MigrasiProgress current={progressCurrent} total={progressTotal} label="field dikonversi" />}

        {status === 'preview' && items.length === 0 && (
          <MigEmpty title="Semua tanggal sudah format benar!" onBack={() => router.push('/pengaturan')} />
        )}

        {status === 'preview' && items.length > 0 && (
          <>
            <MigSummary>
              <span><b className="w">{pending.length}</b> field perlu dikonversi</span>
            </MigSummary>

            <MigTable head={<><th>Koleksi / Nama</th><th className="cx">Lama</th><th className="cy">Baru</th><th className="r">Aksi</th></>}>
              {items.map(item => {
                const key = item.koleksi + item.id + item.field
                return (
                  <tr key={key} className={item.done ? 'fin' : undefined}>
                    <td>
                      <span className="mn" style={{ display: 'block', color: 'var(--ink-3)' }}>{item.koleksi}.{item.field}</span>
                      <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{item.nama || item.id}</span>
                    </td>
                    <td className="x">{item.lama}</td>
                    <td className="y">{item.baru}</td>
                    <td className="r">
                      <MigRowBtn done={item.done} loading={item.loading} onClick={() => handleOne(item.koleksi, item.id, item.field, item.baru)} label="Konversi" />
                    </td>
                  </tr>
                )
              })}
            </MigTable>

            <MigFoot
              selesai={isDone}
              selesaiText={<>Semua selesai! <strong>{updated}</strong> field dikonversi.</>}
              onCancel={() => router.back()}
              onAll={handleAll}
              allLabel={`Konversi Semua (${pending.length})`}
            />
          </>
        )}

        {status === 'done' && (
          <MigDone title="Migrasi selesai!" onBack={() => router.push('/pengaturan')}>
            <MigResultBox>
              <p><b>{updated}</b> field tanggal berhasil dikonversi</p>
            </MigResultBox>
            <MigGagal daftar={gagal} />
          </MigDone>
        )}

        {status === 'error' && <MigError msg={errorMsg} onRetry={() => setStatus('idle')} />}
      </MigLayout>
    </AppShell>
  )
}
