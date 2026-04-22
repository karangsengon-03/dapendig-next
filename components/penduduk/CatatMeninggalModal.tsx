'use client'

import { useState } from 'react'
import { X, HeartCrack, AlertTriangle } from 'lucide-react'
import { useCatatMeninggal } from '@/hooks/usePenduduk'
import { useToast } from '@/components/ui/toast'
import type { Penduduk } from '@/types'

interface Props {
  penduduk: Penduduk
  allPenduduk: Penduduk[]
  onClose: () => void
  onSuccess: () => void
}

export function CatatMeninggalModal({ penduduk, allPenduduk, onClose, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [tanggal, setTanggal] = useState(today)
  const [sebab, setSebab] = useState('')
  const [error, setError] = useState('')

  const mutation = useCatatMeninggal()
  const { toast } = useToast()

  async function handleSubmit() {
    if (!tanggal) { setError('Tanggal wajib diisi'); return }
    setError('')
    try {
      await mutation.mutateAsync({
        pendudukId: penduduk.id,
        nik: penduduk.nik,
        nama: penduduk.nama_lengkap,
        no_kk: penduduk.no_kk,
        hubungan_keluarga: penduduk.hubungan_keluarga,
        tanggal,
        sebab: sebab.trim(),
        allPenduduk,
      })
      toast(`${penduduk.nama_lengkap} berhasil dicatat meninggal`, 'success')
      onSuccess()
    } catch {
      toast('Gagal mencatat kematian', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-500/15 border border-slate-500/20 flex items-center justify-center">
              <HeartCrack size={16} className="text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-100 text-sm">Catat Kematian</p>
              <p className="text-xs text-slate-500 mt-0.5">{penduduk.nama_lengkap} · {penduduk.nik || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5">
            <X size={15} />
          </button>
        </div>

        {penduduk.hubungan_keluarga === 'Kepala Keluarga' && (
          <div className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-400">Penduduk ini adalah Kepala Keluarga. Sistem akan otomatis menentukan penggantinya (Istri/Suami/Anak tertua).</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Tanggal Meninggal <span className="text-rose-400">*</span></label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Sebab Meninggal <span className="text-slate-600">(opsional)</span></label>
            <input
              type="text"
              value={sebab}
              onChange={(e) => setSebab(e.target.value)}
              placeholder="Contoh: Sakit"
              className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:text-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-600 text-white text-sm font-medium hover:bg-slate-500 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
