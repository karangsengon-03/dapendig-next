'use client'

import { useState } from 'react'
import { collection, getDocs, writeBatch, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { AksesDitolakAdmin } from '@/components/ui/akses-ditolak'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { CalendarDays, Info } from 'lucide-react'
import { MigLayout, MigBox, MigPrimary, MigEmpty, MigSummary, MigTable, MigRowBtn, MigDone, MigError, MigGagal } from '@/components/pengaturan/migrasi-parts'
import { tanggalDariNik } from '@/lib/nik-tanggal'
import { selisihHari } from '@/lib/tanggal-lokal'
import { tulisBertahap, pesanGalatTulis } from '@/lib/tulis-bertahap'

// ── Tanggal lahir dari NIK ────────────────────────────────────────────────────
// Penguraian (termasuk penentuan abad 19xx/20xx) ada di lib/nik-tanggal.ts.
// Bila abad tidak bisa dipastikan, baris ditandai "Perlu dicek manual" dan TIDAK diperbaiki otomatis.

type ItemResult = {
  /** ID dokumen sebenarnya di Firestore (dokumen lama ber-ID acak: ID ≠ NIK). Dipakai untuk menulis. */
  id: string
  nik: string
  nama: string
  lama: string
  /** Tanggal hasil baca NIK; kosong bila ambigu. */
  baru: string
  /** Abad tidak bisa dipastikan: tidak ikut perbaikan otomatis. */
  ambigu: boolean
  kandidat: string[]
}

type RunResult = {
  diperbaiki: number
  sudahBenar: number
  tidakBisaDeteksi: number
  perluDicek: number
  gagal: { nama: string; pesan: string }[]
  items: ItemResult[]
}

// ── Halaman utama ─────────────────────────────────────────────────────────────

export default function FixTanggalLahirPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<'idle' | 'preview' | 'loading' | 'done' | 'error'>('idle')
  const [previewData, setPreviewData] = useState<ItemResult[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [doneItems, setDoneItems] = useState<Set<string>>(new Set())
  const [statistik, setStatistik] = useState({ sudahBenar: 0, tidakBisaDeteksi: 0 })

  // Tahap 1: scan dan preview dulu sebelum eksekusi
  async function handlePreview() {
    if (!isAdmin()) return
    setStatus('loading')
    setProgressCurrent(0)
    setProgressTotal(0)
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      setProgressTotal(snap.docs.length)
      const toFix: ItemResult[] = []
      let sudahBenar = 0
      let tidakBisaDeteksi = 0

      for (let i = 0; i < snap.docs.length; i++) {
        setProgressCurrent(i + 1)
        const d = snap.docs[i]
        const data = d.data()
        const nik = String(data.nik ?? d.id ?? '').trim()
        const tanggalLahir = String(data.tanggal_lahir ?? '').trim()
        const nama = String(data.nama_lengkap ?? '').trim()

        const hasil = tanggalDariNik(nik, tanggalLahir)
        if (hasil.status === 'tidak-valid') { tidakBisaDeteksi++; continue }   // NIK tidak bisa di-decode → skip
        if (hasil.status === 'pasti') {
          if (hasil.tanggal === tanggalLahir) { sudahBenar++; continue }        // sudah benar → skip
          toFix.push({ id: d.id, nik, nama, lama: tanggalLahir, baru: hasil.tanggal, ambigu: false, kandidat: [] })
        } else {
          // Abad tidak bisa dipastikan: tampil untuk dicek manual, tidak ikut perbaikan otomatis
          toFix.push({ id: d.id, nik, nama, lama: tanggalLahir, baru: '', ambigu: true, kandidat: hasil.kandidat })
        }
      }

      setStatistik({ sudahBenar, tidakBisaDeteksi })
      setPreviewData(toFix)
      setStatus('preview')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  // Tahap 2: eksekusi fix setelah user konfirmasi.
  // Menulis ke ID dokumen sebenarnya (d.id). Dokumen yang tidak ada dihitung gagal untuk barisnya saja;
  // proses lanjut dan tidak ada dokumen baru dibuat (hanya update).
  async function handleFix() {
    if (!isAdmin()) return
    const target = previewData.filter((x) => !x.ambigu && !doneItems.has(x.id))
    if (target.length === 0) return
    setStatus('loading')
    setProgressCurrent(0)
    setProgressTotal(target.length)

    try {
      const hasil = await tulisBertahap(target, {
        tulisBatch: async (kelompok) => {
          const batch = writeBatch(db)
          for (const it of kelompok) batch.update(doc(db, 'penduduk', it.id), { tanggal_lahir: it.baru })
          await batch.commit()
        },
        tulisSatu: (it) => updateDoc(doc(db, 'penduduk', it.id), { tanggal_lahir: it.baru }),
        onProgress: (n) => setProgressCurrent(n),
      })

      // Ringkasan dari hasil nyata: satuan (sebelumnya) + massal (barusan) yang benar-benar berhasil
      const selesai = new Set([...doneItems, ...hasil.berhasil.map((x) => x.id)])
      setDoneItems(selesai)
      const items = previewData.filter((x) => selesai.has(x.id))

      setResult({
        diperbaiki: items.length,
        sudahBenar: statistik.sudahBenar,
        tidakBisaDeteksi: statistik.tidakBisaDeteksi,
        perluDicek: previewData.filter((x) => x.ambigu).length,
        gagal: hasil.gagal.map((g) => ({ nama: g.item.nama || g.item.nik, pesan: g.pesan })),
        items,
      })
      setStatus('done')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  async function handleOneItem(item: ItemResult) {
    if (!isAdmin() || item.ambigu) return
    setLoadingItems(prev => new Set([...prev, item.id]))
    try {
      await updateDoc(doc(db, 'penduduk', item.id), { tanggal_lahir: item.baru })
      setDoneItems(prev => new Set([...prev, item.id]))
    } catch (e) {
      toast(`Gagal memperbaiki tanggal lahir: ${pesanGalatTulis(e)}`, 'error')
    }
    setLoadingItems(prev => { const s = new Set(prev); s.delete(item.id); return s })
  }

  function formatTgl(s: string) {
    if (!s) return '—'
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return s
    const BULAN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${parseInt(m[3])} ${BULAN[parseInt(m[2])]} ${m[1]}`
  }

  const jumlahBisa = previewData.filter((x) => !x.ambigu).length
  const jumlahAmbigu = previewData.length - jumlahBisa
  const jumlahPending = previewData.filter((x) => !x.ambigu && !doneItems.has(x.id)).length

  // Hanya admin; peran lain tidak melihat isi halaman (handler di bawah tetap memeriksa isAdmin() juga)
  if (!isAdmin()) {
    return (
      <AppShell title="Fix Tanggal Lahir">
        <AksesDitolakAdmin />
      </AppShell>
    )
  }

  return (
    <AppShell title="Fix Tanggal Lahir">
      <MigLayout
        title="Fix Tanggal Lahir (Timezone Bug)"
        desc="Koreksi tanggal yang bergeser akibat konversi UTC"
        before={
          <div className="a-alert warn">
            <Info className="i" />
            <div>
              <b>Apa yang dilakukan migrasi ini?</b>
              <p style={{ margin: '0 0 6px' }}>
                Bug lama menyebabkan tanggal lahir bergeser <span className="mig-code">-1 hari</span> setiap kali data disimpan
                (akibat konversi timezone WIB→UTC). Data yang disimpan berkali-kali bisa bergeser <span className="mig-code">-2</span>, <span className="mig-code">-3</span> hari, dst.
              </p>
              <p style={{ margin: '0 0 6px' }}>
                Migrasi ini membaca tanggal lahir <strong>langsung dari NIK</strong> sebagai sumber kebenaran,
                lalu membandingkan dengan yang tersimpan. Jika berbeda → diperbaiki. Jika sudah cocok (termasuk yang sudah kamu betulkan manual) → dilewati.
              </p>
              <p style={{ margin: 0 }}>
                Tahun di NIK hanya 2 digit. Bila abad (19xx atau 20xx) tidak bisa dipastikan, barisnya ditandai <strong>Perlu dicek manual</strong> dan
                tidak diubah otomatis.
              </p>
            </div>
          </div>
        }
      >
        {status === 'idle' && (
          <>
            <MigBox title="Cara kerja">
              <p>① Scan seluruh koleksi <span className="mig-code">penduduk</span></p>
              <p>② Ekstrak tanggal lahir dari digit 7–12 NIK</p>
              <p>③ Bandingkan dengan <span className="mig-code">tanggal_lahir</span> di Firestore</p>
              <p>④ Tampilkan preview daftar yang perlu diperbaiki</p>
              <p>⑤ Eksekusi hanya setelah kamu konfirmasi</p>
            </MigBox>
            <MigPrimary tone="gold" onClick={handlePreview} disabled={!isAdmin()} icon={<CalendarDays className="i" />}>Scan & Preview Data Bermasalah</MigPrimary>
          </>
        )}

        {status === 'loading' && (
          <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diperiksa" />
        )}

        {status === 'preview' && (
          previewData.length === 0 ? (
            <MigEmpty
              title="Semua tanggal lahir sudah benar!"
              text="Tidak ditemukan perbedaan antara tanggal di Firestore dengan NIK."
              onBack={() => router.push('/pengaturan')}
              backLabel="Kembali ke Pengaturan"
            />
          ) : (
            <>
              <MigSummary>
                <span>Ditemukan <b className="r">{previewData.length}</b> data bermasalah</span>
                <small>
                  {jumlahAmbigu > 0
                    ? `${jumlahBisa} bisa diperbaiki · ${jumlahAmbigu} perlu dicek manual`
                    : 'Cek sebelum konfirmasi'}
                </small>
              </MigSummary>

              <MigTable tinggi={288} head={<><th>Nama</th><th>NIK</th><th className="cx">Tersimpan (salah)</th><th className="cy">Dari NIK (benar)</th><th>Selisih</th><th className="r">Aksi</th></>}>
                {previewData.map((item) => {
                  const selisih = selisihHari(item.lama, item.baru)   // null bila tanggal tersimpan kosong/tak terbaca
                  return (
                    <tr key={item.id}>
                      <td className="nmx">{item.nama || '—'}</td>
                      <td className="mn">{item.nik}</td>
                      <td className="x">{formatTgl(item.lama) || '—'}</td>
                      {item.ambigu ? (
                        <>
                          <td className="sub">{item.kandidat.map(formatTgl).join(' atau ')}</td>
                          <td><Badge variant="warning">Perlu dicek manual</Badge></td>
                        </>
                      ) : (
                        <>
                          <td className="y">{formatTgl(item.baru)}</td>
                          <td>
                            {selisih === null ? '—' : (
                              <span className={`mig-chip ${selisih > 0 ? 'up' : 'dn'}`}>
                                {selisih > 0 ? '+' : ''}{selisih}h
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="r">
                        <MigRowBtn done={doneItems.has(item.id)} loading={loadingItems.has(item.id)} disabled={item.ambigu} onClick={() => handleOneItem(item)} label="Perbaiki" />
                      </td>
                    </tr>
                  )
                })}
              </MigTable>

              <div className="mig-ft">
                <Button variant="outline" onClick={() => setStatus('idle')}>Batal</Button>
                <Button variant="success" onClick={handleFix} disabled={jumlahPending === 0}>Perbaiki {jumlahPending} Data</Button>
              </div>
            </>
          )
        )}

        {status === 'done' && result && (
          <MigDone title="Perbaikan selesai!" onBack={() => router.push('/pengaturan')}>
            <div className="mig-stats">
              <div className="ok"><b>{result.diperbaiki}</b><span>diperbaiki</span></div>
              <div className="inf"><b>{result.sudahBenar}</b><span>sudah benar</span></div>
              <div><b>{result.tidakBisaDeteksi}</b><span>NIK tidak valid</span></div>
            </div>

            <MigGagal daftar={result.gagal} />
            {result.perluDicek > 0 && (
              <div className="a-alert warn" role="status">
                <Info className="i" />
                <div>
                  <strong>{result.perluDicek} data perlu dicek manual</strong>
                  <p style={{ margin: 0 }}>Abad tahun lahir tidak bisa dipastikan dari NIK, jadi tidak diubah. Periksa satu per satu lewat Edit penduduk.</p>
                </div>
              </div>
            )}

            {result.diperbaiki > 0 && (
              <MigTable tinggi={192} head={<><th>Nama</th><th className="cx">Lama</th><th className="cy">Dikoreksi ke</th></>}>
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td className="nmx">{item.nama || item.nik}</td>
                    <td className="x">{formatTgl(item.lama)}</td>
                    <td className="y">{formatTgl(item.baru)}</td>
                  </tr>
                ))}
              </MigTable>
            )}
          </MigDone>
        )}

        {status === 'error' && <MigError title="Terjadi kesalahan" msg={errorMsg} mono onRetry={() => setStatus('idle')} />}
      </MigLayout>
    </AppShell>
  )
}
