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

  const kunci = (x: { id: string; field: string }) => x.id + x.field

  async function handleOne(id: string, field: string, baru: string) {
    if (!isAdmin()) return
    const key = id + field
    setItems(prev => prev.map(x => kunci(x) === key ? { ...x, loading: true } : x))
    try {
      await updateDoc(doc(db, 'penduduk', id), { [field]: baru })
      setItems(prev => prev.map(x => kunci(x) === key ? { ...x, done: true, loading: false } : x))
      setUpdated(u => u + 1)
    } catch (e) {
      setItems(prev => prev.map(x => kunci(x) === key ? { ...x, loading: false } : x))
      toast(`Gagal menstandarkan data: ${pesanGalatTulis(e)}`, 'error')
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
          for (const it of kelompok) batch.update(doc(db, 'penduduk', it.id), { [it.field]: it.baru })
          await batch.commit()
        },
        tulisSatu: (it) => updateDoc(doc(db, 'penduduk', it.id), { [it.field]: it.baru }),
        onProgress: (n) => setProgressCurrent(n),
      })
      // Ringkasan dari hasil nyata: satuan + massal yang benar-benar berhasil
      const berhasil = new Set(hasil.berhasil.map(kunci))
      setUpdated(u => u + berhasil.size)
      setItems(prev => prev.map(x => berhasil.has(kunci(x)) ? { ...x, done: true } : x))
      setGagal(hasil.gagal.map(g => ({ nama: g.item.nama || g.item.nik, pesan: g.pesan })))
      setStatus('done')
    } catch (e) { setErrorMsg(String(e)); setStatus('error') }
  }

  const pending = items.filter(x => !x.done)
  const isDone = status === 'done' || (status === 'preview' && pending.length === 0 && items.length > 0)

  // Hanya admin; peran lain tidak melihat isi halaman (handler di bawah tetap memeriksa isAdmin() juga)
  if (!isAdmin()) {
    return (
      <AppShell title="Standarisasi Data">
        <AksesDitolakAdmin />
      </AppShell>
    )
  }

  return (
    <AppShell title="Standarisasi Data">
      <MigLayout title="Standarisasi Pendidikan & Pekerjaan" desc="Sesuai Permendagri 6/2026">
        {status === 'idle' && (
          <>
            <MigBox>
              <p>Scan seluruh data penduduk untuk menemukan nilai pendidikan dan pekerjaan yang perlu distandarisasi, lalu pilih mana saja yang ingin diubah.</p>
            </MigBox>
            <MigPrimary onClick={handleScan} disabled={!isAdmin()} icon={<Search className="i" />}>Scan Data Terlebih Dahulu</MigPrimary>
          </>
        )}

        {status === 'scanning' && <MigrasiProgress current={0} total={0} label="dokumen dipindai" />}
        {status === 'running' && <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diproses" />}

        {status === 'preview' && items.length === 0 && (
          <MigEmpty title="Semua data sudah standar!" onBack={() => router.push('/pengaturan')} />
        )}

        {status === 'preview' && items.length > 0 && (
          <>
            <MigSummary>
              <span><b className="w">{pending.length}</b> data perlu distandarisasi</span>
            </MigSummary>

            <MigTable head={<><th>Nama</th><th>Field</th><th className="cx">Lama</th><th className="cy">Baru</th><th className="r">Aksi</th></>}>
              {items.map(item => {
                const key = item.id + item.field
                return (
                  <tr key={key} className={item.done ? 'fin' : undefined}>
                    <td className="nmx">{item.nama || '—'}</td>
                    <td className="sub">{item.label}</td>
                    <td className="x">{item.lama}</td>
                    <td className="y">{item.baru}</td>
                    <td className="r">
                      <MigRowBtn done={item.done} loading={item.loading} onClick={() => handleOne(item.id, item.field, item.baru)} label="Ubah" />
                    </td>
                  </tr>
                )
              })}
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
          <MigDone title="Standarisasi selesai!" onBack={() => router.push('/pengaturan')}>
            <MigResultBox>
              <p><b>{updated}</b> data berhasil distandarisasi</p>
            </MigResultBox>
            <MigGagal daftar={gagal} />
          </MigDone>
        )}

        {status === 'error' && <MigError msg={errorMsg} onRetry={() => setStatus('idle')} />}
      </MigLayout>
    </AppShell>
  )
}
