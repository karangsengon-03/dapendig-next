'use client'

import { useState } from 'react'
import { ArrowRightFromLine, ArrowLeftFromLine, Plus, Trash2, RotateCcw, Pencil, X, ArrowLeftRight } from 'lucide-react'
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

// ── Modal detail Mutasi Keluar ────────────────────────────────────────────────
function DetailKeluarModal({
  row, onClose, canEdit, canDelete,
  onEdit, onRollback, onHapus,
}: {
  row: MutasiKeluar; onClose: () => void
  canEdit: boolean; canDelete: boolean
  onEdit: () => void; onRollback: () => void; onHapus: () => void
}) {
  const fields: [string, string][] = [
    ['Nama', row.nama ?? '—'],
    ['NIK', row.nik_target ?? '—'],
    ['No. KK', row.no_kk ?? '—'],
    ['Tanggal', formatTanggal(row.tanggal)],
    ['Tujuan', row.tujuan ?? '—'],
    ['Alasan', row.alasan ?? '—'],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl w-full max-w-md flex flex-col gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="font-semibold text-slate-100 text-sm">Detail Pindah Keluar</p>
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
                  <Pencil size={15}/>
                  <span className="text-xs font-medium">Edit</span>
                </button>
              )}
              {canDelete && (
                <button onClick={onRollback}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                  <RotateCcw size={15}/>
                  <span className="text-xs font-medium">Batalkan</span>
                </button>
              )}
              {canDelete && (
                <button onClick={onHapus}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors">
                  <Trash2 size={15}/>
                  <span className="text-xs font-medium">Hapus</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal detail Mutasi Masuk ─────────────────────────────────────────────────
function DetailMasukModal({
  row, onClose, canEdit, canDelete,
  onEdit, onHapus,
}: {
  row: MutasiMasuk; onClose: () => void
  canEdit: boolean; canDelete: boolean
  onEdit: () => void; onHapus: () => void
}) {
  const fields: [string, string][] = [
    ['Nama', row.nama_lengkap ?? '—'],
    ['NIK', row.nik ?? '—'],
    ['No. KK', row.no_kk ?? '—'],
    ['Tanggal', formatTanggal(row.tanggal)],
    ['Asal Daerah', row.asal_daerah ?? '—'],
    ['RT / RW', `RT ${row.rt} / RW ${row.rw}`],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl w-full max-w-md flex flex-col gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="font-semibold text-slate-100 text-sm">Detail Pindah Masuk</p>
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
                  <Pencil size={15}/>
                  <span className="text-xs font-medium">Edit</span>
                </button>
              )}
              {canDelete && (
                <button onClick={onHapus}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors">
                  <Trash2 size={15}/>
                  <span className="text-xs font-medium">Hapus</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal Edit ────────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-5 w-full max-w-md flex flex-col gap-3">
        <div className="flex items-center justify-between"><p className="font-semibold text-slate-100 text-sm">Edit Pindah Keluar</p><button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300"><X size={15}/></button></div>
        {([['Nama','nama','text'],['NIK','nik_target','text'],['No. KK','no_kk','text'],['Tujuan','tujuan','text'],['Alasan','alasan','text'],['Tanggal','tanggal','date']] as [string,string,string][]).map(([label,key,type])=>(
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-5 w-full max-w-md flex flex-col gap-3">
        <div className="flex items-center justify-between"><p className="font-semibold text-slate-100 text-sm">Edit Pindah Masuk</p><button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300"><X size={15}/></button></div>
        {([['Nama','nama_lengkap','text'],['NIK','nik','text'],['No. KK','no_kk','text'],['Asal Daerah','asal_daerah','text'],['Tanggal','tanggal','date'],['RT','rt','text'],['RW','rw','text']] as [string,string,string][]).map(([label,key,type])=>(
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
  const [detailKeluar, setDetailKeluar] = useState<MutasiKeluar | null>(null)
  const [detailMasuk, setDetailMasuk] = useState<MutasiMasuk | null>(null)
  const [editKeluar, setEditKeluar] = useState<MutasiKeluar | null>(null)
  const [editMasuk, setEditMasuk] = useState<MutasiMasuk | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string; type: Tab } | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; nik_target: string; nama: string } | null>(null)

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
    const { id, nama, type } = deleteTarget
    const opts = {
      onSuccess: () => { setDeleteTarget(null); setDetailKeluar(null); setDetailMasuk(null); toast(`Data ${nama} dihapus`, 'success') },
      onError: () => toast('Gagal menghapus', 'error'),
    }
    if (type === 'keluar') hapusKeluar({ id, nama }, opts)
    else hapusMasuk({ id, nama }, opts)
  }

  function handleRollback() {
    if (!rollbackTarget) return
    rollback({ mutasiId: rollbackTarget.id, nik_target: rollbackTarget.nik_target, nama: rollbackTarget.nama }, {
      onSuccess: () => { setRollbackTarget(null); setDetailKeluar(null); toast(`Mutasi ${rollbackTarget.nama} dibatalkan`, 'success') },
      onError: () => toast('Gagal membatalkan', 'error'),
    })
  }

  const thCls = "px-3 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
  const trCls = "border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer group"

  return (
    <AppShell title="Mutasi">
      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        {/* Sub-header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ArrowLeftRight size={18} className="text-sky-400 shrink-0" />
            <h1 className="text-base font-semibold text-slate-100">Mutasi</h1>
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
            onClick={() => { setTab('keluar'); setShowForm(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'keluar'
                ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
                : 'bg-[#0d1424] border border-white/[0.06] text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightFromLine className="w-4 h-4" />
            Pindah Keluar
          </button>
          <button
            onClick={() => { setTab('masuk'); setShowForm(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'masuk'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                : 'bg-[#0d1424] border border-white/[0.06] text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftFromLine className="w-4 h-4" />
            Pindah Masuk
          </button>
        </div>

        {showForm && tab === 'keluar' && <MutasiKeluarForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}
        {showForm && tab === 'masuk' && <MutasiMasukForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}

        {/* Tabel Keluar */}
        {tab === 'keluar' && (
          isLoading
            ? <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12 w-full rounded-xl"/>)}</div>
            : !dataKeluar?.length
              ? <p className="text-slate-500 text-sm text-center py-12">Belum ada data pindah keluar</p>
              : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0d1424]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['No','Nama','NIK','No. KK','Tanggal','Tujuan','Alasan'].map(h=>(
                          <th key={h} className={thCls}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataKeluar.map((row: MutasiKeluar, i: number) => (
                        <tr key={row.id} className={trCls} onClick={() => setDetailKeluar(row)}>
                          <td className="px-3 py-3 text-slate-500 text-sm">{i+1}</td>
                          <td className="px-3 py-3 text-slate-100 font-medium group-hover:text-sky-400 transition-colors">{row.nama}</td>
                          <td className="px-3 py-3 text-slate-400 font-mono text-sm">{row.nik_target||'—'}</td>
                          <td className="px-3 py-3 text-slate-400 font-mono text-sm">{row.no_kk||'—'}</td>
                          <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{formatTanggal(row.tanggal)}</td>
                          <td className="px-3 py-3 text-slate-300">{row.tujuan}</td>
                          <td className="px-3 py-3 text-slate-400">{row.alasan||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
        )}

        {/* Tabel Masuk */}
        {tab === 'masuk' && (
          isLoading
            ? <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12 w-full rounded-xl"/>)}</div>
            : !dataMasuk?.length
              ? <p className="text-slate-500 text-sm text-center py-12">Belum ada data pindah masuk</p>
              : (
                <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0d1424]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['No','Nama','NIK','No. KK','Tanggal','Asal Daerah','RT/RW'].map(h=>(
                          <th key={h} className={thCls}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataMasuk.map((row: MutasiMasuk, i: number) => (
                        <tr key={row.id} className={trCls} onClick={() => setDetailMasuk(row)}>
                          <td className="px-3 py-3 text-slate-500 text-sm">{i+1}</td>
                          <td className="px-3 py-3 text-slate-100 font-medium group-hover:text-sky-400 transition-colors">{row.nama_lengkap}</td>
                          <td className="px-3 py-3 text-slate-400 font-mono text-sm">{row.nik||'—'}</td>
                          <td className="px-3 py-3 text-slate-400 font-mono text-sm">{row.no_kk||'—'}</td>
                          <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{formatTanggal(row.tanggal)}</td>
                          <td className="px-3 py-3 text-slate-300">{row.asal_daerah}</td>
                          <td className="px-3 py-3 text-slate-400 text-sm">RT {row.rt}/RW {row.rw}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
        )}
      </div>

      {/* Detail modal Keluar */}
      {detailKeluar && (
        <DetailKeluarModal
          row={detailKeluar} onClose={() => setDetailKeluar(null)}
          canEdit={canEdit} canDelete={canDelete}
          onEdit={() => { setEditKeluar(detailKeluar) }}
          onRollback={() => setRollbackTarget({ id: detailKeluar.id, nik_target: detailKeluar.nik_target, nama: detailKeluar.nama })}
          onHapus={() => setDeleteTarget({ id: detailKeluar.id, nama: detailKeluar.nama, type: 'keluar' })}
        />
      )}

      {/* Detail modal Masuk */}
      {detailMasuk && (
        <DetailMasukModal
          row={detailMasuk} onClose={() => setDetailMasuk(null)}
          canEdit={canEdit} canDelete={canDelete}
          onEdit={() => { setEditMasuk(detailMasuk) }}
          onHapus={() => setDeleteTarget({ id: detailMasuk.id, nama: detailMasuk.nama_lengkap, type: 'masuk' })}
        />
      )}

      {/* Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
            <p className="font-semibold text-slate-100 mb-2">Hapus Data?</p>
            <p className="text-sm text-slate-400 mb-5">Hapus data <span className="font-medium text-slate-200">{deleteTarget.nama}</span>? Aksi ini tidak bisa dibatalkan.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isPendingDelete}>Batal</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isPendingDelete}>{isPendingDelete?'Menghapus...':'Hapus'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Rollback */}
      {rollbackTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
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
    </AppShell>
  )
}
