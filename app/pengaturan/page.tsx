'use client'

import { useState, useEffect } from 'react'
import { Shield, Users, MapPin, ChevronDown, Wrench } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useUserList,
  useUpdateUserRole,
  useDeleteUser,
  useWilayahConfig,
  useSaveWilayah,
  useNormalisasiData,
} from '@/hooks/usePengaturan'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { EksporSection } from '@/components/pengaturan/EksporSection'
import { ImportSection } from '@/components/pengaturan/ImportSection'
import type { UserRole, ConfigWilayah } from '@/types'

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
        <h1 className="text-lg font-bold text-slate-100">Pengaturan</h1>
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
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
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
          className="border-amber-600/40 text-amber-400 hover:bg-amber-500/10"
        >
          <Wrench className="w-3.5 h-3.5 mr-1.5" />
          Normalisasi Ulang Data Pekerjaan &amp; Hub. Keluarga
        </Button>
      )}
    </div>
  )
}

// ── Manajemen Pengguna ───────────────────────────────────────────────────────

function UserManagement({ currentUid }: { currentUid: string }) {
  const { data: users, isLoading } = useUserList()
  const { mutate: updateRole, isPending: updatingRole } = useUpdateUserRole()
  const { mutate: deleteUser, isPending: deletingUser } = useDeleteUser()
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<{ uid: string; email: string } | null>(null)

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-sky-400" />
        <h2 className="font-semibold text-slate-100">Manajemen Pengguna</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : !users?.length ? (
        <p className="text-slate-500 text-sm">Belum ada pengguna terdaftar di Firestore</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-400 text-left">
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Nama</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.uid === currentUid
                return (
                  <tr key={u.uid} className="border-t border-slate-700/50 hover:bg-slate-800/40">
                    <td className="px-3 py-3 text-slate-200">
                      {u.email}
                      {isSelf && (
                        <span className="ml-2 text-xs bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded">Anda</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-400">{u.nama ?? '-'}</td>
                    <td className="px-3 py-3">
                      {isSelf ? (
                        <span className="text-slate-400">{ROLE_LABEL[u.role]}</span>
                      ) : (
                        <div className="relative inline-block">
                          <select
                            value={u.role}
                            disabled={updatingRole}
                            onChange={(e) =>
                              updateRole(
                                { uid: u.uid, role: e.target.value as UserRole },
                                {
                                  onSuccess: () => toast(`Role ${u.email} diperbarui`, 'success'),
                                  onError: () => toast('Gagal memperbarui role', 'error'),
                                }
                              )
                            }
                            className="bg-slate-900 border border-slate-600 text-slate-200 rounded px-2 py-1 text-xs pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {!isSelf && (
                        <button
                          onClick={() => setDeleteTarget({ uid: u.uid, email: u.email })}
                          disabled={deletingUser}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1 border border-red-800/50 rounded hover:bg-red-900/20"
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-semibold text-slate-100 mb-2">Hapus Pengguna</h3>
            <p className="text-sm text-slate-400 mb-5">
              Hapus akses <span className="font-medium text-slate-200">{deleteTarget.email}</span>?
              Dokumen di koleksi <code className="text-sky-400">users</code> akan dihapus, akun Firebase Auth tidak terpengaruh.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deletingUser}>
                Batal
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() =>
                  deleteUser(
                    { uid: deleteTarget.uid, email: deleteTarget.email },
                    {
                      onSuccess: () => {
                        setDeleteTarget(null)
                        toast(`Akses ${deleteTarget.email} dicabut`, 'success')
                      },
                      onError: () => toast('Gagal menghapus pengguna', 'error'),
                    }
                  )
                }
                disabled={deletingUser}
              >
                {deletingUser ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
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
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
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
