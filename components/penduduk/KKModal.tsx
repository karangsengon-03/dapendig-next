'use client'

import { useState } from 'react'
import { Printer, Users } from 'lucide-react'
import type { Penduduk } from '@/types'
import { useAppStore } from '@/store/appStore'
import { CetakKKModal } from '@/components/penduduk/CetakKKModal'
import { urutAnggotaKK } from '@/lib/kk-lengkap'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'

interface Props {
  noKk: string
  allPenduduk: Penduduk[]
  onClose: () => void
  onNavigate: (id: string) => void
}

const STATUS_BADGE: Record<string, { label: string; kelas: string }> = {
  'meninggal': { label: 'Meninggal', kelas: 'bad' },
  'mutasi-keluar': { label: 'Pindah keluar', kelas: 'warn' },
  'tidak aktif': { label: 'Tidak aktif', kelas: 'mute' },
}

export function KKModal({ noKk, allPenduduk, onClose, onNavigate }: Props) {
  const { wilayah } = useAppStore()
  const [showCetak, setShowCetak] = useState(false)

  const anggota = urutAnggotaKK(allPenduduk.filter((p) => p.no_kk === noKk))

  // Hanya anggota aktif untuk cetak KK
  const anggotaAktif = anggota.filter((p) => p.status === 'aktif')

  return (
    <>
      <Modal
        onClose={onClose}
        icon={<Users className="i" />}
        tone="info"
        title="Anggota keluarga"
        sub={`No. KK ${noKk}`}
        mono
        foot={
          <>
            <span style={{ marginRight: 'auto', fontSize: 13, color: 'var(--ink-3)' }}>
              <b style={{ color: 'var(--ink)' }}>{anggota.length}</b> anggota ·{' '}
              <b style={{ color: 'var(--ink)' }}>{anggotaAktif.length}</b> aktif
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCetak(true)}
              disabled={anggotaAktif.length === 0}
            >
              <Printer className="i" />
              Cetak KK Sementara
            </Button>
          </>
        }
      >
        {anggota.length === 0 ? (
          <p style={{ margin: 0, padding: '18px 0', textAlign: 'center', fontSize: 13.5, color: 'var(--ink-3)' }}>
            Tidak ada anggota ditemukan
          </p>
        ) : (
          <div className="a-card-list" style={{ gap: 8 }}>
            {anggota.map((p) => {
              const st = STATUS_BADGE[p.status]
              return (
                <button
                  key={p.id}
                  type="button"
                  className="a-lc"
                  style={{ padding: '10px 12px', borderRadius: 12, width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => { onClose(); onNavigate(p.id) }}
                >
                  <Avatar nama={p.nama_lengkap} jk={p.jenis_kelamin} size={40} />
                  <div className="m">
                    <b style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 14 }}>
                      {p.nama_lengkap}
                      {st && <span className={`a-badge sm ${st.kelas}`}>{st.label}</span>}
                    </b>
                    <span className="mn">{p.nik || '—'}</span>
                  </div>
                  <span className={`a-badge nd ${p.hubungan_keluarga === 'Kepala Keluarga' ? 'info' : 'mute'}`}>
                    {p.hubungan_keluarga}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </Modal>

      {/* Modal cetak: dipasang setelah KKModal sehingga tampil di atasnya */}
      {showCetak && (
        <CetakKKModal
          noKk={noKk}
          anggota={anggotaAktif}
          wilayah={wilayah}
          onClose={() => setShowCetak(false)}
        />
      )}
    </>
  )
}
