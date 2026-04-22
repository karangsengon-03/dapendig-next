'use client'

import { useState } from 'react'
import { Baby, HeartCrack, Plus, Trash2, RotateCcw, Pencil, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { LahirForm, MeninggalForm } from '@/components/vital/VitalForm'
import {
  useLahir, useMeninggal,
  useDeleteLahir, useDeleteMeninggal,
  useRollbackMeninggal,
  useEditLahir, useEditMeninggal,
} from '@/hooks/useVital'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import type { Lahir, Meninggal } from '@/types'

function formatTanggal(tgl: string) {
  if (!tgl) return '-'
  return new Date(tgl + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Modal Edit Kelahiran ──────────────────────────────────────────────────────
function EditLahirModal({ row, onClose }: { row: Lahir; onClose: () => void }) {
  const { mutateAsync, isPending } = useEditLahir()
  const { toast } = useToast()
  const [form, setForm] = useState({
    nama_lengkap: row.nama_lengkap ?? '',
    nik: row.nik ?? '',
    no_kk: row.no_kk ?? '',
    tanggal_lahir: row.tanggal_lahir ?? '',
    tempat_lahir: row.tempat_lahir ?? '',
    nama_ayah: row.nama_ayah ?? '',
    nama_ibu: row.nama_ibu ?? '',
    rt: row.rt ?? '',
    rw: row.rw ?? '',
  })
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    try {
      await mutateAsync({ id: row.id, data: form })
      toast('Data kelahiran diperbarui', 'success')
      onClose()
    } catch { toast('Gagal menyimpan', 'error') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-100 text-sm">Edit Data Kelahiran</p>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300"><X size={15}/></button>
        </div>
        {[
          ['Nama Lengkap','nama_lengkap','text'],['NIK','nik','text'],['No. KK','no_kk','text'],
          ['Tanggal Lahir','tanggal_lahir','date'],['Tempat Lahir','tempat_lahir','text'],
          ['Nama Ayah','nama_ayah','text'],['Nama Ibu','nama_ibu','text'],
          ['RT','rt','text'],['RW','rw','text'],
        ].map(([label, key, type]) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">{label}</label>
            <input type={type} value={form[key as keyof typeof form]}
              onChange={e => set(key, e.target.value)}
              className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"/>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} className="flex-1">
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Edit Kematian ───────────────────────────────────────────────────────
function EditMeninggalModal({ row, onClose }: { row: Meninggal; onClose: () => void }) {
  const { mutateAsync, isPending } = useEditMeninggal()
  const { toast } = useToast()
  const [form, setForm] = useState({
    nama: row.nama ?? '', nik_target: row.nik_target ?? '',
    no_kk: row.no_kk ?? '', tanggal: row.tanggal ?? '', sebab: row.sebab ?? '',
  })
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    try {
      await mutateAsync({ id: row.id, data: form })
      toast('Data kematian diperbarui', 'success')
      onClose()
    } catch { toast('Gagal menyimpan', 'error') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-5 w-full max-w-md flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-100 text-sm">Edit Data Kematian</p>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300"><X size={15}/></button>
        </div>
        {[
          ['Nama','nama','text'],['NIK','nik_target','text'],['No. KK','no_kk','text'],
          ['Tanggal Meninggal','tanggal','date'],['Sebab','sebab','text'],
        ].map(([label, key, type]) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">{label}</label>
            <input type={type} value={form[key as keyof typeof form]}
              onChange={e => set(key, e.target.value)}
              className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"/>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} className="flex-1">
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Tab = 'lahir' | 'meninggal'

export default function VitalPage() {
  const [tab, setTab] = useState<Tab>('lahir')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; nik_target: string; nama: string; hub_asli: string; no_kk: string } | null>(null)
  const [editLahir, setEditLahir] = useState<Lahir | null>(null)
  const [editMeninggal, setEditMeninggal] = useState<Meninggal | null>(null)

  const { isAdmin, isOperator } = useAuthStore()
  const { toast } = useToast()
  const canAdd = isOperator()
  const canDelete = isAdmin()
  const canEdit = isOperator()

  const { data: dataLahir, isLoading: loadingLahir } = useLahir()
  const { data: dataMeninggal, isLoading: loadingMeninggal } = useMeninggal()
  const { mutate: hapusLahir, isPending: pendingHapusLahir } = useDeleteLahir()
  const { mutate: hapusMeninggal, isPending: pendingHapusMeninggal } = useDeleteMeninggal()
  const { mutate: rollback, isPending: pendingRollback } = useRollbackMeninggal()

  const isLoading = tab === 'lahir' ? loadingLahir : loadingMeninggal
  const isPendingDelete = tab === 'lahir' ? pendingHapusLahir : pendingHapusMeninggal

  function handleDelete() {
    if (!deleteTarget) return
    const { id, nama } = deleteTarget
    if (tab === 'lahir') {
      hapusLahir({ id, nama }, { onSuccess: () => { setDeleteTarget(null); toast(`Data kelahiran ${nama} dihapus`, 'success') }, onError: () => toast('Gagal menghapus', 'error') })
    } else {
      hapusMeninggal({ id, nama }, { onSuccess: () => { setDeleteTarget(null); toast(`Data kematian ${nama} dihapus`, 'success') }, onError: () => toast('Gagal menghapus', 'error') })
    }
  }

  function handleRollback() {
    if (!rollbackTarget) return
    rollback({ meninggalId: rollbackTarget.id, nik_target: rollbackTarget.nik_target, nama: rollbackTarget.nama, hub_asli: rollbackTarget.hub_asli, no_kk: rollbackTarget.no_kk }, {
      onSuccess: () => { setRollbackTarget(null); toast(`Kematian ${rollbackTarget.nama} dibatalkan`, 'success') },
      onError: () => toast('Gagal membatalkan', 'error'),
    })
  }

  return (
    <AppShell title="Vital">
      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-slate-100">Data Vital</h1>
          {canAdd && (
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-1" />{showForm ? 'Tutup' : 'Tambah'}
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {(['lahir','meninggal'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setShowForm(false) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
              {t === 'lahir' ? <><Baby className="w-4 h-4"/>Kelahiran</> : <><HeartCrack className="w-4 h-4"/>Kematian</>}
            </button>
          ))}
        </div>

        {showForm && tab === 'lahir' && <LahirForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}
        {showForm && tab === 'meninggal' && <MeninggalForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}

        {/* Tabel Kelahiran */}
        {tab === 'lahir' && (
          isLoading ? <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          : !dataLahir?.length ? <p className="text-slate-500 text-sm text-center py-12">Belum ada data kelahiran</p>
          : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    {['No','Nama Bayi','NIK','JK','Tgl Lahir','Ayah','Ibu','RT/RW',''].map(h=>(
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataLahir.map((row, i) => (
                    <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-3 text-slate-500 text-xs">{i+1}</td>
                      <td className="px-3 py-3 text-slate-100 font-medium">{row.nama_lengkap}</td>
                      <td className="px-3 py-3 text-slate-400 font-mono text-xs">{row.nik||'—'}</td>
                      <td className="px-3 py-3">
                        <Badge variant={row.jenis_kelamin==='Laki-laki'?'default':'secondary'} className="text-xs">
                          {row.jenis_kelamin==='Laki-laki'?'L':'P'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{formatTanggal(row.tanggal_lahir)}</td>
                      <td className="px-3 py-3 text-slate-400">{row.nama_ayah}</td>
                      <td className="px-3 py-3 text-slate-400">{row.nama_ibu}</td>
                      <td className="px-3 py-3 text-slate-400 text-xs">RT {row.rt}/RW {row.rw}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button onClick={() => setEditLahir(row)} className="p-1.5 text-amber-400 hover:text-amber-300" title="Edit">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleteTarget({ id: row.id, nama: row.nama_lengkap })} className="p-1.5 text-rose-400 hover:text-rose-300" title="Hapus">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Tabel Kematian */}
        {tab === 'meninggal' && (
          isLoading ? <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          : !dataMeninggal?.length ? <p className="text-slate-500 text-sm text-center py-12">Belum ada data kematian</p>
          : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    {['No','Nama','NIK','No. KK','Tgl Meninggal','Hub. Keluarga','Sebab',''].map(h=>(
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataMeninggal.map((row, i) => (
                    <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-3 text-slate-500 text-xs">{i+1}</td>
                      <td className="px-3 py-3 text-slate-100 font-medium">{row.nama}</td>
                      <td className="px-3 py-3 text-slate-400 font-mono text-xs">{row.nik_target||'—'}</td>
                      <td className="px-3 py-3 text-slate-400 font-mono text-xs">{row.no_kk||'—'}</td>
                      <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{formatTanggal(row.tanggal)}</td>
                      <td className="px-3 py-3 text-slate-400 text-xs">{row.hub_asli||'—'}</td>
                      <td className="px-3 py-3 text-slate-400">{row.sebab||'—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button onClick={() => setEditMeninggal(row)} className="p-1.5 text-amber-400 hover:text-amber-300" title="Edit">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setRollbackTarget({ id: row.id, nik_target: row.nik_target, nama: row.nama, hub_asli: row.hub_asli, no_kk: row.no_kk })}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300" title="Batalkan & Kembalikan">
                              <RotateCcw className="w-3.5 h-3.5"/>
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleteTarget({ id: row.id, nama: row.nama })} className="p-1.5 text-rose-400 hover:text-rose-300" title="Hapus">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Dialogs */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
              <p className="font-semibold text-slate-100 mb-2">Hapus Data?</p>
              <p className="text-sm text-slate-400 mb-5">Hapus data <span className="font-medium text-slate-200">{deleteTarget.nama}</span>?</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isPendingDelete}>Batal</Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isPendingDelete}>
                  {isPendingDelete ? 'Menghapus...' : 'Hapus'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {rollbackTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
              <p className="font-semibold text-slate-100 mb-2">Batalkan Kematian?</p>
              <p className="text-sm text-slate-400 mb-5">Status <span className="font-medium text-slate-200">{rollbackTarget.nama}</span> akan dikembalikan ke Aktif.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setRollbackTarget(null)} disabled={pendingRollback}>Batal</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleRollback} disabled={pendingRollback}>
                  {pendingRollback ? 'Memproses...' : 'Ya, Batalkan'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {editLahir && <EditLahirModal row={editLahir} onClose={() => setEditLahir(null)} />}
        {editMeninggal && <EditMeninggalModal row={editMeninggal} onClose={() => setEditMeninggal(null)} />}
      </div>
    </AppShell>
  )
}
