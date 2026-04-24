'use client'

import { useState } from 'react'
import { Baby, HeartCrack, Plus, Trash2, RotateCcw, Pencil, X, HeartPulse } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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

// ── Detail Modal Kelahiran ────────────────────────────────────────────────────
function DetailLahirModal({
  row, onClose, canEdit, canDelete, onEdit, onHapus,
}: {
  row: Lahir; onClose: () => void; canEdit: boolean; canDelete: boolean
  onEdit: () => void; onHapus: () => void
}) {
  const fields: [string, string][] = [
    ['Nama Bayi', row.nama_lengkap ?? '—'],
    ['NIK', row.nik ?? '—'],
    ['No. KK', row.no_kk ?? '—'],
    ['Jenis Kelamin', row.jenis_kelamin ?? '—'],
    ['Tanggal Lahir', formatTanggal(row.tanggal_lahir)],
    ['Tempat Lahir', row.tempat_lahir ?? '—'],
    ['Nama Ayah', row.nama_ayah ?? '—'],
    ['Nama Ibu', row.nama_ibu ?? '—'],
    ['RT / RW', `RT ${row.rt} / RW ${row.rw}`],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col gap-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0d1424]">
          <p className="font-semibold text-slate-100 text-sm">Detail Kelahiran</p>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300"><X size={15}/></button>
        </div>
        <div className="px-5 py-3 flex flex-col divide-y divide-white/[0.04]">
          {fields.map(([label, val]) => (
            <div key={label} className="py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
              <p className="text-sm text-slate-200 mt-0.5">{val}</p>
            </div>
          ))}
        </div>
        {(canEdit || canDelete) && (
          <div className="px-5 py-4 border-t border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Aksi</p>
            <div className="grid grid-cols-2 gap-2">
              {canEdit && (
                <button onClick={onEdit}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
                  <Pencil size={15}/><span className="text-xs font-medium">Edit</span>
                </button>
              )}
              {canDelete && (
                <button onClick={onHapus}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors">
                  <Trash2 size={15}/><span className="text-xs font-medium">Hapus</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Detail Modal Kematian ─────────────────────────────────────────────────────
function DetailMeninggalModal({
  row, onClose, canEdit, canDelete, onEdit, onRollback, onHapus,
}: {
  row: Meninggal; onClose: () => void; canEdit: boolean; canDelete: boolean
  onEdit: () => void; onRollback: () => void; onHapus: () => void
}) {
  const fields: [string, string][] = [
    ['Nama', row.nama ?? '—'],
    ['NIK', row.nik_target ?? '—'],
    ['No. KK', row.no_kk ?? '—'],
    ['Tanggal Meninggal', formatTanggal(row.tanggal)],
    ['Hub. Keluarga', row.hub_asli ?? '—'],
    ['Sebab Kematian', row.sebab ?? '—'],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl w-full max-w-md flex flex-col gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="font-semibold text-slate-100 text-sm">Detail Kematian</p>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300"><X size={15}/></button>
        </div>
        <div className="px-5 py-3 flex flex-col divide-y divide-white/[0.04]">
          {fields.map(([label, val]) => (
            <div key={label} className="py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
              <p className="text-sm text-slate-200 mt-0.5">{val}</p>
            </div>
          ))}
        </div>
        {(canEdit || canDelete) && (
          <div className="px-5 py-4 border-t border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Aksi</p>
            <div className="grid grid-cols-3 gap-2">
              {canEdit && (
                <button onClick={onEdit}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
                  <Pencil size={15}/><span className="text-xs font-medium">Edit</span>
                </button>
              )}
              {canDelete && (
                <button onClick={onRollback}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                  <RotateCcw size={15}/><span className="text-xs font-medium">Batalkan</span>
                </button>
              )}
              {canDelete && (
                <button onClick={onHapus}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors">
                  <Trash2 size={15}/><span className="text-xs font-medium">Hapus</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Edit Modals ───────────────────────────────────────────────────────────────
function EditLahirModal({ row, onClose }: { row: Lahir; onClose: () => void }) {
  const { mutateAsync, isPending } = useEditLahir()
  const { toast } = useToast()
  const [form, setForm] = useState({ nama_lengkap: row.nama_lengkap??'', nik: row.nik??'', no_kk: row.no_kk??'', tanggal_lahir: row.tanggal_lahir??'', tempat_lahir: row.tempat_lahir??'', nama_ayah: row.nama_ayah??'', nama_ibu: row.nama_ibu??'', rt: row.rt??'', rw: row.rw??'' })
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }
  async function handleSave() {
    try { await mutateAsync({ id: row.id, data: form }); toast('Data kelahiran diperbarui', 'success'); onClose() }
    catch { toast('Gagal menyimpan', 'error') }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto flex flex-col gap-3">
        <div className="flex items-center justify-between"><p className="font-semibold text-slate-100 text-sm">Edit Kelahiran</p><button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300"><X size={15}/></button></div>
        {([['Nama Lengkap','nama_lengkap','text'],['NIK','nik','text'],['No. KK','no_kk','text'],['Tanggal Lahir','tanggal_lahir','date'],['Tempat Lahir','tempat_lahir','text'],['Nama Ayah','nama_ayah','text'],['Nama Ibu','nama_ibu','text'],['RT','rt','text'],['RW','rw','text']] as [string,string,string][]).map(([label,key,type])=>(
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">{label}</label>
            <input type={type} value={form[key as keyof typeof form]} onChange={e=>set(key,e.target.value)} className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"/>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} className="flex-1">{isPending?'Menyimpan...':'Simpan'}</Button>
        </div>
      </div>
    </div>
  )
}

function EditMeninggalModal({ row, onClose }: { row: Meninggal; onClose: () => void }) {
  const { mutateAsync, isPending } = useEditMeninggal()
  const { toast } = useToast()
  const [form, setForm] = useState({ nama: row.nama??'', nik_target: row.nik_target??'', no_kk: row.no_kk??'', tanggal: row.tanggal??'', sebab: row.sebab??'' })
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }
  async function handleSave() {
    try { await mutateAsync({ id: row.id, data: form }); toast('Data kematian diperbarui', 'success'); onClose() }
    catch { toast('Gagal menyimpan', 'error') }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-5 w-full max-w-md flex flex-col gap-3">
        <div className="flex items-center justify-between"><p className="font-semibold text-slate-100 text-sm">Edit Kematian</p><button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300"><X size={15}/></button></div>
        {([['Nama','nama','text'],['NIK','nik_target','text'],['No. KK','no_kk','text'],['Tanggal Meninggal','tanggal','date'],['Sebab','sebab','text']] as [string,string,string][]).map(([label,key,type])=>(
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">{label}</label>
            <input type={type} value={form[key as keyof typeof form]} onChange={e=>set(key,e.target.value)} className="bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"/>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} className="flex-1">{isPending?'Menyimpan...':'Simpan'}</Button>
        </div>
      </div>
    </div>
  )
}

type Tab = 'lahir' | 'meninggal'

export default function VitalPage() {
  const [tab, setTab] = useState<Tab>('lahir')
  const [showForm, setShowForm] = useState(false)
  const [detailLahir, setDetailLahir] = useState<Lahir | null>(null)
  const [detailMeninggal, setDetailMeninggal] = useState<Meninggal | null>(null)
  const [editLahir, setEditLahir] = useState<Lahir | null>(null)
  const [editMeninggal, setEditMeninggal] = useState<Meninggal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string; type: Tab } | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; nik_target: string; nama: string; hub_asli: string; no_kk: string } | null>(null)

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

  const isPendingDelete = tab === 'lahir' ? pendingHapusLahir : pendingHapusMeninggal

  function handleDelete() {
    if (!deleteTarget) return
    const { id, nama, type } = deleteTarget
    const opts = {
      onSuccess: () => { setDeleteTarget(null); setDetailLahir(null); setDetailMeninggal(null); toast(`Data ${nama} dihapus`, 'success') },
      onError: () => toast('Gagal menghapus', 'error'),
    }
    if (type === 'lahir') hapusLahir({ id, nama }, opts)
    else hapusMeninggal({ id, nama }, opts)
  }

  function handleRollback() {
    if (!rollbackTarget) return
    rollback({ meninggalId: rollbackTarget.id, nik_target: rollbackTarget.nik_target, nama: rollbackTarget.nama, hub_asli: rollbackTarget.hub_asli, no_kk: rollbackTarget.no_kk }, {
      onSuccess: () => { setRollbackTarget(null); setDetailMeninggal(null); toast(`Kematian ${rollbackTarget.nama} dibatalkan`, 'success') },
      onError: () => toast('Gagal membatalkan', 'error'),
    })
  }

  const thCls = "px-3 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
  const trCls = "border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer group"

  return (
    <AppShell title="Vital">
      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        {/* Sub-header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <HeartPulse size={18} className="text-sky-400 shrink-0" />
            <h1 className="text-base font-semibold text-slate-100">Vital</h1>
          </div>
          {canAdd && (
            <button
              onClick={() => setShowForm(v => !v)}
              className={[
                'flex items-center justify-center gap-1.5 w-28 h-9 rounded-xl text-sm font-medium transition-colors border shrink-0',
                showForm
                  ? 'bg-slate-700/60 border-white/[0.08] text-slate-300 hover:bg-slate-700'
                  : 'bg-sky-500 border-sky-500 text-white hover:bg-sky-400',
              ].join(' ')}
            >
              {showForm ? <><X className="w-3.5 h-3.5" />Tutup</> : <><Plus className="w-3.5 h-3.5" />Tambah</>}
            </button>
          )}
        </div>

        {/* Tab */}
        <div className="flex gap-2">
          <button
            onClick={() => { setTab('lahir'); setShowForm(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'lahir'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                : 'bg-[#0d1424] border border-white/[0.06] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Baby className="w-4 h-4" />
            Kelahiran
          </button>
          <button
            onClick={() => { setTab('meninggal'); setShowForm(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'meninggal'
                ? 'bg-slate-500/20 border border-slate-500/30 text-slate-300'
                : 'bg-[#0d1424] border border-white/[0.06] text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartCrack className="w-4 h-4" />
            Kematian
          </button>
        </div>

        {showForm && tab === 'lahir' && <LahirForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}
        {showForm && tab === 'meninggal' && <MeninggalForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}

        {/* Tabel Kelahiran */}
        {tab === 'lahir' && (
          loadingLahir
            ? <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12 w-full rounded-xl"/>)}</div>
            : !dataLahir?.length
              ? <p className="text-slate-500 text-sm text-center py-12">Belum ada data kelahiran</p>
              : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0d1424]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['No','Nama Bayi','NIK','JK','Tgl Lahir','Ayah','Ibu','RT/RW'].map(h=><th key={h} className={thCls}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {dataLahir.map((row: Lahir, i: number) => (
                        <tr key={row.id} className={trCls} onClick={() => setDetailLahir(row)}>
                          <td className="px-3 py-3 text-slate-500 text-sm">{i+1}</td>
                          <td className="px-3 py-3 text-slate-100 font-medium group-hover:text-sky-400 transition-colors">{row.nama_lengkap}</td>
                          <td className="px-3 py-3 text-slate-400 font-mono text-sm">{row.nik||'—'}</td>
                          <td className="px-3 py-3">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${row.jenis_kelamin==='Laki-laki'?'bg-sky-500/10 text-sky-400':'bg-pink-500/10 text-pink-400'}`}>
                              {row.jenis_kelamin==='Laki-laki'?'L':'P'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{formatTanggal(row.tanggal_lahir)}</td>
                          <td className="px-3 py-3 text-slate-400">{row.nama_ayah}</td>
                          <td className="px-3 py-3 text-slate-400">{row.nama_ibu}</td>
                          <td className="px-3 py-3 text-slate-400 text-sm">RT {row.rt}/RW {row.rw}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
        )}

        {/* Tabel Kematian */}
        {tab === 'meninggal' && (
          loadingMeninggal
            ? <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12 w-full rounded-xl"/>)}</div>
            : !dataMeninggal?.length
              ? <p className="text-slate-500 text-sm text-center py-12">Belum ada data kematian</p>
              : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0d1424]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['No','Nama','NIK','No. KK','Tgl Meninggal','Hub. Keluarga','Sebab'].map(h=><th key={h} className={thCls}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {dataMeninggal.map((row: Meninggal, i: number) => (
                        <tr key={row.id} className={trCls} onClick={() => setDetailMeninggal(row)}>
                          <td className="px-3 py-3 text-slate-500 text-sm">{i+1}</td>
                          <td className="px-3 py-3 text-slate-100 font-medium group-hover:text-sky-400 transition-colors">{row.nama}</td>
                          <td className="px-3 py-3 text-slate-400 font-mono text-sm">{row.nik_target||'—'}</td>
                          <td className="px-3 py-3 text-slate-400 font-mono text-sm">{row.no_kk||'—'}</td>
                          <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{formatTanggal(row.tanggal)}</td>
                          <td className="px-3 py-3 text-slate-400 text-xs">{row.hub_asli||'—'}</td>
                          <td className="px-3 py-3 text-slate-400">{row.sebab||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
        )}
      </div>

      {detailLahir && (
        <DetailLahirModal row={detailLahir} onClose={() => setDetailLahir(null)}
          canEdit={canEdit} canDelete={canDelete}
          onEdit={() => setEditLahir(detailLahir)}
          onHapus={() => setDeleteTarget({ id: detailLahir.id, nama: detailLahir.nama_lengkap, type: 'lahir' })}
        />
      )}
      {detailMeninggal && (
        <DetailMeninggalModal row={detailMeninggal} onClose={() => setDetailMeninggal(null)}
          canEdit={canEdit} canDelete={canDelete}
          onEdit={() => setEditMeninggal(detailMeninggal)}
          onRollback={() => setRollbackTarget({ id: detailMeninggal.id, nik_target: detailMeninggal.nik_target, nama: detailMeninggal.nama, hub_asli: detailMeninggal.hub_asli, no_kk: detailMeninggal.no_kk })}
          onHapus={() => setDeleteTarget({ id: detailMeninggal.id, nama: detailMeninggal.nama, type: 'meninggal' })}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
            <p className="font-semibold text-slate-100 mb-2">Hapus Data?</p>
            <p className="text-sm text-slate-400 mb-5">Hapus <span className="font-medium text-slate-200">{deleteTarget.nama}</span>? Aksi ini tidak bisa dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isPendingDelete}>Batal</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isPendingDelete}>{isPendingDelete?'Menghapus...':'Hapus'}</Button>
            </div>
          </div>
        </div>
      )}
      {rollbackTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
            <p className="font-semibold text-slate-100 mb-2">Batalkan Kematian?</p>
            <p className="text-sm text-slate-400 mb-5">Status <span className="font-medium text-slate-200">{rollbackTarget.nama}</span> akan dikembalikan ke Aktif.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setRollbackTarget(null)} disabled={pendingRollback}>Batal</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleRollback} disabled={pendingRollback}>{pendingRollback?'Memproses...':'Ya, Batalkan'}</Button>
            </div>
          </div>
        </div>
      )}

      {editLahir && <EditLahirModal row={editLahir} onClose={() => setEditLahir(null)} />}
      {editMeninggal && <EditMeninggalModal row={editMeninggal} onClose={() => setEditMeninggal(null)} />}
    </AppShell>
  )
}
