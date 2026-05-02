'use client'

import { useState } from 'react'
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { MigrasiProgress } from '@/components/ui/migrasi-progress'
import { CheckCircle, AlertCircle, ArrowLeft, Info, Calendar } from 'lucide-react'

// ── Helper: extract tanggal lahir dari NIK ──────────────────────────────────
// NIK format: [2 prov][2 kab][2 kec][2 tgl][2 bln][2 thn][4 urut]
// Perempuan: tgl di-encode +40 (misal tgl 5 → 45)
// Tahun: 2 digit, <= 24 → 2000+yy, > 24 → 1900+yy

function parseTanggalDariNIK(nik: string): string | null {
  const s = String(nik ?? '').trim()
  if (s.length < 12) return null

  const dd_raw = parseInt(s.substring(6, 8), 10)
  const mm_str = s.substring(8, 10)
  const yy = parseInt(s.substring(10, 12), 10)
  const mm = parseInt(mm_str, 10)

  if (dd_raw === 0 || mm === 0 || mm > 12) return null

  const dd = dd_raw > 40 ? dd_raw - 40 : dd_raw
  if (dd < 1 || dd > 31) return null

  const fullYear = yy <= 24 ? 2000 + yy : 1900 + yy
  const isoStr = `${fullYear}-${mm_str.padStart(2, '0')}-${String(dd).padStart(2, '0')}`

  // Validasi tanggal benar-benar ada (misal 31 Feb tidak ada)
  const d = new Date(isoStr + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  // Double-check: getMonth bisa auto-overflow ke bulan berikutnya jika tanggal invalid
  if (d.getMonth() + 1 !== mm || d.getDate() !== dd) return null

  return isoStr
}

type ItemResult = {
  nik: string
  nama: string
  lama: string
  baru: string
}

type RunResult = {
  diperbaiki: number
  sudahBenar: number
  tidakBisaDeteksi: number
  items: ItemResult[]
}

// ── Halaman utama ─────────────────────────────────────────────────────────────

export default function FixTanggalLahirPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'preview' | 'loading' | 'done' | 'error'>('idle')
  const [previewData, setPreviewData] = useState<ItemResult[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)

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

      for (let i = 0; i < snap.docs.length; i++) {
        setProgressCurrent(i + 1)
        const d = snap.docs[i]
        const data = d.data()
        const nik = String(data.nik ?? d.id ?? '').trim()
        const tanggalLahir = String(data.tanggal_lahir ?? '').trim()
        const nama = String(data.nama_lengkap ?? '').trim()

        const dariNIK = parseTanggalDariNIK(nik)
        if (!dariNIK) continue             // NIK tidak bisa di-decode → skip
        if (dariNIK === tanggalLahir) continue  // sudah benar → skip

        toFix.push({ nik, nama, lama: tanggalLahir, baru: dariNIK })
      }

      setPreviewData(toFix)
      setStatus('preview')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  // Tahap 2: eksekusi fix setelah user konfirmasi
  async function handleFix() {
    if (!isAdmin()) return
    setStatus('loading')
    setProgressCurrent(0)
    setProgressTotal(previewData.length)

    try {
      let batch = writeBatch(db)
      let batchSize = 0
      let diperbaiki = 0

      for (let i = 0; i < previewData.length; i++) {
        setProgressCurrent(i + 1)
        const { nik, baru } = previewData[i]
        batch.update(doc(db, 'penduduk', nik), { tanggal_lahir: baru })
        batchSize++
        diperbaiki++

        if (batchSize >= 499) {
          await batch.commit()
          batch = writeBatch(db)
          batchSize = 0
        }
      }
      if (batchSize > 0) await batch.commit()

      // Hitung total scan ulang dari snap yang sudah ada
      const snap = await getDocs(collection(db, 'penduduk'))
      let sudahBenar = 0
      let tidakBisaDeteksi = 0
      for (const d of snap.docs) {
        const data = d.data()
        const nik = String(data.nik ?? d.id ?? '').trim()
        const dariNIK = parseTanggalDariNIK(nik)
        if (!dariNIK) { tidakBisaDeteksi++; continue }
        sudahBenar++
      }
      sudahBenar -= diperbaiki  // yang baru diperbaiki tidak dihitung 'sudah benar'

      setResult({ diperbaiki, sudahBenar, tidakBisaDeteksi, items: previewData })
      setStatus('done')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  function formatTgl(s: string) {
    if (!s) return '—'
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return s
    const BULAN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${parseInt(m[3])} ${BULAN[parseInt(m[2])]} ${m[1]}`
  }

  return (
    <AppShell title="Fix Tanggal Lahir">
      <div className="max-w-2xl mx-auto flex flex-col gap-4 pb-10">

        {/* Header */}
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-slate-100">Fix Tanggal Lahir (Timezone Bug)</h1>
            <p className="text-xs text-slate-500">Koreksi tanggal yang bergeser akibat konversi UTC</p>
          </div>
        </div>

        {/* Penjelasan */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
          <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-amber-300">Apa yang dilakukan migrasi ini?</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bug lama menyebabkan tanggal lahir bergeser <span className="text-rose-400 font-mono">-1 hari</span> setiap kali data disimpan
              (akibat konversi timezone WIB→UTC). Data yang disimpan berkali-kali bisa bergeser <span className="text-rose-400 font-mono">-2</span>, <span className="text-rose-400 font-mono">-3</span> hari, dst.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Migrasi ini membaca tanggal lahir <span className="text-emerald-400 font-semibold">langsung dari NIK</span> sebagai sumber kebenaran,
              lalu membandingkan dengan yang tersimpan. Jika berbeda → diperbaiki. Jika sudah cocok (termasuk yang sudah kamu betulkan manual) → dilewati.
            </p>
          </div>
        </div>

        {/* Panel utama */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-5 flex flex-col gap-4">

          {/* IDLE: tombol scan */}
          {status === 'idle' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-slate-200">Cara kerja</p>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex flex-col gap-2 text-xs text-slate-400">
                  <p>① Scan seluruh koleksi <span className="font-mono text-slate-300">penduduk</span></p>
                  <p>② Ekstrak tanggal lahir dari digit 7–12 NIK</p>
                  <p>③ Bandingkan dengan <span className="font-mono text-slate-300">tanggal_lahir</span> di Firestore</p>
                  <p>④ Tampilkan preview daftar yang perlu diperbaiki</p>
                  <p>⑤ Eksekusi hanya setelah kamu konfirmasi</p>
                </div>
              </div>
              <button onClick={handlePreview} disabled={!isAdmin()}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-semibold text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                <Calendar size={15} />
                Scan & Preview Data Bermasalah
              </button>
            </div>
          )}

          {/* LOADING */}
          {status === 'loading' && (
            <MigrasiProgress current={progressCurrent} total={progressTotal} label="dokumen diperiksa" />
          )}

          {/* PREVIEW: tampilkan sebelum fix */}
          {status === 'preview' && (
            <div className="flex flex-col gap-4">
              {previewData.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle size={32} className="text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-400">Semua tanggal lahir sudah benar!</p>
                  <p className="text-xs text-slate-500 text-center">Tidak ditemukan perbedaan antara tanggal di Firestore dengan NIK.</p>
                  <button onClick={() => router.push('/pengaturan')}
                    className="mt-1 px-4 py-2 rounded-xl bg-slate-700/60 border border-white/[0.08] text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                    Kembali ke Pengaturan
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-200">
                      Ditemukan <span className="text-rose-400">{previewData.length}</span> data bermasalah
                    </p>
                    <p className="text-xs text-slate-500">Cek sebelum konfirmasi</p>
                  </div>

                  {/* Tabel preview */}
                  <div className="overflow-x-auto rounded-xl border border-white/[0.06] max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[#0d1424] z-10">
                        <tr className="border-b border-white/[0.06]">
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Nama</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">NIK</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-rose-500 uppercase tracking-wider">Tersimpan (salah)</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Dari NIK (benar)</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Selisih</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((item) => {
                          const selisih = item.lama && item.baru
                            ? Math.round((new Date(item.baru + 'T00:00:00').getTime() - new Date(item.lama + 'T00:00:00').getTime()) / 86400000)
                            : 0
                          return (
                            <tr key={item.nik} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                              <td className="px-3 py-2 text-slate-300 font-medium truncate max-w-[120px]">{item.nama || '—'}</td>
                              <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{item.nik}</td>
                              <td className="px-3 py-2 text-rose-400 font-mono">{formatTgl(item.lama) || '—'}</td>
                              <td className="px-3 py-2 text-emerald-400 font-mono">{formatTgl(item.baru)}</td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${selisih > 0 ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {selisih > 0 ? '+' : ''}{selisih}h
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2.5">
                    <button onClick={() => setStatus('idle')}
                      className="flex-1 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-slate-400 hover:bg-white/[0.06] transition-colors">
                      Batal
                    </button>
                    <button onClick={handleFix}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-colors">
                      Perbaiki {previewData.length} Data
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* DONE */}
          {status === 'done' && result && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                <p className="text-sm font-semibold text-emerald-400">Perbaikan selesai!</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex flex-col gap-0.5">
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">{result.diperbaiki}</p>
                  <p className="text-[10px] text-slate-400">diperbaiki</p>
                </div>
                <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-3 flex flex-col gap-0.5">
                  <p className="text-lg font-bold text-sky-400 tabular-nums">{result.sudahBenar}</p>
                  <p className="text-[10px] text-slate-400">sudah benar</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col gap-0.5">
                  <p className="text-lg font-bold text-slate-400 tabular-nums">{result.tidakBisaDeteksi}</p>
                  <p className="text-[10px] text-slate-400">NIK tidak valid</p>
                </div>
              </div>

              {result.diperbaiki > 0 && (
                <div className="rounded-xl border border-white/[0.06] overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#0d1424]">
                      <tr className="border-b border-white/[0.06]">
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Nama</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-rose-500 uppercase tracking-wider">Lama</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Dikoreksi ke</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((item) => (
                        <tr key={item.nik} className="border-b border-white/[0.04] last:border-0">
                          <td className="px-3 py-2 text-slate-300 truncate max-w-[140px]">{item.nama || item.nik}</td>
                          <td className="px-3 py-2 text-rose-400 font-mono">{formatTgl(item.lama)}</td>
                          <td className="px-3 py-2 text-emerald-400 font-mono">{formatTgl(item.baru)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button onClick={() => router.push('/pengaturan')}
                className="w-full py-2.5 rounded-xl bg-slate-700/60 border border-white/[0.08] text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                Kembali ke Pengaturan
              </button>
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <p className="text-sm font-medium text-rose-400">Terjadi kesalahan</p>
              </div>
              <p className="text-xs text-slate-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 font-mono">{errorMsg}</p>
              <button onClick={() => setStatus('idle')} className="text-sm text-sky-400 hover:text-sky-300">
                Coba lagi
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 text-center">Hanya dapat diakses oleh admin.</p>
      </div>
    </AppShell>
  )
}
