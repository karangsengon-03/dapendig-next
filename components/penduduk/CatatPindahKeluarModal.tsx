'use client'

import { useState } from 'react'
import { X, LogOut } from 'lucide-react'
import { useCatatPindahKeluar } from '@/hooks/usePenduduk'
import { useToast } from '@/components/ui/toast'
import type { Penduduk } from '@/types'

interface Props {
  penduduk: Penduduk
  onClose: () => void
  onSuccess: () => void
}

export function CatatPindahKeluarModal({ penduduk, onClose, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [tujuan, setTujuan] = useState('')
  const [alasan, setAlasan] = useState('')
  const [tanggal, setTanggal] = useState(today)
  const [error, setError] = useState('')

  const mutation = useCatatPindahKeluar()
  const { toast } = useToast()

  async function handleSubmit() {
    if (!tujuan.trim()) { setError('Tujuan pindah wajib diisi'); return }
    if (!tanggal) { setError('Tanggal wajib diisi'); return }
    setError('')
    try {
      await mutation.mutateAsync({
        pendudukId: penduduk.id,
        nik: penduduk.nik,
        nama: penduduk.nama_lengkap,
        no_kk: penduduk.no_kk,
        tujuan: tujuan.trim(),
        alasan: alasan.trim(),
        tanggal,
      })
      toast(`${penduduk.nama_lengkap} berhasil dicatat pindah keluar`, 'success')
      onSuccess()
    } catch {
      toast('Gagal mencatat pindah keluar', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
              <LogOut size={16} className="text-sky-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-100 text-sm">Catat Pindah Keluar</p>
              <p className="text-xs text-slate-500 mt-0.5">{penduduk.nama_lengkap} · {penduduk.nik || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5">
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Tujuan Pindah <span className="text-rose-400">*</span></label>
            <input
              type="text"
              value={tujuan}
              onChange={(e) => setTujuan(e.target.value)}
              placeholder="Contoh: Desa Wonorejo, Kec. Prajekan"
              className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Alasan <span className="text-slate-600">(opsional)</span></label>
            <input
              type="text"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: Mengikuti suami"
              className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Tanggal <span className="text-rose-400">*</span></label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* Actions */}
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
            className="flex-1 px-4 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
