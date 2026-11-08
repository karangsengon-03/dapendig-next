'use client'

import { Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/dialog'

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
    <ConfirmModal
      icon={<Trash2 className="i" style={{ fontSize: 24 }} />}
      tone="bad"
      title="Pindahkan ke tempat sampah?"
      okLabel="Pindahkan ke Tempat sampah"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      Data <b>{nama}</b> akan dipindahkan ke Tempat sampah. Data <b>tidak hilang</b> dan bisa
      dipulihkan kapan saja dari menu Tempat sampah.
    </ConfirmModal>
  )
}
