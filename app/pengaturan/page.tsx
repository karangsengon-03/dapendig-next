'use client'

import { useState, useEffect } from 'react'
import { Shield, Users, MapPin, Wrench } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useUserList,
  useWilayahConfig,
  useSaveWilayah,
  useNormalisasiData,
} from '@/hooks/usePengaturan'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { EksporSection } from '@/components/pengaturan/EksporSection'
import { ImportSection } from '@/components/pengaturan/ImportSection'
import type { UserRole, ConfigWilayah, AppUser } from '@/types'

const ROLES: UserRole[] = ['admin', 'operator', 'viewer']

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  operator: 'Operator',
  viewer: 'Viewer',
}

// ── Halaman utama ─────────────────────────────────────────────────────────────

export default function PengaturanPage() {
  const { isAdmin, user: currentUser } = useAuthStore()

  if (!isAdmin()) {
    return (
      <AppShell title="Pengaturan">
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Halaman ini hanya untuk Admin</p>
            <p className="text-slate-600 text-sm mt-1">Hubungi admin untuk mengubah pengaturan</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Pengaturan">
      <div className="p-4 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2.5">
          <Shield className="w-[18px] h-[18px] text-sky-400 shrink-0" />
          <h1 className="text-base font-semibold text-slate-100">Pengaturan</h1>
        </div>
        <UserManagement currentUid={currentUser?.uid ?? ''} />
        <WilayahForm />
        <NormalisasiSection />
        <EksporSection />
        <ImportSection />
      </div>
    </AppShell>
  )
}

// ── Normalisasi Data ──────────────────────────────────────────────────────────

function NormalisasiSection() {
  const { toast } = useToast()
  const mutation = useNormalisasiData()
  const [confirm, setConfirm] = useState(false)

  async function handleNormalisasi() {
    setConfirm(false)
    try {
      const result = await mutation.mutateAsync()
      toast(
        `Normalisasi selesai: ${result.diperbarui} data diperbarui${result.gagal ? `, ${result.gagal} gagal` : ''}`,
        'success'
      )
    } catch {
      toast('Gagal menjalankan normalisasi', 'error')
    }
  }

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Wrench className="w-5 h-5 text-amber-400" />
        <h2 className="font-semibold text-slate-100">Pemeliharaan Data</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Perbaiki inkonsistensi penulisan nilai di kolom Pekerjaan dan Hubungan Keluarga agar sesuai dengan standar sistem.
      </p>
      {confirm ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Yakin menjalankan normalisasi?</span>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={handleNormalisasi}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Memproses...' : 'Ya, Jalankan'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirm(false)}>
            Batal
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirm(true)}
          className="border-amber-600/40 text-amber-400 hover:bg-amber-500/10 w-full justify-start"
        >
          <Wrench className="w-3.5 h-3.5 mr-1.5 shrink-0" />
          <span className="truncate">Normalisasi Ulang Data Pekerjaan &amp; Hub. Keluarga</span>
        </Button>
      )}
    </div>
  )
}

// ── Manajemen Pengguna ───────────────────────────────────────────────────────

function UserManagement({ currentUid }: { currentUid: string }) {
  const { data: users, isLoading } = useUserList()

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-sky-400" />
        <div>
          <h2 className="font-semibold text-slate-100">Manajemen Pengguna</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Tambah atau ubah pengguna melalui Firebase Console</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : !users?.length ? (
        <p className="text-slate-500 text-sm">Belum ada pengguna terdaftar</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Nama</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: AppUser) => {
                const isSelf = u.uid === currentUid
                return (
                  <tr key={u.uid} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3 text-slate-200 text-sm">
                      {u.email}
                      {isSelf && (
                        <span className="ml-2 text-[10px] bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/20">Anda</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-400 text-sm">{u.nama ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded px-2 py-0.5">
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

  )
}

// ── Informasi Wilayah ────────────────────────────────────────────────────────

function WilayahForm() {
  const { data, isLoading } = useWilayahConfig()
  const { mutate: save, isPending } = useSaveWilayah()
  const { toast } = useToast()
  const [form, setForm] = useState<Omit<ConfigWilayah, 'updated_at' | 'updated_by'>>({
    desa: '',
    kecamatan: '',
    kabupaten: '',
    provinsi: '',
    tahun: '',
  })

  useEffect(() => {
    if (data) {
      setForm({
        desa: data.desa ?? '',
        kecamatan: data.kecamatan ?? '',
        kabupaten: data.kabupaten ?? '',
        provinsi: data.provinsi ?? '',
        tahun: data.tahun ?? new Date().getFullYear().toString(),
      })
    }
  }, [data])

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function handleSave() {
    save(form, {
      onSuccess: () => toast('Informasi wilayah berhasil disimpan', 'success'),
      onError: () => toast('Gagal menyimpan informasi wilayah', 'error'),
    })
  }

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-sky-400" />
        <h2 className="font-semibold text-slate-100">Informasi Wilayah</h2>
        <span className="text-xs text-slate-500 ml-auto">Disimpan ke: config/wilayah</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Desa</Label>
              <Input value={form.desa} onChange={(e) => set('desa', e.target.value)} placeholder="Nama desa" />
            </div>
            <div>
              <Label>Kecamatan</Label>
              <Input value={form.kecamatan} onChange={(e) => set('kecamatan', e.target.value)} placeholder="Nama kecamatan" />
            </div>
            <div>
              <Label>Kabupaten</Label>
              <Input value={form.kabupaten} onChange={(e) => set('kabupaten', e.target.value)} placeholder="Nama kabupaten" />
            </div>
            <div>
              <Label>Provinsi</Label>
              <Input value={form.provinsi} onChange={(e) => set('provinsi', e.target.value)} placeholder="Nama provinsi" />
            </div>
            <div>
              <Label>Tahun</Label>
              <Input value={form.tahun} onChange={(e) => set('tahun', e.target.value)} placeholder="2026" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleSave} disabled={isPending} size="sm">
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
