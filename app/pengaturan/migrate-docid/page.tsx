'use client'

import { useState } from 'react'
import { collection, getDocs, runTransaction, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { AksesDitolakAdmin } from '@/components/ui/akses-ditolak'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { pindahDokumenAtomik } from '@/lib/pindah-dokumen'
import { CircleCheck, Search, TriangleAlert } from 'lucide-react'
import { MigLayout, MigTable, MigRowBtn, MigDone, MigResultBox, MigError, MigPrimary } from '@/components/pengaturan/migrasi-parts'

export default function MigrateDocIdPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<'idle' | 'preview' | 'loading' | 'done' | 'error'>('idle')
  const [preview, setPreview] = useState<{ sudahBenar: number; perluMigrasi: number; tanpaNik: number }>({ sudahBenar: 0, perluMigrasi: 0, tanpaNik: 0 })
  const [result, setResult] = useState<{ dipindah: number; dilewati: number; gagal: number }>({ dipindah: 0, dilewati: 0, gagal: 0 })
  const [previewItems, setPreviewItems] = useState<{ id: string; nik: string; nama: string; done: boolean; loading: boolean }[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)

  async function handlePreview() {
    if (!isAdmin()) return
    setStatus('loading')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      let sudahBenar = 0, perluMigrasi = 0, tanpaNik = 0
      for (let _i = 0; _i < snap.docs.length; _i++) {
        const d = snap.docs[_i]
        setProgressCurrent(_i + 1)
        const nik = String(d.data().nik ?? '').trim()
        if (!nik) { tanpaNik++; continue }
        if (d.id === nik) sudahBenar++
        else perluMigrasi++
      }
      setPreview({ sudahBenar, perluMigrasi, tanpaNik })
      // Simpan daftar item yang perlu migrasi untuk opsi per-baris
      const toMigrate = snap.docs
        .filter(d => { const nik = String(d.data().nik ?? '').trim(); return nik && d.id !== nik })
        .map(d => ({ id: d.id, nik: String(d.data().nik ?? '').trim(), nama: String(d.data().nama_lengkap ?? ''), done: false, loading: false }))
      setPreviewItems(toMigrate)
      setStatus('preview')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  async function handleMigrate() {
    if (!isAdmin()) return
    setStatus('loading')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      setProgressTotal(snap.docs.length)
      setProgressCurrent(0)
      let dipindah = 0, dilewati = 0, gagal = 0

      for (let _i = 0; _i < snap.docs.length; _i++) {
        const d = snap.docs[_i]
        setProgressCurrent(_i + 1)
        const nik = String(d.data().nik ?? '').trim()

        // Skip jika tidak ada NIK atau ID sudah benar
        if (!nik) { dilewati++; continue }
        if (d.id === nik) { dilewati++; continue }

        try {
          // Atomik: salin ke ID = NIK + hapus dokumen lama dalam satu transaksi.
          // Bila dokumen ber-ID NIK sudah ada → DITOLAK (tidak menimpa; selesaikan lewat Fix Duplikat) dan dihitung gagal.
          const hasil = await runTransaction(db, (tx) =>
            pindahDokumenAtomik(tx, doc(db, 'penduduk', d.id), doc(db, 'penduduk', nik)))
          if (hasil === 'ok') dipindah++
          else if (hasil === 'hilang') dilewati++
          else gagal++
        } catch {
          gagal++
        }
      }

      setResult({ dipindah, dilewati, gagal })
      setStatus('done')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  async function handleOneItem(id: string, nik: string) {
    if (!isAdmin()) return
    setPreviewItems(prev => prev.map(x => x.id === id ? { ...x, loading: true } : x))
    try {
      const hasil = await runTransaction(db, (tx) =>
        pindahDokumenAtomik(tx, doc(db, 'penduduk', id), doc(db, 'penduduk', nik)))
      if (hasil === 'ok') {
        setPreviewItems(prev => prev.map(x => x.id === id ? { ...x, done: true, loading: false } : x))
        setPreview(prev => ({ ...prev, perluMigrasi: prev.perluMigrasi - 1, sudahBenar: prev.sudahBenar + 1 }))
        return
      }
      setPreviewItems(prev => prev.map(x => x.id === id ? { ...x, loading: false } : x))
      if (hasil === 'bentrok') toast('Gagal memigrasi: NIK sudah dipakai dokumen lain. Jalankan Fix Duplikat dulu.', 'error')
    } catch {
      setPreviewItems(prev => prev.map(x => x.id === id ? { ...x, loading: false } : x))
      toast('Gagal memigrasi dokumen', 'error')
    }
  }

  // Hanya admin; peran lain tidak melihat isi halaman (handler di bawah tetap memeriksa isAdmin() juga)
  if (!isAdmin()) {
    return (
      <AppShell title="Migrasi Document ID">
        <AksesDitolakAdmin />
      </AppShell>
    )
  }

  return (
    <AppShell title="Migrasi Document ID">
      <MigLayout title="Migrasi ID Dokumen → NIK" desc="Seragamkan semua ID dokumen penduduk menggunakan NIK">
        <div>
          <h3 style={{ margin: 0, fontSize: 15 }}>Seragamkan ID dokumen penduduk</h3>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Proses ini memindahkan semua dokumen penduduk yang ID-nya masih acak ke format baru
            menggunakan <strong>NIK</strong> sebagai ID dokumen.
            Data tidak akan hilang — hanya ID dokumen yang diperbarui.
          </p>
        </div>

        <div className="a-alert warn">
          <TriangleAlert className="i" />
          <div>
            Lakukan <strong>ekspor data</strong> terlebih dahulu sebelum migrasi sebagai backup.
            Proses ini tidak dapat dibatalkan.
          </div>
        </div>

        {status === 'idle' && (
          <MigPrimary onClick={handlePreview} disabled={!isAdmin()} icon={<Search className="i" />}>Cek Data Sebelum Migrasi</MigPrimary>
        )}

        {status === 'loading' && (
          <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diperiksa" />
        )}

        {status === 'preview' && (
          <>
            <div className="mig-box">
              <span className="ttl">Hasil Pemeriksaan</span>
              <div className="kv"><span>Sudah pakai NIK sebagai ID</span><b className="ok">{preview.sudahBenar} dokumen</b></div>
              <div className="kv"><span>Perlu dimigrasi</span><b className="warn">{preview.perluMigrasi} dokumen</b></div>
              {preview.tanpaNik > 0 && (
                <div className="kv"><span>Tidak ada NIK (dilewati)</span><b className="bad">{preview.tanpaNik} dokumen</b></div>
              )}
            </div>

            {preview.perluMigrasi === 0 ? (
              <div className="a-alert ok" role="status">
                <CircleCheck className="i" />
                <div>Semua dokumen sudah menggunakan NIK sebagai ID. Tidak perlu migrasi.</div>
              </div>
            ) : (
              <>
                {previewItems.length > 0 && (
                  <MigTable tinggi={256} head={<><th>Nama</th><th className="cx">ID Lama</th><th className="cy">ID Baru (NIK)</th><th className="r">Aksi</th></>}>
                    {previewItems.map(item => (
                      <tr key={item.id} className={item.done ? 'fin' : undefined}>
                        <td className="nmx">{item.nama || '—'}</td>
                        <td className="x">{item.id}</td>
                        <td className="y">{item.nik}</td>
                        <td className="r">
                          <MigRowBtn done={item.done} loading={item.loading} onClick={() => handleOneItem(item.id, item.nik)} label="Migrasi" />
                        </td>
                      </tr>
                    ))}
                  </MigTable>
                )}
                <div className="mig-ft">
                  <Button variant="outline" onClick={() => setStatus('idle')}>Batal</Button>
                  <Button variant="gold" onClick={handleMigrate}>Migrasi Semua ({preview.perluMigrasi})</Button>
                </div>
              </>
            )}

            <Button variant="ghost" onClick={() => setStatus('idle')}>Kembali</Button>
          </>
        )}

        {status === 'done' && (
          <MigDone title="Migrasi selesai!" onBack={() => router.push('/penduduk')} backLabel="Lihat Data Penduduk">
            <MigResultBox>
              <p><b>{result.dipindah}</b> dokumen berhasil dimigrasi ke ID = NIK</p>
              <p style={{ color: 'var(--ink-3)' }}><b>{result.dilewati}</b> dokumen dilewati (sudah benar atau tanpa NIK)</p>
              {result.gagal > 0 && (
                <p style={{ color: 'var(--bad)' }}><b>{result.gagal}</b> dokumen gagal (mis. NIK-nya sudah dipakai dokumen lain: jalankan Fix Duplikat dulu)</p>
              )}
            </MigResultBox>
          </MigDone>
        )}

        {status === 'error' && <MigError title="Terjadi kesalahan" msg={errorMsg} onRetry={() => setStatus('idle')} />}
      </MigLayout>
    </AppShell>
  )
}
