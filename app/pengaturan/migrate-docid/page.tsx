'use client'

import { useState } from 'react'
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react'

export default function MigrateDocIdPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'preview' | 'loading' | 'done' | 'error'>('idle')
  const [preview, setPreview] = useState<{ sudahBenar: number; perluMigrasi: number; tanpaNik: number }>({ sudahBenar: 0, perluMigrasi: 0, tanpaNik: 0 })
  const [result, setResult] = useState<{ dipindah: number; dilewati: number; gagal: number }>({ dipindah: 0, dilewati: 0, gagal: 0 })
  const [errorMsg, setErrorMsg] = useState('')

  async function handlePreview() {
    setStatus('loading')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      let sudahBenar = 0, perluMigrasi = 0, tanpaNik = 0
      for (const d of snap.docs) {
        const nik = String(d.data().nik ?? '').trim()
        if (!nik) { tanpaNik++; continue }
        if (d.id === nik) sudahBenar++
        else perluMigrasi++
      }
      setPreview({ sudahBenar, perluMigrasi, tanpaNik })
      setStatus('preview')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  async function handleMigrate() {
    setStatus('loading')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      let dipindah = 0, dilewati = 0, gagal = 0

      for (const d of snap.docs) {
        const nik = String(d.data().nik ?? '').trim()

        // Skip jika tidak ada NIK atau ID sudah benar
        if (!nik) { dilewati++; continue }
        if (d.id === nik) { dilewati++; continue }

        try {
          // 1. Buat dokumen baru dengan ID = NIK (copy semua data)
          await setDoc(doc(db, 'penduduk', nik), d.data())
          // 2. Hapus dokumen lama
          await deleteDoc(doc(db, 'penduduk', d.id))
          dipindah++
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

  return (
    <AppShell title="Migrasi Document ID">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0">
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-base font-semibold text-slate-100">Migrasi ID Dokumen → NIK</h1>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-300">Seragamkan ID dokumen penduduk</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Proses ini memindahkan semua dokumen penduduk yang ID-nya masih acak ke format baru
              menggunakan <span className="font-semibold text-slate-300">NIK</span> sebagai ID dokumen.
              Data tidak akan hilang — hanya ID dokumen yang diperbarui.
            </p>
          </div>

          {/* Warning */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex gap-2.5">
            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              Lakukan <span className="font-semibold">ekspor data</span> terlebih dahulu sebelum migrasi sebagai backup.
              Proses ini tidak dapat dibatalkan.
            </p>
          </div>

          {status === 'idle' && (
            <button onClick={handlePreview} disabled={!isAdmin()}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white transition-colors disabled:opacity-40">
              Cek Data Sebelum Migrasi
            </button>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-2.5 py-2">
              <Loader2 size={18} className="text-sky-400 animate-spin" />
              <p className="text-sm text-slate-400">Memproses...</p>
            </div>
          )}

          {status === 'preview' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex flex-col gap-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Hasil Pemeriksaan</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Sudah pakai NIK sebagai ID</span>
                  <span className="font-semibold text-emerald-400">{preview.sudahBenar} dokumen</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Perlu dimigrasi</span>
                  <span className="font-semibold text-amber-400">{preview.perluMigrasi} dokumen</span>
                </div>
                {preview.tanpaNik > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Tidak ada NIK (dilewati)</span>
                    <span className="font-semibold text-rose-400">{preview.tanpaNik} dokumen</span>
                  </div>
                )}
              </div>

              {preview.perluMigrasi === 0 ? (
                <div className="flex items-center gap-2 py-2">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <p className="text-sm text-emerald-400">Semua dokumen sudah menggunakan NIK sebagai ID. Tidak perlu migrasi.</p>
                </div>
              ) : (
                <button onClick={handleMigrate}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-semibold text-white transition-colors">
                  Mulai Migrasi {preview.perluMigrasi} Dokumen
                </button>
              )}

              <button onClick={() => setStatus('idle')} className="text-xs text-slate-500 hover:text-slate-300 text-center">
                Kembali
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                <p className="text-sm font-medium text-emerald-400">Migrasi selesai!</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex flex-col gap-1.5">
                <p className="text-sm text-slate-300">
                  <span className="font-bold text-emerald-400">{result.dipindah}</span> dokumen berhasil dimigrasi ke ID = NIK
                </p>
                <p className="text-sm text-slate-500">
                  <span className="font-medium">{result.dilewati}</span> dokumen dilewati (sudah benar atau tanpa NIK)
                </p>
                {result.gagal > 0 && (
                  <p className="text-sm text-rose-400">
                    <span className="font-medium">{result.gagal}</span> dokumen gagal
                  </p>
                )}
              </div>
              <button onClick={() => router.push('/penduduk')}
                className="w-full py-2.5 rounded-xl bg-slate-700/60 border border-white/[0.08] text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                Lihat Data Penduduk
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <p className="text-sm font-medium text-rose-400">Terjadi kesalahan</p>
              </div>
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
