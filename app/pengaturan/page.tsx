'use client'

import { useState, useEffect } from 'react'
import { Shield, Users, MapPin, Wrench, ChevronDown } from 'lucide-react'
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Shield className="w-[18px] h-[18px] text-sky-400 shrink-0" />
          <h1 className="text-base font-semibold text-slate-100">Pengaturan</h1>
        </div>
        <UserManagement currentUid={currentUser?.uid ?? ''} />
        <WilayahForm />
        <NormalisasiSection />
        <EksporSection />
        <ImportSection />

        {/* Migrasi data — collapsible */}
        {isAdmin && isAdmin() && (
          <MigrasiDataSection />
        )}
      </div>
    </AppShell>
  )
}

// ── Migrasi Data Section (collapsible) ────────────────────────────────────────

const MIGRASI_ITEMS = [
  {
    label: 'Migrasi Alamat Penduduk',
    desc: 'Isi alamat KARANG SENGON untuk semua penduduk yang belum punya alamat',
    href: '/pengaturan/migrate-alamat',
    color: 'sky' as const,
  },
  {
    label: 'Migrasi Pendidikan',
    desc: 'Ganti SLTP → SMP dan SLTA → SMA untuk semua data penduduk',
    href: '/pengaturan/migrate-pendidikan',
    color: 'sky' as const,
  },
  {
    label: 'Migrasi Format Tanggal',
    desc: 'Konversi DD/MM/YYYY → YYYY-MM-DD di semua koleksi Firestore',
    href: '/pengaturan/migrate-tanggal',
    color: 'sky' as const,
  },
  {
    label: 'Standarisasi Pendidikan & Pekerjaan',
    desc: 'Sesuai Permendagri 6/2026 — PNS→ASN (PNS), Ibu RT→Mengurus RT, dll',
    href: '/pengaturan/migrate-standarisasi',
    color: 'sky' as const,
  },
  {
    label: 'Fix Duplikat Dokumen',
    desc: 'Hapus dokumen lama yang ID-nya masih random jika NIK sudah ada',
    href: '/pengaturan/fix-duplikat',
    color: 'rose' as const,
  },
  {
    label: 'Standarisasi ID Dokumen',
    desc: 'Seragamkan semua ID dokumen penduduk menggunakan NIK',
    href: '/pengaturan/migrate-docid',
    color: 'sky' as const,
  },
  {
    label: 'Fix Tanggal Lahir (Timezone Bug)',
    desc: 'Koreksi tanggal yang bergeser -1/-2/-3 hari akibat bug konversi UTC',
    href: '/pengaturan/fix-tanggal-lahir',
    color: 'amber' as const,
  },
  {
    label: 'Sinkronisasi Tanggal Lahir dari Excel',
    desc: 'Update tanggal_lahir dari file Semua.xls Dispenduk — field lain tidak disentuh',
    href: '/pengaturan/fix-tanggal-excel',
    color: 'emerald' as const,
  },
]

const MIGRASI_COLOR = {
  sky:     'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20',
  rose:    'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20',
  amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20',
}

function MigrasiDataSection() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 text-sm">Migrasi Data</p>
          <p className="text-xs text-slate-500 mt-0.5">Utilitas migrasi & perbaikan data (admin only)</p>
        </div>
        <ChevronDown
          size={15}
          className={`text-slate-500 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-white/[0.04] flex flex-col gap-0 pt-3">
          {MIGRASI_ITEMS.map((item, i) => (
            <div key={item.href}>
              <div className="flex items-center justify-between gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
                <a
                  href={item.href}
                  className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${MIGRASI_COLOR[item.color]}`}
                >
                  Jalankan
                </a>
              </div>
              {i < MIGRASI_ITEMS.length - 1 && (
                <div className="border-t border-white/[0.06]" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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

  const [open, setOpen] = useState(false)

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 text-sm">Pemeliharaan Data</p>
          <p className="text-xs text-slate-500 mt-0.5">Normalisasi Pekerjaan & Hubungan Keluarga</p>
        </div>
        <ChevronDown
          size={15}
          className={`text-slate-500 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
      <div className="px-5 pb-5 border-t border-white/[0.04] pt-4 space-y-3">
        <p className="text-xs text-slate-500">
          Perbaiki inkonsistensi penulisan nilai di kolom Pekerjaan dan Hubungan Keluarga agar sesuai dengan standar sistem.
        </p>
      {confirm ? (
        <div className="flex items-center gap-2.5">
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
      )}
    </div>
  )
}

// ── Manajemen Pengguna ───────────────────────────────────────────────────────

function UserManagement({ currentUid }: { currentUid: string }) {
  const { data: users, isLoading } = useUserList()
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Users className="w-4 h-4 text-sky-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 text-sm">Manajemen Pengguna</p>
          <p className="text-xs text-slate-500 mt-0.5">Tambah atau ubah via Firebase Console</p>
        </div>
        <ChevronDown
          size={15}
          className={`text-slate-500 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
      <div className="px-5 pb-5 border-t border-white/[0.04] pt-4">

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
      const d = data
      setTimeout(() => {
        setForm({
          desa: d.desa ?? '',
          kecamatan: d.kecamatan ?? '',
          kabupaten: d.kabupaten ?? '',
          provinsi: d.provinsi ?? '',
          tahun: d.tahun ?? new Date().getFullYear().toString(),
        })
      }, 0)
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

  const [open, setOpen] = useState(false)

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 text-sm">Informasi Wilayah</p>
          <p className="text-xs text-slate-500 mt-0.5">Nama desa, kecamatan, kabupaten, provinsi</p>
        </div>
        <ChevronDown
          size={15}
          className={`text-slate-500 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-white/[0.04] pt-4">
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
      )}
    </div>
  )
}
