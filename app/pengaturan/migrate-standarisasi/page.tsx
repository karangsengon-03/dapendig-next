'use client'

import { useState } from 'react'
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'

// ── Pemetaan Pendidikan ───────────────────────────────────────────────────────
// Standar: Permendagri 109/2019 (tidak berubah di Permendagri 6/2026)
const PENDIDIKAN_MAP: Record<string, string> = {
  // Variasi singkat dari SIAK lama
  'Belum Tamat SD': 'Belum Tamat SD/Sederajat',
  'SD': 'Tamat SD/Sederajat',
  'SD/Sederajat': 'Tamat SD/Sederajat',
  'Tamat SD': 'Tamat SD/Sederajat',
  'SMP': 'SMP/Sederajat',
  'SLTP': 'SMP/Sederajat',
  'SLTP/Sederajat': 'SMP/Sederajat',
  'SMA': 'SMA/Sederajat',
  'SLTA': 'SMA/Sederajat',
  'SLTA/Sederajat': 'SMA/Sederajat',
  'D1': 'Diploma I/II',
  'D2': 'Diploma I/II',
  'D1/D2': 'Diploma I/II',
  'Diploma I': 'Diploma I/II',
  'Diploma II': 'Diploma I/II',
  'D3': 'Diploma III',
  'Akademi/Diploma III/S. Muda': 'Diploma III',
  'D4': 'Diploma IV/Strata I',
  'S1': 'Diploma IV/Strata I',
  'D4/S1': 'Diploma IV/Strata I',
  'Diploma IV': 'Diploma IV/Strata I',
  'S2': 'Strata II',
  'S3': 'Strata III',
}

// ── Pemetaan Pekerjaan ────────────────────────────────────────────────────────
// Perubahan utama Permendagri 6/2026: PNS/PPPK → ASN
const PEKERJAAN_MAP: Record<string, string> = {
  // PNS/PPPK → ASN sesuai Permendagri 6/2026
  'Pegawai Negeri Sipil': 'ASN (PNS)',
  'PNS': 'ASN (PNS)',
  'PPPK': 'ASN (PPPK)',
  'ASN PNS': 'ASN (PNS)',
  'ASN PPPK': 'ASN (PPPK)',
  // Standarisasi lainnya
  'Ibu Rumah Tangga': 'Mengurus Rumah Tangga',
  'IBU RUMAH TANGGA': 'Mengurus Rumah Tangga',
  'MENGURUS RUMAH TANGGA': 'Mengurus Rumah Tangga',
  'POLRI': 'Kepolisian RI',
  'KEPOLISIAN RI': 'Kepolisian RI',
  'TNI': 'Tentara Nasional Indonesia',
  'TENTARA NASIONAL INDONESIA': 'Tentara Nasional Indonesia',
  'Guru/Dosen': 'Guru',
  'GURU/DOSEN': 'Guru',
  'GURU': 'Guru',
  'BIDAN': 'Bidan',
  'Tukang/Montir': 'Mekanik',
  'TUKANG/MONTIR': 'Mekanik',
  'PEDAGANG': 'Pedagang',
  'PETANI/PEKEBUN': 'Petani/Pekebun',
  'BURUH HARIAN LEPAS': 'Buruh Harian Lepas',
  'BURUH TANI/PERKEBUNAN': 'Buruh Tani/Perkebunan',
  'KARYAWAN SWASTA': 'Karyawan Swasta',
  'KARYAWAN HONORER': 'Karyawan Honorer',
  'PELAJAR/MAHASISWA': 'Pelajar/Mahasiswa',
  'PERANGKAT DESA': 'Perangkat Desa',
  'WIRASWASTA': 'Wiraswasta',
  'TIDAK/BELUM BEKERJA': 'Tidak/Belum Bekerja',
  'BELUM/TIDAK BEKERJA': 'Tidak/Belum Bekerja',
}

const ALL_MAPS = [
  { label: 'Pendidikan', map: PENDIDIKAN_MAP, field: 'pendidikan' },
  { label: 'Pekerjaan', map: PEKERJAAN_MAP, field: 'pekerjaan' },
] as const

