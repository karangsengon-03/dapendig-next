'use client'

import { useState } from 'react'
import { Baby, HeartCrack, Plus, Trash2, RotateCcw } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { LahirForm, MeninggalForm } from '@/components/vital/VitalForm'
import { useLahir, useMeninggal, useDeleteLahir, useDeleteMeninggal, useRollbackMeninggal } from '@/hooks/useVital'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'

function formatTanggal(tgl: string) {
  if (!tgl) return '-'
  const d = new Date(tgl + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

type Tab = 'lahir' | 'meninggal'

export default function VitalPage() {
  const [tab, setTab] = useState<Tab>('lahir')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; nik_target: string; nama: string; hub_asli: string; no_kk: string } | null>(null)

  const { isAdmin, isOperator } = useAuthStore()
  const { toast } = useToast()
  const canAdd = isOperator()
  const canDelete = isAdmin()

  const { data: dataLahir, isLoading: loadingLahir } = useLahir()
  const { data: dataMeninggal, isLoading: loadingMeninggal } = useMeninggal()
  const { mutate: hapusLahir, isPending: pendingHapusLahir } = useDeleteLahir()
  const { mutate: hapusMeninggal, isPending: pendingHapusMeninggal } = useDeleteMeninggal()
  const { mutate: rollback, isPending: pendingRollback } = useRollbackMeninggal()

  const isLoading = tab === 'lahir' ? loadingLahir : loadingMeninggal
  const isPendingDelete = tab === 'lahir' ? pendingHapusLahir : pendingHapusMeninggal

  function handleDelete() {
    if (!deleteTarget) return
    const nama = deleteTarget.nama
    if (tab === 'lahir') {
      hapusLahir({ id: deleteTarget.id, nama }, {
        onSuccess: () => { setDeleteTarget(null); toast(`Data kelahiran ${nama} dihapus`, 'success') },
        onError: () => { toast('Gagal menghapus data kelahiran', 'error') },
      })
    } else {
      hapusMeninggal({ id: deleteTarget.id, nama }, {
        onSuccess: () => { setDeleteTarget(null); toast(`Data kematian ${nama} dihapus`, 'success') },
        onError: () => { toast('Gagal menghapus data kematian', 'error') },
      })
    }
  }

  function handleRollback() {
    if (!rollbackTarget) return
    rollback({
      meninggalId: rollbackTarget.id,
      nik_target: rollbackTarget.nik_target,
      nama: rollbackTarget.nama,
      hub_asli: rollbackTarget.hub_asli,
      no_kk: rollbackTarget.no_kk,
    }, {
      onSuccess: () => { setRollbackTarget(null); toast(`Kematian ${rollbackTarget.nama} dibatalkan`, 'success') },
      onError: () => { toast('Gagal membatalkan kematian', 'error') },
    })
  }

  return (
    <AppShell title="Vital">
      <div className="p-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-100">Data Vital</h1>
          {canAdd && (
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-1" />
              {showForm ? 'Tutup' : 'Tambah'}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setTab('lahir'); setShowForm(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'lahir'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Baby className="w-4 h-4" /> Kelahiran
          </button>
          <button
            onClick={() => { setTab('meninggal'); setShowForm(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'meninggal'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartCrack className="w-4 h-4" /> Kematian
          </button>
        </div>

        {/* Form inline */}
        {showForm && tab === 'lahir' && (
          <LahirForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        )}
        {showForm && tab === 'meninggal' && (
          <MeninggalForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        )}

        {/* Tabel Kelahiran */}
        {tab === 'lahir' && (
          <>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !dataLahir?.length ? (
              <p className="text-slate-500 text-sm text-center py-12">Belum ada data kelahiran</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400 text-left">
                      <th className="px-3 py-3 w-10">No</th>
                      <th className="px-3 py-3">Nama Bayi</th>
                      <th className="px-3 py-3">JK</th>
                      <th className="px-3 py-3">Tanggal Lahir</th>
                      <th className="px-3 py-3">Ayah</th>
                      <th className="px-3 py-3">Ibu</th>
                      <th className="px-3 py-3">RT/RW</th>
                      {canDelete && <th className="px-3 py-3 w-12"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dataLahir.map((row, i) => (
                      <tr key={row.id} className="border-t border-slate-700/50 hover:bg-slate-800/40">
                        <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-3 text-slate-100 font-medium">{row.nama_lengkap}</td>
                        <td className="px-3 py-3">
                          <Badge variant={row.jenis_kelamin === 'Laki-laki' ? 'default' : 'secondary'} className="text-xs">
                            {row.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-slate-300">{formatTanggal(row.tanggal_lahir)}</td>
                        <td className="px-3 py-3 text-slate-400">{row.nama_ayah}</td>
                        <td className="px-3 py-3 text-slate-400">{row.nama_ibu}</td>
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

        {/* Tabel Kematian */}
        {tab === 'meninggal' && (
          <>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !dataMeninggal?.length ? (
              <p className="text-slate-500 text-sm text-center py-12">Belum ada data kematian</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400 text-left">
                      <th className="px-3 py-3 w-10">No</th>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">NIK</th>
                      <th className="px-3 py-3">Tanggal Meninggal</th>
                      <th className="px-3 py-3">Hubungan Keluarga</th>
                      <th className="px-3 py-3">Sebab Kematian</th>
                      {canDelete && <th className="px-3 py-3 w-12"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dataMeninggal.map((row, i) => (
                      <tr key={row.id} className="border-t border-slate-700/50 hover:bg-slate-800/40">
                        <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-3 text-slate-100 font-medium">{row.nama}</td>
                        <td className="px-3 py-3 text-slate-400 font-mono text-xs">{row.nik_target}</td>
                        <td className="px-3 py-3 text-slate-300">{formatTanggal(row.tanggal)}</td>
                        <td className="px-3 py-3 text-slate-400">{row.hub_asli}</td>
                        <td className="px-3 py-3 text-slate-400">{row.sebab}</td>
                        {canDelete && (
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setRollbackTarget({ id: row.id, nik_target: row.nik_target, nama: row.nama, hub_asli: row.hub_asli, no_kk: row.no_kk })}
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

        {/* Delete Confirm Dialog */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-base font-semibold text-slate-100 mb-2">Hapus Data Vital</h3>
              <p className="text-sm text-slate-400 mb-5">
                Hapus data <span className="font-medium text-slate-200">{deleteTarget.nama}</span>? Data yang dihapus tidak dapat dikembalikan.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isPendingDelete}>
                  Batal
                </Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isPendingDelete}>
                  {isPendingDelete ? 'Menghapus...' : 'Hapus'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {rollbackTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-base font-semibold text-slate-100 mb-2">Batalkan Kematian?</h3>
              <p className="text-sm text-slate-400 mb-5">
                Status penduduk <span className="font-medium text-slate-200">{rollbackTarget.nama}</span> akan dikembalikan ke <span className="text-emerald-400">Aktif</span> dan data kematian ini akan dihapus.
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
