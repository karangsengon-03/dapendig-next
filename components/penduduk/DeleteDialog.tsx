'use client'

import { Trash2, AlertTriangle } from 'lucide-react'

interface DeleteDialogProps {
  open: boolean
  nama: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteDialog({
  open,
  nama,
  loading,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[#0d1424] border border-white/[0.08] rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col gap-4">
          {/* Icon */}
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <AlertTriangle size={20} className="text-rose-400" />
          </div>

          {/* Text */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Hapus Data Penduduk
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Data{' '}
              <span className="text-slate-200 font-medium">{nama}</span> akan
              dihapus permanen dan tidak dapat dikembalikan.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-slate-300 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2 px-4 rounded-xl bg-rose-500/90 hover:bg-rose-500 text-sm text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
