'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, User, LogOut, HeartCrack } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DeleteDialog } from '@/components/penduduk/DeleteDialog'
import { CatatPindahKeluarModal } from '@/components/penduduk/CatatPindahKeluarModal'
import { CatatMeninggalModal } from '@/components/penduduk/CatatMeninggalModal'
import { KKModal } from '@/components/penduduk/KKModal'
import { usePendudukDetail, useDeletePenduduk, usePendudukList } from '@/hooks/usePenduduk'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</span>
      <span className="text-sm text-slate-200">{children}</span>
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  'aktif': 'Aktif', 'tidak aktif': 'Tidak Aktif',
  'meninggal': 'Meninggal', 'mutasi-keluar': 'Mutasi Keluar',
}
const STATUS_COLOR: Record<string, string> = {
  'aktif': 'text-emerald-400', 'tidak aktif': 'text-slate-400',
  'meninggal': 'text-rose-400', 'mutasi-keluar': 'text-orange-400',
}

function toProper(s: string) {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function hitungUmur(tanggalLahir: string): string {
  if (!tanggalLahir) return '—'
  const lahir = new Date(tanggalLahir + 'T00:00:00')
  const now = new Date()
  let umur = now.getFullYear() - lahir.getFullYear()
  if (now.getMonth() - lahir.getMonth() < 0 ||
    (now.getMonth() - lahir.getMonth() === 0 && now.getDate() < lahir.getDate())) umur--
  return `${umur} tahun`
}

export default function DetailPendudukPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data, isLoading } = usePendudukDetail(id)
  const { data: allPenduduk = [] } = usePendudukList()
  const deleteMutation = useDeletePenduduk()
  const { isAdmin, isOperator } = useAuthStore()
  const { toast } = useToast()

  const [showDelete, setShowDelete] = useState(false)
  const [showCatatPindah, setShowCatatPindah] = useState(false)
  const [showCatatMeninggal, setShowCatatMeninggal] = useState(false)
  const [showKKModal, setShowKKModal] = useState(false)

  const canEdit = isOperator()
  const canDelete = isAdmin()
  const isAktif = data?.status === 'aktif'

  async function handleDelete() {
    if (!data) return
    try {
      await deleteMutation.mutateAsync({ id: data.id, nama: data.nama_lengkap })
      toast(`Data ${data.nama_lengkap} dipindahkan ke tempat sampah`, 'success')
      router.push('/penduduk')
    } catch {
      toast('Gagal menghapus data penduduk', 'error')
    }
  }

  return (
    <AppShell title="Detail Penduduk">
      <div className="flex flex-col gap-4">
        {/* Sub-header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 flex-shrink-0">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-100">
              {isLoading ? <Skeleton className="h-5 w-40 rounded" /> : (data?.nama_lengkap ?? 'Detail Penduduk')}
            </h1>
            <p className="text-xs text-slate-500">NIK: {isLoading ? '...' : (data?.nik ?? '—')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#0d1424] border border-white/[0.06] flex items-center justify-center">
              <User size={24} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">Data tidak ditemukan</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Identitas */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] px-4 py-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400/70 pt-3 pb-1">Identitas</p>
                <DetailRow label="NIK">{data.nik || '—'}</DetailRow>
                <DetailRow label="No. KK">
                  {isAktif ? (
                    <button onClick={() => setShowKKModal(true)}
                      className="text-sky-400 underline underline-offset-2 hover:text-sky-300 transition-colors text-sm text-left">
                      {data.no_kk || '—'}
                    </button>
                  ) : <>{data.no_kk || '—'}</>}
                </DetailRow>
                <DetailRow label="Nama Lengkap">{data.nama_lengkap}</DetailRow>
                <DetailRow label="Hubungan Keluarga">{data.hubungan_keluarga}</DetailRow>
                <DetailRow label="Status">
                  <span className={STATUS_COLOR[data.status] ?? 'text-slate-200'}>
                    {STATUS_LABEL[data.status] ?? data.status}
                  </span>
                </DetailRow>
              </div>

              {/* Data Diri */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] px-4 py-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400/70 pt-3 pb-1">Data Diri</p>
                <DetailRow label="Jenis Kelamin">{data.jenis_kelamin}</DetailRow>
                <DetailRow label="Tempat, Tanggal Lahir">
                  {`${toProper(data.tempat_lahir)}, ${new Date(data.tanggal_lahir + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </DetailRow>
                <DetailRow label="Umur">{hitungUmur(data.tanggal_lahir)}</DetailRow>
                <DetailRow label="Agama">{data.agama}</DetailRow>
                <DetailRow label="Pendidikan">{data.pendidikan}</DetailRow>
                <DetailRow label="Pekerjaan">{data.pekerjaan}</DetailRow>
                <DetailRow label="Status Perkawinan">{data.status_perkawinan}</DetailRow>
              </div>

              {/* Domisili */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] px-4 py-1 md:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400/70 pt-3 pb-1">Domisili</p>
                <div className="grid grid-cols-2">
                  <DetailRow label="RT">{data.rt}</DetailRow>
                  <DetailRow label="RW">{data.rw}</DetailRow>
                </div>
                {data.alamat && (
                  <DetailRow label="Alamat">{data.alamat}</DetailRow>
                )}
              </div>
            </div>

            {/* Tombol aksi — Baris 1: Edit | Hapus, Baris 2: Catat Pindah | Catat Meninggal */}
            {(canEdit || canDelete) && (
              <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Aksi</p>
                <div className="flex flex-col gap-2">
                  {/* Baris 1: Edit & Hapus */}
                  <div className="grid grid-cols-2 gap-2">
                    {canEdit && (
                      <button onClick={() => router.push(`/penduduk/${id}/edit`)}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
                        <Pencil size={14} className="shrink-0" />
                        <span className="text-sm font-medium">Edit Data</span>
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setShowDelete(true)}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors">
                        <Trash2 size={14} className="shrink-0" />
                        <span className="text-sm font-medium">Hapus Data</span>
                      </button>
                    )}
                  </div>
                  {/* Baris 2: Catat Pindah & Catat Meninggal */}
                  {canEdit && isAktif && (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setShowCatatPindah(true)}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors">
                        <LogOut size={14} className="shrink-0" />
                        <span className="text-sm font-medium">Catat Pindah</span>
                      </button>
                      <button onClick={() => setShowCatatMeninggal(true)}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:bg-slate-500/20 transition-colors">
                        <HeartCrack size={14} className="shrink-0" />
                        <span className="text-sm font-medium">Catat Meninggal</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <DeleteDialog open={showDelete} nama={data?.nama_lengkap ?? ''} loading={deleteMutation.isPending}
        onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
      {showCatatPindah && data && (
        <CatatPindahKeluarModal penduduk={data} onClose={() => setShowCatatPindah(false)}
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
    </AppShell>
  )
}
