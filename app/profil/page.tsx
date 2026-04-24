'use client'

import { useState, useEffect } from 'react'
import { User, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { useUpdateNama, useGantiPassword } from '@/hooks/useProfile'
import { getInisial } from '@/lib/utils'

// ── Status kecil: sukses / error ─────────────────────────────────────────────

function StatusMsg({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
        ok
          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
      }`}
    >
      {ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      <span>{msg}</span>
    </div>
  )
}

// ── Form Edit Nama ────────────────────────────────────────────────────────────

function EditNamaForm() {
  const { user } = useAuthStore()
  const [nama, setNama] = useState(user?.nama ?? '')
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const { mutate, isPending } = useUpdateNama()

  useEffect(() => {
    setNama(user?.nama ?? '')
  }, [user?.nama])

  function handleSave() {
    if (!nama.trim()) return
    setStatus(null)
    mutate(nama.trim(), {
      onSuccess: () => setStatus({ ok: true, msg: 'Nama berhasil diperbarui.' }),
      onError: () => setStatus({ ok: false, msg: 'Gagal menyimpan. Coba lagi.' }),
    })
  }

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-sky-400" />
        <h2 className="font-semibold text-slate-100">Informasi Akun</h2>
      </div>

      <div className="space-y-3">
        {/* Email — read only */}
        <div>
          <Label>Email</Label>
          <Input value={user?.email ?? ''} readOnly disabled className="opacity-60 cursor-not-allowed" />
          <p className="text-xs text-slate-600 mt-1">Email tidak dapat diubah.</p>
        </div>

        {/* Role — read only */}
        <div>
          <Label>Role</Label>
          <Input
            value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
            readOnly
            disabled
            className="opacity-60 cursor-not-allowed"
          />
        </div>

        {/* Nama */}
        <div>
          <Label>Nama Lengkap</Label>
          <Input
            value={nama}
            onChange={(e) => { setNama(e.target.value); setStatus(null) }}
            placeholder="Masukkan nama lengkap"
            maxLength={80}
          />
        </div>
      </div>

      {status && <StatusMsg ok={status.ok} msg={status.msg} />}

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={isPending || !nama.trim()}>
          {isPending ? 'Menyimpan...' : 'Simpan Nama'}
        </Button>
      </div>
    </div>
  )
}

// ── Form Ganti Password ───────────────────────────────────────────────────────

function GantiPasswordForm() {
  const [form, setForm] = useState({ lama: '', baru: '', konfirmasi: '' })
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const { mutate, isPending } = useGantiPassword()

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setStatus(null)
  }

  function handleSave() {
    if (!form.lama || !form.baru || !form.konfirmasi) {
      setStatus({ ok: false, msg: 'Semua field wajib diisi.' })
      return
    }
    if (form.baru.length < 6) {
      setStatus({ ok: false, msg: 'Password baru minimal 6 karakter.' })
      return
    }
    if (form.baru !== form.konfirmasi) {
      setStatus({ ok: false, msg: 'Konfirmasi password tidak cocok.' })
      return
    }

    mutate(
      { passwordLama: form.lama, passwordBaru: form.baru },
      {
        onSuccess: () => {
          setStatus({ ok: true, msg: 'Password berhasil diubah.' })
          setForm({ lama: '', baru: '', konfirmasi: '' })
        },
        onError: (err: unknown) => {
          const code = (err as { code?: string })?.code
          if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
            setStatus({ ok: false, msg: 'Password lama salah.' })
          } else if (code === 'auth/too-many-requests') {
            setStatus({ ok: false, msg: 'Terlalu banyak percobaan. Coba lagi nanti.' })
          } else {
            setStatus({ ok: false, msg: 'Gagal mengganti password. Coba lagi.' })
          }
        },
      }
    )
  }

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-sky-400" />
        <h2 className="font-semibold text-slate-100">Ganti Password</h2>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Password Lama</Label>
          <Input
            type="password"
            value={form.lama}
            onChange={(e) => set('lama', e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label>Password Baru</Label>
          <Input
            type="password"
            value={form.baru}
            onChange={(e) => set('baru', e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <p className="text-xs text-slate-600 mt-1">Minimal 6 karakter.</p>
        </div>
        <div>
          <Label>Konfirmasi Password Baru</Label>
          <Input
            type="password"
            value={form.konfirmasi}
            onChange={(e) => set('konfirmasi', e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
      </div>

      {status && <StatusMsg ok={status.ok} msg={status.msg} />}

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Ganti Password'}
        </Button>
      </div>
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────

export default function ProfilPage() {
  const { user } = useAuthStore()

  return (
    <AppShell title="Profil Saya">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Sub-header */}
        <div className="flex items-center gap-2.5">
          <User className="w-[18px] h-[18px] text-sky-400 shrink-0" />
          <h1 className="text-base font-semibold text-slate-100">Profil Saya</h1>
        </div>
        {/* Avatar card */}
        <div className="flex items-center gap-4 bg-[#0d1424] border border-white/[0.06] rounded-2xl px-5 py-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center text-xl font-bold text-white shrink-0 select-none">
            {getInisial(user?.nama || user?.email || '')}
          </div>
          <div>
            <p className="font-semibold text-slate-100 text-base">{user?.nama || '(nama belum diisi)'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/25 rounded px-2 py-0.5">
              {user?.role}
            </span>
          </div>
        </div>

        <EditNamaForm />
        <GantiPasswordForm />
      </div>
    </AppShell>
  )
}
