'use client'

import { useState } from 'react'
import { rt3 } from '@/lib/rt-rw'
import { useDusunAktif } from '@/hooks/useDusunAktif'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Activity,
  ArchiveRestore,
  ArrowLeft,
  Copy,
  History,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Undo2,
  User,
  type LucideIcon,
} from 'lucide-react'
import { PERISTIWA } from '@/lib/visual'
import { JkIkon } from '@/components/ui/jk-ikon'
import { AppShell } from '@/components/layout/AppShell'
import { DeleteDialog } from '@/components/penduduk/DeleteDialog'
import { CatatPindahKeluarModal } from '@/components/penduduk/CatatPindahKeluarModal'
import { CatatMeninggalModal } from '@/components/penduduk/CatatMeninggalModal'
import { KKModal } from '@/components/penduduk/KKModal'
import { CetakKKModal } from '@/components/penduduk/CetakKKModal'
import { usePendudukDetail, useDeletePenduduk, usePendudukList } from '@/hooks/usePenduduk'
import { useLogByNik } from '@/hooks/useLog'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getInisial } from '@/components/ui/avatar'
import { Timestamp } from 'firebase/firestore'

// Kartu data berpasangan label–nilai (gaya prototype: .a-card.lift + .a-kvm)
function KvCard({ title, items }: { title: string; items: { k: string; v: React.ReactNode; lebar?: boolean; mono?: boolean }[] }) {
  return (
    <div className="a-card lift">
      <div className="ch"><div><h3>{title}</h3></div></div>
      <div className="a-kvm" style={{ padding: '6px 20px 10px' }}>
        {items.map(({ k, v, lebar, mono }) => (
          <div key={k} className={`a-kv${lebar ? ' w' : ''}`}>
            <p className="k">{k}</p>
            <p className={`v${mono ? ' mn' : ''}`}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const STATUS_BADGE: Record<string, { label: string; kelas: string }> = {
  'aktif': { label: 'Aktif', kelas: 'ok' },
  'tidak aktif': { label: 'Tidak aktif', kelas: 'mute' },
  'meninggal': { label: 'Meninggal', kelas: 'bad' },
  'mutasi-keluar': { label: 'Pindah keluar', kelas: 'warn' },
}

function toProper(s: string) {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

import { hitungUmur as calcUmur, formatTanggalLahir } from '@/lib/dateUtils'

// ── Helper untuk tampilan riwayat ─────────────────────────────────────────────
function tsToDate(ts: unknown): Date | null {
  if (!ts) return null
  if (ts instanceof Timestamp) return ts.toDate()
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts)
    return new Date((ts as { seconds: number }).seconds * 1000)
  return null
}

function formatWaktuRiwayat(ts: unknown): string {
  const d = tsToDate(ts)
  if (!d) return '—'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// Aksi nyata yang ditulis hook ke koleksi `log` (huruf kecil). Label hanya untuk tiga aksi yang punya padanan di prototype
// (Ditambahkan / Data diubah / Dihapus); aksi lain tampil apa adanya (garis bawah menjadi spasi).
type Nada = 'ok' | 'info' | 'bad' | 'warn' | 'mute'
const AKSI_META: Record<string, { label?: string; Icon: LucideIcon; nada: Nada }> = {
  tambah: { label: 'Ditambahkan', Icon: Plus, nada: 'ok' },
  edit: { label: 'Data diubah', Icon: Pencil, nada: 'info' },
  hapus: { label: 'Dihapus', Icon: Trash2, nada: 'bad' },
  hapus_permanen: { Icon: Trash2, nada: 'bad' },
  restore: { Icon: ArchiveRestore, nada: 'ok' },
  rollback: { Icon: Undo2, nada: 'warn' },
  meninggal: { Icon: PERISTIWA.kematian.Icon, nada: PERISTIWA.kematian.nada },
  mutasi_keluar: { Icon: PERISTIWA.pindah_keluar.Icon, nada: PERISTIWA.pindah_keluar.nada },
}

function metaAksi(aksi: string) {
  const m = AKSI_META[aksi.toLowerCase()]
  if (m) return { label: m.label ?? humanAksi(aksi), Icon: m.Icon, nada: m.nada }
  return { label: humanAksi(aksi), Icon: Activity, nada: 'info' as Nada }
}

function humanAksi(aksi: string) {
  const t = aksi.replace(/_/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function hitungUmur(tanggalLahir: string): string {
  const umur = calcUmur(tanggalLahir)
  if (umur < 0) return '—'
  return `${umur} tahun`
}

export default function DetailPendudukPage() {
  const { dusunDariRt } = useDusunAktif()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data, isLoading } = usePendudukDetail(id)
  const { data: allPenduduk = [] } = usePendudukList()
  const deleteMutation = useDeletePenduduk()
  const { isAdmin, isOperator } = useAuthStore()
  const { wilayah } = useAppStore()
  const { toast } = useToast()
  const { data: riwayat = [], isLoading: loadingRiwayat } = useLogByNik(data?.nik ?? '')

  const [showDelete, setShowDelete] = useState(false)
  const [showCatatPindah, setShowCatatPindah] = useState(false)
  const [showCatatMeninggal, setShowCatatMeninggal] = useState(false)
  const [showKKModal, setShowKKModal] = useState(false)
  const [showCetak, setShowCetak] = useState(false)

  const canEdit = isOperator()
  const canDelete = isAdmin()
  const isAktif = data?.status === 'aktif'

  const anggotaKK = data ? allPenduduk.filter((p) => p.no_kk === data.no_kk) : []
  const anggotaAktif = anggotaKK.filter((p) => p.status === 'aktif')

  async function handleDelete() {
    if (!data) return
    try {
      await deleteMutation.mutateAsync({ id: data.id, nama: data.nama_lengkap })
      toast(`${data.nama_lengkap} dipindahkan ke Tempat Sampah`, 'success')
      router.push('/recycle-bin')
    } catch {
      toast('Gagal menghapus data penduduk', 'error')
    }
  }

  async function salin(nilai: string, label: string) {
    try {
      await navigator.clipboard.writeText(nilai)
      toast(`${label} tersalin`, 'success')
    } catch {
      toast(`Gagal menyalin ${label}`, 'error')
    }
  }

  const tombolKembali = (
    <Button type="button" variant="ghost" size="sm" className="back" onClick={() => router.back()}>
      <ArrowLeft className="i" />
      Kembali
    </Button>
  )

  return (
    <AppShell title="Detail Penduduk">
      <>
        {tombolKembali}

        {isLoading ? (
          <>
            <div className="a-hero2" aria-busy="true">
              <div className="top">
                <Skeleton className="av" style={{ width: 88, height: 88, borderRadius: 24, flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skeleton style={{ height: 28, width: '55%' }} />
                  <Skeleton style={{ height: 22, width: '40%' }} />
                  <Skeleton style={{ height: 18, width: '70%' }} />
                </div>
              </div>
            </div>
            <div className="twocol">
              <div className="col">
                <Skeleton style={{ height: 260, borderRadius: 16 }} />
                <Skeleton style={{ height: 200, borderRadius: 16 }} />
              </div>
              <div className="col">
                <Skeleton style={{ height: 240, borderRadius: 16 }} />
              </div>
            </div>
          </>
        ) : !data ? (
          <div className="a-card">
            <div className="a-empty" style={{ padding: '70px 24px' }}>
              <div className="em"><User className="i" style={{ fontSize: 30 }} /></div>
              <h3>Data penduduk tidak ditemukan</h3>
              <p>Data ini mungkin sudah dihapus atau dipindahkan ke Tempat Sampah.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button asChild variant="outline" style={{ marginTop: 0 }}>
                  <Link href="/penduduk">Ke daftar penduduk</Link>
                </Button>
                <Button asChild style={{ marginTop: 0 }}>
                  <Link href="/recycle-bin"><Trash2 className="i" />Buka Tempat Sampah</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Hero: avatar, nama, status, NIK/No. KK, bar aksi */}
            <div className="a-hero2">
              <div className="top">
                <div className={`a-avatar ${data.jenis_kelamin === 'Laki-laki' ? 'lk' : 'pr'} av`} aria-hidden="true">
                  {getInisial(data.nama_lengkap)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2>{data.nama_lengkap}</h2>
                    <span className={`a-badge ${STATUS_BADGE[data.status]?.kelas ?? 'mute'}`}>
                      {STATUS_BADGE[data.status]?.label ?? data.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                    <span className={`a-badge nd ${data.hubungan_keluarga === 'Kepala Keluarga' ? 'info' : 'mute'}`}>
                      {data.hubungan_keluarga}
                    </span>
                    <span className="a-badge nd mute">
                      <JkIkon jk={data.jenis_kelamin} size={13} /> {data.jenis_kelamin}
                      {hitungUmur(data.tanggal_lahir) !== '—' ? ` · ${hitungUmur(data.tanggal_lahir)}` : ''}
                    </span>
                    <span className="a-badge nd mute">RT {rt3(data.rt)}/RW {rt3(data.rw)}</span>
                  </div>
                  <div className="idr">
                    <div>
                      <span>NIK</span>
                      <b>{data.nik || '—'}</b>
                      {data.nik && (
                        <button type="button" className="a-copy" aria-label="Salin NIK" onClick={() => salin(data.nik, 'NIK')}>
                          <Copy className="i" />
                        </button>
                      )}
                    </div>
                    <div>
                      <span>No. KK</span>
                      {isAktif ? (
                        <>
                          <button type="button" className="lkk lkk-btn" onClick={() => setShowKKModal(true)}>
                            <b>{data.no_kk || '—'}</b>
                          </button>
                          <button type="button" className="lkk2 lkk-btn" onClick={() => setShowKKModal(true)}>
                            Lihat {anggotaKK.length || ''} anggota →
                          </button>
                        </>
                      ) : (
                        <b>{data.no_kk || '—'}</b>
                      )}
                      {data.no_kk && (
                        <button type="button" className="a-copy" aria-label="Salin No. KK" onClick={() => salin(data.no_kk, 'No. KK')}>
                          <Copy className="i" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {(canEdit || canDelete || isAktif) && (
                <div className="bar">
                  {canEdit && (
                    <Button asChild>
                      <Link href={`/penduduk/${id}/edit`}><Pencil className="i" />Edit data</Link>
                    </Button>
                  )}
                  {canEdit && isAktif && (
                    <>
                      <Button type="button" variant="outline" onClick={() => setShowCatatPindah(true)}>
                        <PERISTIWA.pindah_keluar.Icon className="i" />Catat pindah
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowCatatMeninggal(true)}>
                        <PERISTIWA.kematian.Icon className="i" />Catat meninggal
                      </Button>
                    </>
                  )}
                  {isAktif && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowCetak(true)}
                      disabled={anggotaAktif.length === 0}
                    >
                      <Printer className="i" />Cetak KK Sementara
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      variant="destructive"
                      style={{ marginLeft: 'auto' }}
                      aria-label="Hapus data"
                      onClick={() => setShowDelete(true)}
                    >
                      <Trash2 className="i" /><span className="hm">Hapus</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="twocol">
              <div className="col">
                <KvCard
                  title="Data diri"
                  items={[
                    { k: 'Jenis kelamin', v: data.jenis_kelamin },
                    { k: 'Umur', v: hitungUmur(data.tanggal_lahir) },
                    { k: 'Tempat, tanggal lahir', v: `${toProper(data.tempat_lahir)}, ${formatTanggalLahir(data.tanggal_lahir)}`, lebar: true },
                    { k: 'Agama', v: data.agama || '—' },
                    { k: 'Status perkawinan', v: data.status_perkawinan || '—' },
                    { k: 'Pendidikan', v: data.pendidikan || '—' },
                    { k: 'Pekerjaan', v: data.pekerjaan || '—' },
                  ]}
                />
                <KvCard
                  title="Keluarga"
                  items={[
                    { k: 'Hubungan keluarga', v: data.hubungan_keluarga || '—' },
                    { k: 'No. KK', v: <span style={{ color: 'var(--lk)' }}>{data.no_kk || '—'}</span>, mono: true },
                    { k: 'Nama ayah', v: data.nama_ayah || '—' },
                    { k: 'Nama ibu', v: data.nama_ibu || '—' },
                  ]}
                />
                <KvCard
                  title="Domisili"
                  items={[
                    { k: 'RT', v: rt3(data.rt) },
                    { k: 'RW', v: rt3(data.rw) },
                    { k: 'Dusun', v: dusunDariRt(data.rt) || '—' },
                    { k: 'Alamat', v: data.alamat || '—', lebar: true },
                  ]}
                />
              </div>

              {/* ── Riwayat Perubahan Data ── */}
              <div className="col">
                <div className="a-card lift">
                  <div className="ch">
                    <div>
                      <h3>Riwayat Perubahan Data</h3>
                      <p>Aktivitas yang tercatat sejak sistem log aktif</p>
                    </div>
                    {!loadingRiwayat && <span className="a-badge nd mute sm">{riwayat.length} entri</span>}
                  </div>

                  {loadingRiwayat ? (
                    <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 52 }} />)}
                    </div>
                  ) : riwayat.length === 0 ? (
                    <div className="a-empty" style={{ padding: '36px 20px' }}>
                      <div className="em" style={{ width: 56, height: 56, borderRadius: 18 }}>
                        <History className="i" style={{ fontSize: 24 }} />
                      </div>
                      <h3 style={{ fontSize: 15.5 }}>Belum ada riwayat tercatat</h3>
                      <p>Riwayat hanya tersedia untuk aktivitas setelah sistem log aktif</p>
                    </div>
                  ) : (
                    <div className="a-tl" style={{ padding: '18px 20px 20px' }}>
                      {riwayat.map((log) => {
                        const { label, Icon, nada } = metaAksi(log.aksi)
                        return (
                          <div key={log.id} className="a-tli">
                            <div className={`pt ${nada}`}><Icon className="i" style={{ fontSize: 11 }} /></div>
                            <div className="tx">
                              <b>{label}</b>
                              {log.keterangan && <p>{log.keterangan}</p>}
                              <span>{formatWaktuRiwayat(log.ts)} · oleh {log.oleh}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <DeleteDialog open={showDelete} nama={data?.nama_lengkap ?? ''} loading={deleteMutation.isPending}
          onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
        {showCatatPindah && data && (
          <CatatPindahKeluarModal penduduk={data} allPenduduk={allPenduduk} onClose={() => setShowCatatPindah(false)}
            onSuccess={() => { setShowCatatPindah(false); router.refresh() }} />
        )}
        {showCatatMeninggal && data && (
          <CatatMeninggalModal penduduk={data} allPenduduk={allPenduduk}
            onClose={() => setShowCatatMeninggal(false)}
            onSuccess={() => { setShowCatatMeninggal(false); router.refresh() }} />
        )}
        {showKKModal && data && (
          <KKModal noKk={data.no_kk} allPenduduk={allPenduduk}
            onClose={() => setShowKKModal(false)}
            onNavigate={(targetId) => router.push(`/penduduk/${targetId}`)} />
        )}
        {showCetak && data && (
          <CetakKKModal noKk={data.no_kk} anggota={anggotaAktif} wilayah={wilayah}
            onClose={() => setShowCetak(false)} />
        )}
      </>
    </AppShell>
  )
}
