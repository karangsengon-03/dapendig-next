'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PendudukForm } from '@/components/penduduk/PendudukForm'
import { usePendudukDetail, useUpdatePenduduk } from '@/hooks/usePenduduk'
import { useToast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { PendudukFormData } from '@/types'

export default function EditPendudukPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data, isLoading } = usePendudukDetail(id)
  const updateMutation = useUpdatePenduduk(id)
  const { toast } = useToast()

  async function handleSubmit(formData: PendudukFormData) {
    try {
      await updateMutation.mutateAsync(formData)
      toast(`Data ${formData.nama_lengkap} berhasil diperbarui`, 'success')
      router.push(`/penduduk/${id}`)
    } catch {
      toast('Gagal memperbarui data penduduk', 'error')
    }
  }

  const initial: Partial<PendudukFormData> | undefined = data
    ? {
        nik: data.nik,
        nama_lengkap: data.nama_lengkap,
        no_kk: data.no_kk,
        hubungan_keluarga: data.hubungan_keluarga,
        jenis_kelamin: data.jenis_kelamin,
        tempat_lahir: data.tempat_lahir,
        tanggal_lahir: data.tanggal_lahir,
        agama: data.agama,
        pendidikan: data.pendidikan,
        pekerjaan: data.pekerjaan,
        status_perkawinan: data.status_perkawinan,
        rt: data.rt,
        rw: data.rw,
        alamat: data.alamat ?? '',
        status: data.status,
      }
    : undefined

  return (
    <AppShell title="Edit Penduduk">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 flex-shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-100">Edit Penduduk</h1>
            <p className="text-xs text-slate-500">
              {isLoading ? 'Memuat...' : (data?.nama_lengkap ?? '')}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          ) : !data ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Data tidak ditemukan
            </p>
          ) : (
            <PendudukForm
              mode="edit"
              initial={initial}
              editId={id}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}
