'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PendudukForm } from '@/components/penduduk/PendudukForm'
import { useAddPenduduk } from '@/hooks/usePenduduk'
import { useToast } from '@/components/ui/toast'
import type { PendudukFormData } from '@/types'

export default function TambahPendudukPage() {
  const router = useRouter()
  const addMutation = useAddPenduduk()
  const { toast } = useToast()

  async function handleSubmit(data: PendudukFormData) {
    try {
      await addMutation.mutateAsync(data)
      toast(`Data ${data.nama_lengkap} berhasil ditambahkan`, 'success')
      router.push('/penduduk')
    } catch {
      toast('Gagal menyimpan data penduduk', 'error')
    }
  }

  return (
    <AppShell title="Tambah Penduduk">
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
            <h1 className="text-base font-bold text-slate-100">Tambah Penduduk</h1>
            <p className="text-xs text-slate-500">Isi data penduduk baru</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-4">
          <PendudukForm mode="tambah" onSubmit={handleSubmit} />
        </div>
      </div>
    </AppShell>
  )
}
