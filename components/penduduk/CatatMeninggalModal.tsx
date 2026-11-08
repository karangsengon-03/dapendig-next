'use client'

import { useState } from 'react'
import {
  Check,
  TriangleAlert,
} from 'lucide-react'
import { PERISTIWA } from '@/lib/visual'
import { useCatatMeninggal } from '@/hooks/usePenduduk'
import { useToast } from '@/components/ui/toast'
import { hariIni } from '@/lib/tanggal-lokal'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, InBox } from '@/components/ui/field'
import type { Penduduk } from '@/types'

interface Props {
  penduduk: Penduduk
  allPenduduk: Penduduk[]
  onClose: () => void
  onSuccess: () => void
}

export function CatatMeninggalModal({ penduduk, allPenduduk, onClose, onSuccess }: Props) {
  const today = hariIni()
  const [tanggal, setTanggal] = useState(today)
  const [sebab, setSebab] = useState('')
  const [error, setError] = useState('')

  const mutation = useCatatMeninggal()
  const { toast } = useToast()

  async function handleSubmit() {
    if (!tanggal) { setError('Tanggal wajib diisi'); return }
    setError('')
    try {
      await mutation.mutateAsync({
        pendudukId: penduduk.id,
        nik: penduduk.nik,
        nama: penduduk.nama_lengkap,
        no_kk: penduduk.no_kk,
        hubungan_keluarga: penduduk.hubungan_keluarga,
        tanggal,
        sebab: sebab.trim(),
        allPenduduk,
      })
      toast(`${penduduk.nama_lengkap} berhasil dicatat meninggal`, 'success')
      onSuccess()
    } catch {
      toast('Gagal mencatat kematian', 'error')
    }
  }

  return (
    <Modal
      onClose={onClose}
      icon={<PERISTIWA.kematian.Icon className="i" />}
      tone="mute"
      title="Catat kematian"
      sub={`${penduduk.nama_lengkap} · ${penduduk.nik || '—'}`}
      foot={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            style={{ background: 'var(--ink-2)', color: 'var(--bg)' }}
          >
            <Check className="i" />
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      {penduduk.hubungan_keluarga === 'Kepala Keluarga' && (
        <div className="a-alert warn">
          <TriangleAlert className="i" />
          <div>
            <b>Penduduk ini adalah Kepala Keluarga.</b>{' '}
            Sistem akan otomatis menentukan penggantinya (Istri/Anak tertua).
          </div>
        </div>
      )}

      <Field label="Tanggal meninggal" htmlFor="pm-tanggal" req error={error || undefined}>
        <InBox error={!!error}>
          <input
            id="pm-tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </InBox>
      </Field>

      <Field label="Sebab meninggal" htmlFor="pm-sebab" opt>
        <InBox>
          <input
            id="pm-sebab"
            type="text"
            value={sebab}
            onChange={(e) => setSebab(e.target.value)}
            placeholder="Contoh: Sakit"
            autoComplete="off"
          />
        </InBox>
      </Field>
    </Modal>
  )
}
