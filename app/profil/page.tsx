'use client'

import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Lock, Save, ShieldCheck, User, CircleAlert, CircleCheck } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { ROLE_LABEL } from '@/components/layout/nav'
import { Button } from '@/components/ui/button'
import { Field, InBox } from '@/components/ui/field'
import { useAuthStore } from '@/store/authStore'
import { useUpdateNama, useGantiPassword } from '@/hooks/useProfile'
import { getInisial } from '@/lib/utils'

type Status = { ok: boolean; msg: string }

// ── Status kecil: sukses / galat (pesan persis zip) ───────────────────────────
function StatusMsg({ ok, msg }: Status) {
  return (
    <div className={`a-alert ${ok ? 'ok' : 'bad'}`} role={ok ? 'status' : 'alert'}>
      {ok ? <CircleCheck className="i" /> : <CircleAlert className="i" />}
      <div>{msg}</div>
    </div>
  )
}

// ── Isian kata sandi dengan tombol tampil/sembunyi ────────────────────────────
function SandiField({
  id, label, ikon, value, onChange, autoComplete, hint, salah,
}: {
  id: string; label: string; ikon: React.ReactNode
  value: string; onChange: (v: string) => void
  autoComplete: string; hint?: string; salah?: boolean
}) {
  const [lihat, setLihat] = useState(false)
  return (
    <Field label={label} htmlFor={id} req hint={hint}>
      <InBox icon={ikon} error={salah}>
        <input
          placeholder="••••••••"
          id={id}
          type={lihat ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="pwt"
          onClick={() => setLihat((v) => !v)}
          aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        >
          {lihat ? <EyeOff className="i" /> : <Eye className="i" />}
        </button>
      </InBox>
    </Field>
  )
}

// ── Form Informasi Akun (ubah nama) ───────────────────────────────────────────
function EditNamaForm() {
  const { user, isAdmin } = useAuthStore()
  // Rules: users/{uid} hanya boleh ditulis admin → peran lain tidak ditawari aksi yang pasti ditolak
  const bisaUbah = isAdmin()
  // Nilai ketikan; null = ikut nama tersimpan di sesi.
  const [ketik, setKetik] = useState<string | null>(null)
  const nama = ketik ?? user?.nama ?? ''
  const [status, setStatus] = useState<Status | null>(null)
  const { mutate, isPending } = useUpdateNama()

  function handleSave() {
    if (!bisaUbah || !nama.trim()) return
    setStatus(null)
    mutate(nama.trim(), {
      onSuccess: () => { setKetik(null); setStatus({ ok: true, msg: 'Nama berhasil diperbarui.' }) },
      onError: () => setStatus({ ok: false, msg: 'Gagal menyimpan. Coba lagi.' }),
    })
  }

  return (
    <form className="a-card" noValidate onSubmit={(e) => { e.preventDefault(); handleSave() }}>
      <div className="ch">
        <div>
          <h3>Informasi akun</h3>
          <p>Email, peran, dan nama lengkap · nama tampil di log aktivitas</p>
        </div>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Nama lengkap" htmlFor="pf-nama" req hint={bisaUbah ? undefined : 'Nama hanya dapat diubah oleh admin.'}>
          <InBox icon={<User className="i" />} className={bisaUbah ? undefined : 'ph'}>
            <input
              placeholder="Masukkan nama lengkap"
              id="pf-nama"
              type="text"
              value={nama}
              maxLength={80}
              onChange={(e) => { setKetik(e.target.value); setStatus(null) }}
              autoComplete="off"
              readOnly={!bisaUbah}
              disabled={!bisaUbah}
            />
          </InBox>
        </Field>
        <Field label="Email" htmlFor="pf-email" hint="Email tidak dapat diubah.">
          <InBox icon={<Lock className="i" />} className="ph">
            <input id="pf-email" type="text" value={user?.email ?? ''} readOnly disabled />
          </InBox>
        </Field>
        <div className="a-field">
          <label>Peran</label>
          <div>
            <span className="a-badge info">{user?.role ? ROLE_LABEL[user.role] ?? user.role : '—'}</span>
          </div>
        </div>
        {status && <StatusMsg ok={status.ok} msg={status.msg} />}
        <Button type="submit" disabled={isPending || !nama.trim() || !bisaUbah} style={{ alignSelf: 'flex-start' }}>
          <Save className="i" />{isPending ? 'Menyimpan...' : 'Simpan nama'}
        </Button>
      </div>
    </form>
  )
}

// ── Form Ganti Kata Sandi ─────────────────────────────────────────────────────
type KolomSandi = 'lama' | 'baru' | 'konfirmasi'

function GantiPasswordForm() {
  const [form, setForm] = useState({ lama: '', baru: '', konfirmasi: '' })
  const [status, setStatus] = useState<Status | null>(null)
  // Kolom yang diberi tanda galat (pesan tetap satu, persis zip)
  const [kolom, setKolom] = useState<KolomSandi | null>(null)
  const { mutate, isPending } = useGantiPassword()

  function set(field: KolomSandi, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setStatus(null)
    setKolom(null)
  }

  function gagal(msg: string, k: KolomSandi | null = null) {
    setStatus({ ok: false, msg })
    setKolom(k)
  }

  function handleSave() {
    if (!form.lama || !form.baru || !form.konfirmasi) {
      gagal('Semua field wajib diisi.')
      return
    }
    if (form.baru.length < 6) {
      gagal('Kata sandi baru minimal 6 karakter.', 'baru')
      return
    }
    if (form.baru !== form.konfirmasi) {
      gagal('Konfirmasi kata sandi tidak cocok.', 'konfirmasi')
      return
    }

    function berhasil() {
      setStatus({ ok: true, msg: 'Kata sandi berhasil diubah.' })
      setKolom(null)
      setForm({ lama: '', baru: '', konfirmasi: '' })
    }

    mutate(
      { passwordLama: form.lama, passwordBaru: form.baru },
      {
        onSuccess: berhasil,
        onError: (err: unknown) => {
          const code = (err as { code?: string })?.code
          if (code === 'permission-denied') {
            // Langkah terakhir hook hanya mencatat log, yang ditolak rules untuk peran lihat-saja.
            // Kata sandi SUDAH berubah (langkah sebelumnya berhasil), jadi jangan tampilkan gagal.
            berhasil()
          } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
            gagal('Kata sandi lama salah.', 'lama')
          } else if (code === 'auth/too-many-requests') {
            gagal('Terlalu banyak percobaan. Coba lagi nanti.')
          } else {
            gagal('Gagal mengganti kata sandi. Coba lagi.')
          }
        },
      }
    )
  }

  return (
    <form className="a-card" noValidate onSubmit={(e) => { e.preventDefault(); handleSave() }}>
      <div className="ch">
        <div>
          <h3>Ganti kata sandi</h3>
          <p>Gunakan minimal 6 karakter</p>
        </div>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SandiField id="pw-lama" label="Kata sandi lama" ikon={<Lock className="i" />}
          value={form.lama} onChange={(v) => set('lama', v)} autoComplete="current-password" salah={kolom === 'lama'} />
        <SandiField id="pw-baru" label="Kata sandi baru" ikon={<KeyRound className="i" />}
          value={form.baru} onChange={(v) => set('baru', v)} autoComplete="new-password" hint="Minimal 6 karakter." salah={kolom === 'baru'} />
        <SandiField id="pw-konf" label="Konfirmasi kata sandi baru" ikon={<ShieldCheck className="i" />}
          value={form.konfirmasi} onChange={(v) => set('konfirmasi', v)} autoComplete="new-password" salah={kolom === 'konfirmasi'} />
        {status && <StatusMsg ok={status.ok} msg={status.msg} />}
        <Button type="submit" disabled={isPending} style={{ alignSelf: 'flex-start' }}>
          <KeyRound className="i" />{isPending ? 'Menyimpan...' : 'Ganti kata sandi'}
        </Button>
      </div>
    </form>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function ProfilPage() {
  const { user } = useAuthStore()

  return (
    <AppShell title="Profil saya">
      <div className="pg-narrow">
        <PageHeader title="Profil saya" description="Kelola informasi akun dan keamanan" />

        <div className="a-card" style={{ marginBottom: 16 }}>
          <div className="a-hero2" style={{ border: 0, boxShadow: 'none', borderRadius: '16px 16px 0 0' }}>
            <div className="top" style={{ padding: '26px 24px 20px' }}>
              <div className="a-avatar lk av" style={{ width: 72, height: 72, fontSize: 26, borderRadius: 20 }}>
                {getInisial(user?.nama || user?.email || '')}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 22 }}>{user?.nama || '(nama belum diisi)'}</h2>
                <p style={{ margin: '4px 0 8px', color: 'var(--ink-3)', fontSize: 14, overflowWrap: 'anywhere' }}>{user?.email}</p>
                <span className="a-badge gold">{user?.role ? ROLE_LABEL[user.role] ?? user.role : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="g2 eq">
          <EditNamaForm />
          <GantiPasswordForm />
        </div>
      </div>
    </AppShell>
  )
}
