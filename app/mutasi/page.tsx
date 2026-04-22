'use client'

import { useState } from 'react'
import { UserMinus, UserPlus, Plus, Trash2, RotateCcw } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MutasiKeluarForm, MutasiMasukForm } from '@/components/mutasi/MutasiForm'
import {
  useMutasiKeluar,
  useMutasiMasuk,
  useDeleteMutasiKeluar,
  useDeleteMutasiMasuk,
  useRollbackMutasiKeluar,
} from '@/hooks/useMutasi'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'

function formatTanggal(tgl: string) {
  if (!tgl) return '-'
  const d = new Date(tgl + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

type Tab = 'keluar' | 'masuk'

export default function MutasiPage() {
  const [tab, setTab] = useState<Tab>('keluar')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; nik_target: string; nama: string } | null>(null)

  const { isAdmin, isOperator } = useAuthStore()
  const { toast } = useToast()
  const canAdd = isOperator()
  const canDelete = isAdmin()

  const { data: dataKeluar, isLoading: loadingKeluar } = useMutasiKeluar()
  const { data: dataMasuk, isLoading: loadingMasuk } = useMutasiMasuk()
  const { mutate: hapusKeluar, isPending: pendingHapusKeluar } = useDeleteMutasiKeluar()
  const { mutate: hapusMasuk, isPending: pendingHapusMasuk } = useDeleteMutasiMasuk()
  const { mutate: rollback, isPending: pendingRollback } = useRollbackMutasiKeluar()

  const isLoading = tab === 'keluar' ? loadingKeluar : loadingMasuk
  const isPendingDelete = tab === 'keluar' ? pendingHapusKeluar : pendingHapusMasuk

  function handleDelete() {
    if (!deleteTarget) return
    const nama = deleteTarget.nama
    if (tab === 'keluar') {
      hapusKeluar({ id: deleteTarget.id, nama }, {
        onSuccess: () => { setDeleteTarget(null); toast(`Data mutasi ${nama} dihapus`, 'success') },
        onError: () => { toast('Gagal menghapus data mutasi', 'error') },
      })
    } else {
      hapusMasuk({ id: deleteTarget.id, nama }, {
        onSuccess: () => { setDeleteTarget(null); toast(`Data mutasi ${nama} dihapus`, 'success') },
        onError: () => { toast('Gagal menghapus data mutasi', 'error') },
      })
    }
  }

  function handleRollback() {
    if (!rollbackTarget) return
    rollback({ mutasiId: rollbackTarget.id, nik_target: rollbackTarget.nik_target, nama: rollbackTarget.nama }, {
      onSuccess: () => { setRollbackTarget(null); toast(`Mutasi keluar ${rollbackTarget.nama} dibatalkan`, 'success') },
      onError: () => { toast('Gagal membatalkan mutasi', 'error') },
    })
  }

  return (
    <AppShell title="Mutasi">
      <div className="p-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-100">Mutasi Penduduk</h1>
          {canAdd && (
            <Button size="sm" onClick={() => { setShowForm(!showForm) }}>
              <Plus className="w-4 h-4 mr-1" />
              {showForm ? 'Tutup' : 'Tambah'}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setTab('keluar'); setShowForm(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'keluar'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserMinus className="w-4 h-4" /> Pindah Keluar
          </button>
          <button
            onClick={() => { setTab('masuk'); setShowForm(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'masuk'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Pindah Masuk
          </button>
        </div>

        {/* Form inline */}
        {showForm && tab === 'keluar' && (
          <MutasiKeluarForm
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        )}
        {showForm && tab === 'masuk' && (
          <MutasiMasukForm
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Tabel Pindah Keluar */}
        {tab === 'keluar' && (
          <>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !dataKeluar?.length ? (
              <p className="text-slate-500 text-sm text-center py-12">Belum ada data pindah keluar</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400 text-left">
                      <th className="px-3 py-3 w-10">No</th>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">NIK</th>
                      <th className="px-3 py-3">Tanggal</th>
                      <th className="px-3 py-3">Tujuan</th>
                      <th className="px-3 py-3">Alasan</th>
                      {canDelete && <th className="px-3 py-3 w-12"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dataKeluar.map((row, i) => (
                      <tr key={row.id} className="border-t border-slate-700/50 hover:bg-slate-800/40">
                        <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-3 text-slate-100 font-medium">{row.nama}</td>
                        <td className="px-3 py-3 text-slate-400 font-mono text-xs">{row.nik_target}</td>
                        <td className="px-3 py-3 text-slate-300">{formatTanggal(row.tanggal)}</td>
                        <td className="px-3 py-3 text-slate-300">{row.tujuan}</td>
                        <td className="px-3 py-3 text-slate-400">{row.alasan || '-'}</td>
                        {canDelete && (
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setRollbackTarget({ id: row.id, nik_target: row.nik_target, nama: row.nama })}
                                className="text-emerald-400 hover:text-emerald-300 p-1"
                                title="Batalkan & Kembalikan"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ id: row.id, nama: row.nama })}
                                className="text-red-400 hover:text-red-300 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Tabel Pindah Masuk */}
        {tab === 'masuk' && (
          <>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !dataMasuk?.length ? (
              <p className="text-slate-500 text-sm text-center py-12">Belum ada data pindah masuk</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400 text-left">
                      <th className="px-3 py-3 w-10">No</th>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">NIK</th>
                      <th className="px-3 py-3">Tanggal Masuk</th>
                      <th className="px-3 py-3">Asal Daerah</th>
                      <th className="px-3 py-3">RT/RW</th>
                      {canDelete && <th className="px-3 py-3 w-12"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dataMasuk.map((row, i) => (
                      <tr key={row.id} className="border-t border-slate-700/50 hover:bg-slate-800/40">
                        <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-3 text-slate-100 font-medium">{row.nama_lengkap}</td>
                        <td className="px-3 py-3 text-slate-400 font-mono text-xs">{row.nik}</td>
                        <td className="px-3 py-3 text-slate-300">{formatTanggal(row.tanggal)}</td>
                        <td className="px-3 py-3 text-slate-300">{row.asal_daerah}</td>
                        <td className="px-3 py-3 text-slate-400">RT {row.rt} / RW {row.rw}</td>
                        {canDelete && (
                          <td className="px-3 py-3">
                            <button
                              onClick={() => setDeleteTarget({ id: row.id, nama: row.nama_lengkap })}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Delete Confirm Dialog */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-base font-semibold text-slate-100 mb-2">Hapus Data Mutasi</h3>
              <p className="text-sm text-slate-400 mb-5">
                Hapus data <span className="font-medium text-slate-200">{deleteTarget.nama}</span>? Data yang dihapus tidak dapat dikembalikan.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isPendingDelete}>
                  Batal
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={isPendingDelete}
                >
                  {isPendingDelete ? 'Menghapus...' : 'Hapus'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {rollbackTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-base font-semibold text-slate-100 mb-2">Batalkan Mutasi Keluar?</h3>
              <p className="text-sm text-slate-400 mb-5">
                Status penduduk <span className="font-medium text-slate-200">{rollbackTarget.nama}</span> akan dikembalikan ke <span className="text-emerald-400">Aktif</span> dan data mutasi ini akan dihapus.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" size="sm" onClick={() => setRollbackTarget(null)} disabled={pendingRollback}>
                  Batal
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleRollback} disabled={pendingRollback}>
                  {pendingRollback ? 'Memproses...' : 'Ya, Batalkan'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
