'use client'

import { X, Users } from 'lucide-react'
import type { Penduduk } from '@/types'

interface Props {
  noKk: string
  allPenduduk: Penduduk[]
  onClose: () => void
  onNavigate: (id: string) => void
}

const HUB_ORDER: Record<string, number> = {
  'Kepala Keluarga': 0,
  'Istri': 1,
  'Suami': 1,
  'Anak': 2,
  'Orang Tua': 3,
  'Mertua': 4,
  'Cucu': 5,
  'Menantu': 6,
  'Famili Lain': 7,
}

const HUB_COLOR: Record<string, string> = {
  'Kepala Keluarga': 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  'Istri': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'Suami': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Anak': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Orang Tua': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'Mertua': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'Cucu': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
}

const STATUS_COLOR: Record<string, string> = {
  'meninggal': 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  'mutasi-keluar': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'tidak aktif': 'bg-slate-500/15 text-slate-400 border-slate-500/20',
}

export function KKModal({ noKk, allPenduduk, onClose, onNavigate }: Props) {
  const anggota = allPenduduk
    .filter((p) => p.no_kk === noKk)
    .sort((a, b) => {
      const oa = HUB_ORDER[a.hubungan_keluarga] ?? 8
      const ob = HUB_ORDER[b.hubungan_keluarga] ?? 8
      return oa - ob
    })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d1424] border border-white/[0.08] rounded-2xl p-5 max-w-md w-full flex flex-col gap-4 max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
              <Users size={16} className="text-sky-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-100 text-sm">Anggota Keluarga</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">No. KK: {noKk}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5">
            <X size={15} />
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col gap-2 overflow-y-auto">
          {anggota.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Tidak ada anggota ditemukan</p>
          ) : (
            anggota.map((p) => (
              <button
                key={p.id}
                onClick={() => { onClose(); onNavigate(p.id) }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.07] hover:border-white/[0.10] transition-all text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200 truncate">{p.nama_lengkap}</span>
                    {p.status !== 'aktif' && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[p.status] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
                        {p.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{p.nik || '—'}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-1 rounded-lg border shrink-0 ${HUB_COLOR[p.hubungan_keluarga] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
                  {p.hubungan_keluarga}
                </span>
              </button>
            ))
          )}
        </div>

        <p className="text-xs text-slate-600 text-center">{anggota.length} anggota ditemukan</p>
      </div>
    </div>
  )
}
