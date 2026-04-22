'use client'

import { useState } from 'react'
import { UserMinus, UserPlus, Plus, Trash2, RotateCcw, Pencil, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MutasiKeluarForm, MutasiMasukForm } from '@/components/mutasi/MutasiForm'
import {
  useMutasiKeluar, useMutasiMasuk,
  useDeleteMutasiKeluar, useDeleteMutasiMasuk,
  useRollbackMutasiKeluar,
  useEditMutasiKeluar, useEditMutasiMasuk,
} from '@/hooks/useMutasi'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import type { MutasiKeluar, MutasiMasuk } from '@/types'

function formatTanggal(tgl: string) {
  if (!tgl) return '-'
  return new Date(tgl + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function EditKeluarModal({ row, onClose }: { row: MutasiKeluar; onClose: () => void }) {
  const { mutateAsync, isPending } = useEditMutasiKeluar()
  const { toast } = useToast()
  const [form, setForm] = useState({ nama: row.nama??'', nik_target: row.nik_target??'', no_kk: row.no_kk??'', tujuan: row.tujuan??'', alasan: row.alasan??'', tanggal: row.tanggal??'' })
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }
  async function save() {
    try { await mutateAsync({ id: row.id, data: form }); toast('Data diperbarui', 'success'); onClose() }
    catch { toast('Gagal menyimpan', 'error') }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-5 w-full max-w-md flex flex-col gap-3">
        <div className="flex items-center justify-between"><p className="font-semibold text-slate-100 text-sm">Edit Pindah Keluar</p><button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300"><X size={15}/></button></div>
        {[['Nama','nama','text'],['NIK','nik_target','text'],['No. KK','no_kk','text'],['Tujuan','tujuan','text'],['Alasan','alasan','text'],['Tanggal','tanggal','date']].map(([label,key,type])=>(
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">{label}</label>
            <input type={type} value={form[key as keyof typeof form]} onChange={e=>set(key,e.target.value)} className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"/>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
          <Button size="sm" onClick={save} disabled={isPending} className="flex-1">{isPending?'Menyimpan...':'Simpan'}</Button>
        </div>
      </div>
    </div>
  )
}

function EditMasukModal({ row, onClose }: { row: MutasiMasuk; onClose: () => void }) {
  const { mutateAsync, isPending } = useEditMutasiMasuk()
  const { toast } = useToast()
  const [form, setForm] = useState({ nama_lengkap: row.nama_lengkap??'', nik: row.nik??'', no_kk: row.no_kk??'', asal_daerah: row.asal_daerah??'', tanggal: row.tanggal??'', rt: row.rt??'', rw: row.rw??'' })
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }
  async function save() {
    try { await mutateAsync({ id: row.id, data: form }); toast('Data diperbarui', 'success'); onClose() }
    catch { toast('Gagal menyimpan', 'error') }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-5 w-full max-w-md flex flex-col gap-3">
        <div className="flex items-center justify-between"><p className="font-semibold text-slate-100 text-sm">Edit Pindah Masuk</p><button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300"><X size={15}/></button></div>
        {[['Nama','nama_lengkap','text'],['NIK','nik','text'],['No. KK','no_kk','text'],['Asal Daerah','asal_daerah','text'],['Tanggal','tanggal','date'],['RT','rt','text'],['RW','rw','text']].map(([label,key,type])=>(
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">{label}</label>
            <input type={type} value={form[key as keyof typeof form]} onChange={e=>set(key,e.target.value)} className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"/>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
          <Button size="sm" onClick={save} disabled={isPending} className="flex-1">{isPending?'Menyimpan...':'Simpan'}</Button>
        </div>
      </div>
    </div>
  )
}

type Tab = 'keluar' | 'masuk'

export default function MutasiPage() {
  const [tab, setTab] = useState<Tab>('keluar')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; nik_target: string; nama: string } | null>(null)
  const [editKeluar, setEditKeluar] = useState<MutasiKeluar | null>(null)
  const [editMasuk, setEditMasuk] = useState<MutasiMasuk | null>(null)

  const { isAdmin, isOperator } = useAuthStore()
  const { toast } = useToast()
  const canAdd = isOperator()
  const canDelete = isAdmin()
  const canEdit = isOperator()

  const { data: dataKeluar, isLoading: loadingKeluar } = useMutasiKeluar()
  const { data: dataMasuk, isLoading: loadingMasuk } = useMutasiMasuk()
  const { mutate: hapusKeluar, isPending: pendingHapusKeluar } = useDeleteMutasiKeluar()
  const { mutate: hapusMasuk, isPending: pendingHapusMasuk } = useDeleteMutasiMasuk()
  const { mutate: rollback, isPending: pendingRollback } = useRollbackMutasiKeluar()

  const isLoading = tab === 'keluar' ? loadingKeluar : loadingMasuk
  const isPendingDelete = tab === 'keluar' ? pendingHapusKeluar : pendingHapusMasuk

  function handleDelete() {
    if (!deleteTarget) return
    const { id, nama } = deleteTarget
    if (tab === 'keluar') {
      hapusKeluar({ id, nama }, { onSuccess: () => { setDeleteTarget(null); toast(`Data mutasi ${nama} dihapus`, 'success') }, onError: () => toast('Gagal menghapus', 'error') })
    } else {
      hapusMasuk({ id, nama }, { onSuccess: () => { setDeleteTarget(null); toast(`Data mutasi ${nama} dihapus`, 'success') }, onError: () => toast('Gagal menghapus', 'error') })
    }
  }

  function handleRollback() {
    if (!rollbackTarget) return
    rollback({ mutasiId: rollbackTarget.id, nik_target: rollbackTarget.nik_target, nama: rollbackTarget.nama }, {
      onSuccess: () => { setRollbackTarget(null); toast(`Mutasi ${rollbackTarget.nama} dibatalkan`, 'success') },
      onError: () => toast('Gagal membatalkan', 'error'),
    })
  }

  return (
    <AppShell title="Mutasi">
      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-slate-100">Mutasi Penduduk</h1>
          {canAdd && <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1"/>{showForm?'Tutup':'Tambah'}</Button>}
        </div>

        <div className="flex gap-2">
          {(['keluar','masuk'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setShowForm(false) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t?'bg-sky-500 text-white':'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
              {t==='keluar' ? <><UserMinus className="w-4 h-4"/>Pindah Keluar</> : <><UserPlus className="w-4 h-4"/>Pindah Masuk</>}
            </button>
          ))}
        </div>

        {showForm && tab === 'keluar' && <MutasiKeluarForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}
        {showForm && tab === 'masuk' && <MutasiMasukForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}

        {/* Tabel Keluar */}
        {tab === 'keluar' && (
          isLoading ? <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          : !dataKeluar?.length ? <p className="text-slate-500 text-sm text-center py-12">Belum ada data pindah keluar</p>
          : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    {['No','Nama','NIK','No. KK','Tanggal','Tujuan','Alasan',''].map(h=>(
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataKeluar.map((row,i) => (
                    <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-3 text-slate-500 text-xs">{i+1}</td>
                      <td className="px-3 py-3 text-slate-100 font-medium">{row.nama}</td>
                      <td className="px-3 py-3 text-slate-400 font-mono text-xs">{row.nik_target||'—'}</td>
                      <td className="px-3 py-3 text-slate-400 font-mono text-xs">{row.no_kk||'—'}</td>
                      <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{formatTanggal(row.tanggal)}</td>
                      <td className="px-3 py-3 text-slate-300">{row.tujuan}</td>
                      <td className="px-3 py-3 text-slate-400">{row.alasan||'—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {canEdit && <button onClick={() => setEditKeluar(row)} className="p-1.5 text-amber-400 hover:text-amber-300" title="Edit"><Pencil className="w-3.5 h-3.5"/></button>}
                          {canDelete && <button onClick={() => setRollbackTarget({ id: row.id, nik_target: row.nik_target, nama: row.nama })} className="p-1.5 text-emerald-400 hover:text-emerald-300" title="Batalkan"><RotateCcw className="w-3.5 h-3.5"/></button>}
                          {canDelete && <button onClick={() => setDeleteTarget({ id: row.id, nama: row.nama })} className="p-1.5 text-rose-400 hover:text-rose-300" title="Hapus"><Trash2 className="w-3.5 h-3.5"/></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Tabel Masuk */}
        {tab === 'masuk' && (
          isLoading ? <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          : !dataMasuk?.length ? <p className="text-slate-500 text-sm text-center py-12">Belum ada data pindah masuk</p>
          : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    {['No','Nama','NIK','No. KK','Tanggal','Asal Daerah','RT/RW',''].map(h=>(
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataMasuk.map((row,i) => (
                    <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-3 text-slate-500 text-xs">{i+1}</td>
                      <td className="px-3 py-3 text-slate-100 font-medium">{row.nama_lengkap}</td>
                      <td className="px-3 py-3 text-slate-400 font-mono text-xs">{row.nik||'—'}</td>
                      <td className="px-3 py-3 text-slate-400 font-mono text-xs">{row.no_kk||'—'}</td>
                      <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{formatTanggal(row.tanggal)}</td>
                      <td className="px-3 py-3 text-slate-300">{row.asal_daerah}</td>
                      <td className="px-3 py-3 text-slate-400 text-xs">RT {row.rt}/RW {row.rw}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {canEdit && <button onClick={() => setEditMasuk(row)} className="p-1.5 text-amber-400 hover:text-amber-300" title="Edit"><Pencil className="w-3.5 h-3.5"/></button>}
                          {canDelete && <button onClick={() => setDeleteTarget({ id: row.id, nama: row.nama_lengkap })} className="p-1.5 text-rose-400 hover:text-rose-300" title="Hapus"><Trash2 className="w-3.5 h-3.5"/></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
              <p className="font-semibold text-slate-100 mb-2">Hapus Data?</p>
              <p className="text-sm text-slate-400 mb-5">Hapus data <span className="font-medium text-slate-200">{deleteTarget.nama}</span>?</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isPendingDelete}>Batal</Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isPendingDelete}>{isPendingDelete?'Menghapus...':'Hapus'}</Button>
              </div>
            </div>
          </div>
        )}

        {rollbackTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
              <p className="font-semibold text-slate-100 mb-2">Batalkan Mutasi Keluar?</p>
              <p className="text-sm text-slate-400 mb-5">Status <span className="font-medium text-slate-200">{rollbackTarget.nama}</span> akan dikembalikan ke Aktif.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setRollbackTarget(null)} disabled={pendingRollback}>Batal</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleRollback} disabled={pendingRollback}>{pendingRollback?'Memproses...':'Ya, Batalkan'}</Button>
              </div>
            </div>
          </div>
        )}

        {editKeluar && <EditKeluarModal row={editKeluar} onClose={() => setEditKeluar(null)} />}
        {editMasuk && <EditMasukModal row={editMasuk} onClose={() => setEditMasuk(null)} />}
      </div>
    </AppShell>
  )
}
