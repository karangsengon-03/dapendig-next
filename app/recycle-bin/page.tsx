'use client'

import { useState } from 'react'
import { rtRw } from '@/lib/rt-rw'
import { ArchiveRestore, Info, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useIsDesktop } from '@/components/layout/useIsDesktop'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { ConfirmModal } from '@/components/ui/dialog'
import { NamaCell } from '@/components/ui/rec-parts'
import { useRecycleBinList, useRestorePenduduk, useHapusPermanent, useHapusSemuaRecycleBin } from '@/hooks/useRecycleBin'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { GalatTolak } from '@/lib/galat-tolak'
import type { RecycleBinItem } from '@/types'

function formatTanggal(ts: unknown): string {
  if (!ts) return '-'
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return new Date((ts as { seconds: number }).seconds * 1000).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
  }
  return '-'
}

// Tanggal ringkas untuk kolom tabel (mis. 06 Okt 2026) agar kolom aksi tetap terlihat
function tanggalRingkas(ts: unknown): string {
  if (!ts) return '-'
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return new Date((ts as { seconds: number }).seconds * 1000).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }
  return '-'
}

export default function RecycleBinPage() {
  const { data = [], isLoading, refetch } = useRecycleBinList()
  const restoreMutation = useRestorePenduduk()
  const hapusMutation = useHapusPermanent()
  const hapusSemuaMutation = useHapusSemuaRecycleBin()
  const { isAdmin } = useAuthStore()
  const { toast } = useToast()
  const isDesktop = useIsDesktop()

  const [confirmTarget, setConfirmTarget] = useState<RecycleBinItem | null>(null)
  const [confirmHapusSemua, setConfirmHapusSemua] = useState(false)
  // Jumlah di konfirmasi diambil SEGAR dari server (cache daftar bisa basi sampai 30 dtk), bukan dari data.length
  const [jumlahSegar, setJumlahSegar] = useState(0)
  const [memuatHapusSemua, setMemuatHapusSemua] = useState(false)

  async function handleRestore(item: RecycleBinItem) {
    try {
      await restoreMutation.mutateAsync({ recycleId: item.id, dataAsli: item.data_asli })
      toast(`${item.data_asli.nama_lengkap} berhasil dipulihkan`, 'success')
    } catch (e) {
      // Penolakan yang disengaja (mis. NIK sudah terdaftar) menyebut alasannya; galat lain tetap pesan lama
      toast(e instanceof GalatTolak ? `Gagal memulihkan: ${e.message}` : 'Gagal memulihkan data', 'error')
    }
  }

  async function handleHapusPermanent() {
    if (!confirmTarget) return
    try {
      await hapusMutation.mutateAsync({ recycleId: confirmTarget.id, nama: confirmTarget.data_asli.nama_lengkap })
      toast(`${confirmTarget.data_asli.nama_lengkap} dihapus permanen`, 'success')
      setConfirmTarget(null)
    } catch {
      toast('Gagal menghapus data', 'error')
      setConfirmTarget(null)
    }
  }

  // Segarkan daftar dulu, lalu buka konfirmasi dengan jumlah segar
  async function bukaKonfirmasiHapusSemua() {
    setMemuatHapusSemua(true)
    try {
      const hasil = await refetch({ throwOnError: true })
      const jumlah = hasil.data?.length ?? 0
      if (jumlah === 0) {
        toast('Tempat sampah sudah kosong', 'info')
        return
      }
      setJumlahSegar(jumlah)
      setConfirmHapusSemua(true)
    } catch {
      toast('Gagal memuat ulang Tempat sampah', 'error')
    } finally {
      setMemuatHapusSemua(false)
    }
  }

  async function handleHapusSemua() {
    try {
      const jumlah = await hapusSemuaMutation.mutateAsync()
      toast('Semua data di tempat sampah telah dihapus' + ` (${jumlah} data)`, 'success')   // kalimat zip dipertahankan + jumlah nyata
      setConfirmHapusSemua(false)
    } catch {
      toast('Gagal menghapus semua data', 'error')
      setConfirmHapusSemua(false)
    }
  }

  const canAdmin = isAdmin()

  const kosong = (
    <div className="a-empty">
      <div className="em"><Trash2 className="i" style={{ fontSize: 30 }} /></div>
      <h3>Tempat sampah kosong</h3>
      <p>Data penduduk yang dihapus akan ditampung di sini dan bisa dipulihkan.</p>
    </div>
  )

  // Pulihkan = tulis penduduk + hapus item Tempat sampah; rules: hapus item = admin → tombol hanya untuk admin
  const tombolPulihkan = (item: RecycleBinItem) => canAdmin ? (
    <Button type="button" variant="secondary" size="xs" onClick={() => handleRestore(item)} disabled={restoreMutation.isPending}>
      <ArchiveRestore className="i" />Pulihkan
    </Button>
  ) : null

  return (
    <AppShell title="Tempat sampah">
      <PageHeader
        title="Tempat sampah"
        description="Data penduduk yang dihapus · bisa dipulihkan kapan saja"
        action={canAdmin && data.length > 0 ? (
          <Button type="button" variant="destructive" onClick={bukaKonfirmasiHapusSemua} disabled={memuatHapusSemua}>
            <Trash2 className="i" />{memuatHapusSemua ? 'Memuat...' : 'Hapus semua'}
          </Button>
        ) : undefined}
      />

      {data.length > 0 && (
        <div className="a-alert info" style={{ marginBottom: 14 }}>
          <Info className="i" />
          <div>
            {data.length} data menunggu.{' '}
            {canAdmin
              ? <><b style={{ display: 'inline' }}>Pulihkan</b> untuk mengembalikan ke daftar penduduk, atau <b style={{ display: 'inline' }}>Hapus permanen</b> untuk menghilangkannya selamanya.</>
              : 'Hanya admin yang dapat memulihkan atau menghapus permanen.'}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="a-tw">
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 44 }} />)}
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="a-tw">{kosong}</div>
      ) : isDesktop ? (
        <div className="a-tw">
          <div style={{ overflow: 'auto' }}>
            <table className="a-t" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>No</th>
                  <th>Nama</th>
                  <th>NIK</th>
                  <th>No. KK</th>
                  <th>RT/RW</th>
                  <th>Tgl hapus</th>
                  <th>Dihapus oleh</th>
                  {canAdmin && <th className="aksi-st" />}
                </tr>
              </thead>
              <tbody>
                {data.map((item: RecycleBinItem, idx: number) => (
                  <tr key={item.id}>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>{idx + 1}</td>
                    <td className="nm2"><NamaCell nama={item.data_asli.nama_lengkap} jk={item.data_asli.jenis_kelamin} /></td>
                    <td className="mn">{item.data_asli.nik || '—'}</td>
                    <td className="mn">{item.data_asli.no_kk || '—'}</td>
                    <td>{rtRw(item.data_asli.rt, item.data_asli.rw)}</td>
                    <td>{tanggalRingkas(item.dihapus_at)}</td>
                    <td>{item.dihapus_oleh || '—'}</td>
                    {canAdmin && (
                      <td className="aksi-st" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {tombolPulihkan(item)}
                          <Button type="button" variant="destructive" size="xs" title="Hapus permanen" aria-label="Hapus permanen" onClick={() => setConfirmTarget(item)}>
                            <Trash2 className="i" />Hapus
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="a-card-list">
          {data.map((item: RecycleBinItem) => (
            <div key={item.id} className="a-lc" style={{ cursor: 'default', alignItems: 'flex-start' }}>
              <Avatar nama={item.data_asli.nama_lengkap} jk={item.data_asli.jenis_kelamin} size={44} />
              <div className="m">
                <b>{item.data_asli.nama_lengkap}</b>
                <span>Dihapus {formatTanggal(item.dihapus_at)} · {item.dihapus_oleh || '—'}</span>
                <span className="mn">{item.data_asli.nik || '—'}</span>
                <span>KK {item.data_asli.no_kk || '—'} · RT/RW {rtRw(item.data_asli.rt, item.data_asli.rw)}</span>
                {canAdmin && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {tombolPulihkan(item)}
                    <Button type="button" variant="destructive" size="xs" title="Hapus permanen" aria-label="Hapus permanen" onClick={() => setConfirmTarget(item)}>
                      <Trash2 className="i" />Hapus
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Konfirmasi hapus permanen */}
      {confirmTarget && (
        <ConfirmModal
          icon={<Trash2 className="i" style={{ fontSize: 24 }} />}
          tone="bad"
          title="Hapus permanen?"
          okLabel="Hapus permanen"
          loading={hapusMutation.isPending}
          onConfirm={handleHapusPermanent}
          onCancel={() => setConfirmTarget(null)}
        >
          Data <b>{confirmTarget.data_asli.nama_lengkap}</b> akan dihapus selamanya dan <b>tidak bisa dipulihkan</b>.
        </ConfirmModal>
      )}

      {/* Konfirmasi hapus semua */}
      {confirmHapusSemua && (
        <ConfirmModal
          icon={<Trash2 className="i" style={{ fontSize: 24 }} />}
          tone="bad"
          title="Hapus semua?"
          okLabel="Ya, hapus semua"
          loading={hapusSemuaMutation.isPending}
          onConfirm={handleHapusSemua}
          onCancel={() => setConfirmHapusSemua(false)}
        >
          <b>{jumlahSegar} data</b> di Tempat sampah akan dihapus selamanya. Tindakan ini tidak bisa dibatalkan.
        </ConfirmModal>
      )}
    </AppShell>
  )
}