export default function MigrateStandarisasiPage() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{
    pendidikanUpdated: number
    pekerjaanUpdated: number
    skipped: number
    detail: Record<string, number>
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleMigrate() {
    if (!isAdmin()) return
    setStatus('loading')
    try {
      const snap = await getDocs(collection(db, 'penduduk'))
      const detail: Record<string, number> = {}
      let pendidikanUpdated = 0
      let pekerjaanUpdated = 0
      let skipped = 0
      let batchSize = 0
      let batch = writeBatch(db)

      for (const d of snap.docs) {
        const data = d.data()
        const updates: Record<string, string> = {}

        for (const { map, field, label } of ALL_MAPS) {
          const current = String(data[field] ?? '').trim()
          const mapped = map[current] ?? map[current.toUpperCase()]
          if (mapped && mapped !== current) {
            updates[field] = mapped
            const key = `${label}: "${current}" → "${mapped}"`
            detail[key] = (detail[key] ?? 0) + 1
            if (field === 'pendidikan') pendidikanUpdated++
            else pekerjaanUpdated++
          }
        }

        if (Object.keys(updates).length > 0) {
          batch.update(doc(db, 'penduduk', d.id), updates)
          batchSize++
          if (batchSize >= 499) {
            await batch.commit()
            batch = writeBatch(db)
            batchSize = 0
          }
        } else {
          skipped++
        }
      }

      if (batchSize > 0) await batch.commit()
      setResult({ pendidikanUpdated, pekerjaanUpdated, skipped, detail })
      setStatus('done')
    } catch (e) {
      setErrorMsg(String(e))
      setStatus('error')
    }
  }

  const CONTOH = [
    ['Pekerjaan', 'Pegawai Negeri Sipil', 'ASN (PNS)'],
    ['Pekerjaan', 'PNS', 'ASN (PNS)'],
    ['Pekerjaan', 'Ibu Rumah Tangga', 'Mengurus Rumah Tangga'],
    ['Pekerjaan', 'TNI', 'Tentara Nasional Indonesia'],
    ['Pekerjaan', 'POLRI', 'Kepolisian RI'],
    ['Pekerjaan', 'Guru/Dosen', 'Guru'],
    ['Pendidikan', 'SD/Sederajat', 'Tamat SD/Sederajat'],
    ['Pendidikan', 'D3', 'Diploma III'],
    ['Pendidikan', 'D4/S1', 'Diploma IV/Strata I'],
    ['Pendidikan', 'SLTP/Sederajat', 'SMP/Sederajat'],
    ['Pendidikan', 'SLTA/Sederajat', 'SMA/Sederajat'],
  ]

  return (
    <AppShell title="Standarisasi Data">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0">
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-base font-semibold text-slate-100">Standarisasi Pendidikan & Pekerjaan</h1>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-300">
              Sesuai Permendagri 6/2026 & Permendagri 109/2019
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Memetakan semua nilai lama ke standar resmi administrasi kependudukan.
              Data yang sudah sesuai tidak akan diubah.
            </p>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex flex-col gap-1.5 max-h-52 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">Contoh pemetaan</p>
              {CONTOH.map(([cat, old, nw]) => (
                <div key={old} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 w-16 shrink-0 text-[10px]">{cat}</span>
                  <span className="text-rose-400 font-mono">{old}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-emerald-400 font-mono">{nw}</span>
                </div>
              ))}
            </div>
          </div>

          {status === 'idle' && (
            <button onClick={handleMigrate} disabled={!isAdmin()}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white transition-colors disabled:opacity-40">
              Mulai Standarisasi
            </button>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-2.5 py-2">
              <Loader2 size={18} className="text-sky-400 animate-spin" />
              <p className="text-sm text-slate-400">Memproses semua data penduduk...</p>
            </div>
          )}

          {status === 'done' && result && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                <p className="text-sm font-medium text-emerald-400">Standarisasi selesai!</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex flex-col gap-1.5">
                <p className="text-sm text-slate-300">
                  Pendidikan diperbarui: <span className="font-bold text-emerald-400">{result.pendidikanUpdated}</span> data
                </p>
                <p className="text-sm text-slate-300">
                  Pekerjaan diperbarui: <span className="font-bold text-emerald-400">{result.pekerjaanUpdated}</span> data
                </p>
                <p className="text-sm text-slate-500 mt-0.5">
                  Tidak perlu diubah: <span className="font-medium">{result.skipped}</span> data
                </p>
              </div>
              {Object.keys(result.detail).length > 0 && (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex flex-col gap-1 max-h-48 overflow-y-auto">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Rincian perubahan</p>
                  {Object.entries(result.detail).sort((a, b) => b[1] - a[1]).map(([label, count]) => (
                    <p key={label} className="text-xs text-slate-400">
                      · {label}: <span className="text-slate-200 font-medium">{count} orang</span>
                    </p>
                  ))}
                </div>
              )}
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
                <p className="text-sm font-medium text-rose-400">Gagal standarisasi</p>
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
