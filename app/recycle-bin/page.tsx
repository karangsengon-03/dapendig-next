'use client'

import { useState } from 'react'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecycleBinList, useRestorePenduduk, useHapusPermanent, useHapusSemuaRecycleBin } from '@/hooks/useRecycleBin'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import type { RecycleBinItem } from '@/types'

function formatTanggal(ts: unknown): string {
  if (!ts) return '-'
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return new Date((ts as { seconds: number }).seconds * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }
  return '-'
}

export default function RecycleBinPage() {
  const { data = [], isLoading } = useRecycleBinList()
  const restoreMutation = useRestorePenduduk()
  const hapusMutation = useHapusPermanent()
  const hapusSemuaMutation = useHapusSemuaRecycleBin()
  const { isAdmin } = useAuthStore()
  const { toast } = useToast()

  const [confirmTarget, setConfirmTarget] = useState<RecycleBinItem | null>(null)
  const [confirmHapusSemua, setConfirmHapusSemua] = useState(false)

  async function handleRestore(item: RecycleBinItem) {
    try {
      await restoreMutation.mutateAsync({ recycleId: item.id, dataAsli: item.data_asli })
      toast(`${item.data_asli.nama_lengkap} berhasil dipulihkan`, 'success')
    } catch {
      toast('Gagal memulihkan data', 'error')
    }
  }

  async function handleHapusPermanent() {
    if (!confirmTarget) return
    try {
      await hapusMutation.mutateAsync({ recycleId: confirmTarget.id, nama: confirmTarget.data_asli.nama_lengkap })
      toast(`${confirmTarget.data_asli.nama_lengkap} dihapus permanen`, 'success')
      setConfirmTarget(null)
    } catch {
      toast('Gagal menghapus data', 'error')
      setConfirmTarget(null)
    }
  }

  async function handleHapusSemua() {
    try {
      await hapusSemuaMutation.mutateAsync()
      toast('Semua data di tempat sampah telah dihapus', 'success')
      setConfirmHapusSemua(false)
    } catch {
      toast('Gagal menghapus semua data', 'error')
      setConfirmHapusSemua(false)
    }
  }

  const canAdmin = isAdmin()

  return (
    <AppShell title="Tempat Sampah">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-slate-100">Tempat Sampah</h1>
            <p className="text-xs text-slate-500">Data penduduk yang telah dihapus</p>
          </div>
          {canAdmin && data.length > 0 && (
            <button
              onClick={() => setConfirmHapusSemua(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline text-xs">Hapus Semua</span>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] overflow-hidden">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
                <Trash2 size={24} className="text-slate-600" />
              </div>
              <p className="text-sm text-slate-500">Tempat sampah kosong</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Lengkap</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">NIK</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">No. KK</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">RT/RW</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dihapus Oleh</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tgl Hapus</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => (
                    <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-200 font-medium">{item.data_asli.nama_lengkap}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.data_asli.nik || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.data_asli.no_kk || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{item.data_asli.rt}/{item.data_asli.rw}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{item.dihapus_oleh}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatTanggal(item.dihapus_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestore(item)}
                            disabled={restoreMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw size={12} />
                            Pulihkan
                          </button>
                          {canAdmin && (
                            <button
                              onClick={() => setConfirmTarget(item)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs hover:bg-rose-500/20 transition-colors"
                            >
                              <Trash2 size={12} />
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirm hapus permanen */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-100 text-sm">Hapus Permanen?</p>
                <p className="text-xs text-slate-500 mt-0.5">Data tidak bisa dipulihkan</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              Hapus <span className="font-semibold text-white">{confirmTarget.data_asli.nama_lengkap}</span> secara permanen?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleHapusPermanent}
                disabled={hapusMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {hapusMutation.isPending ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm hapus semua */}
      {confirmHapusSemua && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-100 text-sm">Hapus Semua?</p>
                <p className="text-xs text-slate-500 mt-0.5">{data.length} data akan dihapus permanen</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmHapusSemua(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleHapusSemua}
                disabled={hapusSemuaMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {hapusSemuaMutation.isPending ? 'Menghapus...' : 'Hapus Semua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
