'use client'

import Link from 'next/link'
import { rt3 } from '@/lib/rt-rw'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PendudukForm } from '@/components/penduduk/PendudukForm'
import { usePendudukDetail, useUpdatePenduduk } from '@/hooks/usePenduduk'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/store/authStore'
import { AksesDitolak } from '@/components/ui/akses-ditolak'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { PendudukFormData } from '@/types'

export default function EditPendudukPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data, isLoading } = usePendudukDetail(id)
  const updateMutation = useUpdatePenduduk(id)
  const { toast } = useToast()
  const { isOperator } = useAuthStore()

  async function handleSubmit(formData: PendudukFormData) {
    try {
      await updateMutation.mutateAsync(formData)
      toast(`Data ${formData.nama_lengkap} berhasil diperbarui`, 'success')
      router.push(`/penduduk/${id}`)
    } catch {
      toast('Gagal memperbarui data penduduk', 'error')
    }
  }

  // Rules: ubah penduduk = operator atau admin. Peran lihat-saja tidak melihat form (bisa dibuka lewat URL langsung).
  if (!isOperator()) {
    return (
      <AppShell title="Edit penduduk">
        <AksesDitolak
          judul="Halaman ini hanya untuk Operator atau Admin"
          keterangan="Peran Anda hanya dapat melihat data penduduk"
          href={`/penduduk/${id}`}
          label="Kembali ke detail"
        />
      </AppShell>
    )
  }

  const initial: Partial<PendudukFormData> | undefined = data
    ? {
        nik: data.nik,
        nama_lengkap: data.nama_lengkap,
        no_kk: data.no_kk,
        hubungan_keluarga: data.hubungan_keluarga,
        nama_ayah: data.nama_ayah ?? '',
        nama_ibu: data.nama_ibu ?? '',
        jenis_kelamin: data.jenis_kelamin,
        tempat_lahir: data.tempat_lahir,
        tanggal_lahir: data.tanggal_lahir,
        agama: data.agama,
        pendidikan: data.pendidikan,
        pekerjaan: data.pekerjaan,
        status_perkawinan: data.status_perkawinan,
        golongan_darah: data.golongan_darah ?? '',
        rt: rt3(data.rt) || '001',
        rw: rt3(data.rw) || '001',
        alamat: data.alamat ?? '',
        status: data.status,
      }
    : undefined

  return (
    <AppShell title="Edit penduduk">
      <>
        <PageHeader
          title="Edit penduduk"
          description={isLoading ? 'Memuat...' : data ? `${data.nama_lengkap} · NIK ${data.nik || '—'}` : undefined}
          action={
            <Button asChild variant="outline">
              <Link href={`/penduduk/${id}`} aria-label="Kembali ke detail">
                <ArrowLeft className="i" />Kembali ke detail
              </Link>
            </Button>
          }
        />

        {isLoading ? (
          <div className="editgrid" aria-busy="true">
            <div className="col" style={{ gap: 16 }}>
              {[260, 330, 150].map((h, i) => (
                <Skeleton key={i} style={{ height: h, borderRadius: 16 }} />
              ))}
            </div>
            <div className="col side">
              <Skeleton style={{ height: 150, borderRadius: 16 }} />
              <Skeleton style={{ height: 110, borderRadius: 16 }} />
            </div>
          </div>
        ) : !data ? (
          <div className="a-card">
            <div className="a-empty" style={{ padding: '70px 24px' }}>
              <div className="em"><User className="i" style={{ fontSize: 30 }} /></div>
              <h3>Data penduduk tidak ditemukan</h3>
              <p>Data ini mungkin sudah dihapus atau dipindahkan ke Tempat sampah.</p>
              <Button asChild>
                <Link href="/penduduk">Ke daftar penduduk</Link>
              </Button>
            </div>
          </div>
        ) : (
          <PendudukForm
            mode="edit"
            initial={initial}
            editId={id}
            onSubmit={handleSubmit}
          />
        )}
      </>
    </AppShell>
  )
}
