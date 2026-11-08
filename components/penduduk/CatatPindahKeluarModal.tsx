'use client'

import { useState } from 'react'
import {
  Check,
  MapPin,
  User,
  Users,
} from 'lucide-react'
import { PERISTIWA } from '@/lib/visual'
import { useCatatPindahKeluar, useCatatPindahKeluarKeluarga } from '@/hooks/usePenduduk'
import { useToast } from '@/components/ui/toast'
import { hariIni } from '@/lib/tanggal-lokal'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, InBox } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import type { Penduduk } from '@/types'

interface Props {
  penduduk: Penduduk
  allPenduduk: Penduduk[]
  onClose: () => void
  onSuccess: () => void
}

type Opsi = 'perorangan' | 'keluarga'
type FieldGalat = 'tujuan' | 'tanggal'

export function CatatPindahKeluarModal({ penduduk, allPenduduk, onClose, onSuccess }: Props) {
  const today = hariIni()
  const [opsi, setOpsi] = useState<Opsi>('perorangan')
  const [tujuan, setTujuan] = useState('')
  const [alasan, setAlasan] = useState('')
  const [tanggal, setTanggal] = useState(today)
  const [error, setError] = useState<{ field: FieldGalat; pesan: string } | null>(null)

  const mutationSatu = useCatatPindahKeluar()
  const mutationKeluarga = useCatatPindahKeluarKeluarga()
  const { toast } = useToast()

  // Anggota KK aktif yang akan ikut pindah (opsi keluarga)
  const anggotaKK = allPenduduk.filter(
    (p) => p.no_kk === penduduk.no_kk && p.status === 'aktif'
  )

  const isPending = mutationSatu.isPending || mutationKeluarga.isPending

  async function handleSubmit() {
    if (!tujuan.trim()) { setError({ pesan: 'Tujuan pindah wajib diisi', field: 'tujuan' }); return }
    if (!tanggal) { setError({ pesan: 'Tanggal wajib diisi', field: 'tanggal' }); return }
    setError(null)

    try {
      if (opsi === 'perorangan') {
        await mutationSatu.mutateAsync({
          pendudukId: penduduk.id,
          nik: penduduk.nik,
          nama: penduduk.nama_lengkap,
          no_kk: penduduk.no_kk,
          tujuan: tujuan.trim(),
          alasan: alasan.trim(),
          tanggal,
        })
        toast(`${penduduk.nama_lengkap} berhasil dicatat pindah keluar`, 'success')
      } else {
        await mutationKeluarga.mutateAsync({
          noKk: penduduk.no_kk,
          anggotaIds: anggotaKK.map((p) => p.id),
          tujuan: tujuan.trim(),
          alasan: alasan.trim(),
          tanggal,
          allPenduduk,
        })
        toast(`${anggotaKK.length} anggota KK ${penduduk.no_kk} berhasil dicatat pindah keluar`, 'success')
      }
      onSuccess()
    } catch {
      toast('Gagal mencatat pindah keluar', 'error')
    }
  }

  const pilihan: { nilai: Opsi; Ikon: typeof User; judul: string; sub: string }[] = [
    { nilai: 'perorangan', Ikon: User, judul: '1 Orang', sub: 'Hanya yang bersangkutan' },
    { nilai: 'keluarga', Ikon: Users, judul: '1 Keluarga', sub: 'Seluruh anggota KK aktif' },
  ]

  return (
    <Modal
      onClose={onClose}
      icon={<PERISTIWA.pindah_keluar.Icon className="i" />}
      tone="info"
      title="Catat pindah keluar"
      sub={`${penduduk.nama_lengkap} · ${penduduk.nik || '—'}`}
      foot={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || (opsi === 'keluarga' && anggotaKK.length === 0)}
          >
            <Check className="i" />
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Pilih jenis pindah" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {pilihan.map(({ nilai, Ikon, judul, sub }) => (
          <button
            key={nilai}
            type="button"
            role="radio"
            aria-checked={opsi === nilai}
            onClick={() => setOpsi(nilai)}
            className={cn('a-opt', opsi === nilai && 'on')}
            style={{ textAlign: 'left', cursor: 'pointer' }}
          >
            <div className="oi" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              <Ikon className="i" style={{ fontSize: 18 }} />
            </div>
            <div>
              <b>{judul}</b>
              <p>{sub}</p>
            </div>
            <span className="rd">{opsi === nilai && <Check className="i" />}</span>
          </button>
        ))}
      </div>

      {opsi === 'keluarga' && (
        <div className="a-alert info">
          <Users className="i" />
          <div>
            <b>{anggotaKK.length} anggota KK aktif akan dicatat pindah</b>
            {anggotaKK.map((p) => (
              <div key={p.id}>
                {p.nama_lengkap}
                <span style={{ color: 'var(--ink-3)', marginLeft: 4 }}>({p.hubungan_keluarga})</span>
              </div>
            ))}
            {anggotaKK.length === 0 && <div>Tidak ada anggota aktif ditemukan dalam KK ini.</div>}
          </div>
        </div>
      )}

      <Field
        label="Tujuan pindah"
        htmlFor="pk-tujuan"
        req
        error={error?.field === 'tujuan' ? error.pesan : undefined}
      >
        <InBox error={error?.field === 'tujuan'} icon={<MapPin className="i" />}>
          <input
            id="pk-tujuan"
            type="text"
            value={tujuan}
            onChange={(e) => setTujuan(e.target.value)}
            placeholder="Contoh: Desa Wonorejo, Kec. Prajekan"
            autoComplete="off"
          />
        </InBox>
      </Field>

      <Field label="Alasan" htmlFor="pk-alasan" opt>
        <InBox>
          <input
            id="pk-alasan"
            type="text"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Contoh: Mengikuti suami"
            autoComplete="off"
          />
        </InBox>
      </Field>

      <Field
        label="Tanggal"
        htmlFor="pk-tanggal"
        req
        error={error?.field === 'tanggal' ? error.pesan : undefined}
      >
        <InBox error={error?.field === 'tanggal'}>
          <input
            id="pk-tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </InBox>
      </Field>
    </Modal>
  )
}
