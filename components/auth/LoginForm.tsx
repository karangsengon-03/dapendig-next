'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Eye, EyeOff, LogIn, Loader2, Lock, Mail, Moon, Sun } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { APP_VERSION } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useIdentitasDesa } from '@/hooks/useIdentitasDesa'
import { labelDesa, labelPemerintahDesa } from '@/lib/wilayah'
import { AppLogo } from '@/components/layout/AppLogo'
import { Avatar } from '@/components/ui/avatar'
// TIDAK memanggil useAuthListener di sini — sudah dipanggil di AppShell.
// Memanggil dua kali menyebabkan race condition: dua subscriber onAuthStateChanged
// berlomba set loading/user, mengakibatkan flash form login sebelum redirect.

const KEY_EMAIL = 'dapendig_email'
const KEY_PASS  = 'dapendig_pass'

type Mode = 'lanjut' | 'ganti' | 'baru'

export function LoginForm() {
  const identitas = useIdentitasDesa()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { user, loading: authLoading } = useAuthStore()
  const [mode, setMode]         = useState<Mode>('baru')
  const [savedEmail, setSaved]  = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    const e = localStorage.getItem(KEY_EMAIL) ?? ''
    const p = localStorage.getItem(KEY_PASS)  ?? ''
    if (e) {
      setTimeout(() => {
        setSaved(e)
        setEmail(e)
        setPassword(p)
        setMode('lanjut')
      }, 0)
    }
  }, [])

  // Redirect ke dashboard jika sudah login
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, router])

  function handleGanti() {
    // Email & password sudah terisi dari simpanan — user bisa langsung klik Masuk
    // atau ubah dulu ke akun lain
    setMode('ganti')
    setError('')
  }

  function handleBatal() {
    setEmail(savedEmail)
    setPassword(localStorage.getItem(KEY_PASS) ?? '')
    setMode('lanjut')
    setError('')
  }

  async function handleSubmit() {
    const targetEmail = mode === 'lanjut' ? savedEmail : email
    if (!targetEmail || !password) {
      setError('Email dan kata sandi wajib diisi.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, targetEmail, password)
      localStorage.setItem(KEY_EMAIL, targetEmail)
      localStorage.setItem(KEY_PASS,  password)
      // Hard redirect agar tidak ada race condition dengan onAuthStateChanged (sengaja bukan router.push)
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setError('Email atau kata sandi salah.')
      } else if (code === 'auth/wrong-password') {
        setError('Kata sandi salah.')
      } else if (code === 'auth/invalid-email') {
        setError('Format email tidak valid.')
      } else if (code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan. Tunggu beberapa saat.')
      } else if (code === 'auth/network-request-failed') {
        setError('Gagal terhubung. Periksa koneksi internet.')
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  const isLanjut = mode === 'lanjut'
  const gelap = resolvedTheme === 'dark'

  // Saat Firebase masih memeriksa sesi ATAU user sudah terdeteksi login:
  // jangan render form login sama sekali — cegah flash sebelum redirect ke dashboard
  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <AppLogo size={80} />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="font-display text-base font-bold text-ink">Data Penduduk Digital</p>
          {labelDesa(identitas) && <p className="text-xs text-ink-3">{labelDesa(identitas)}</p>}
        </div>
        <Loader2 className="i animate-spin text-navy-600" style={{ fontSize: 22 }} />
      </div>
    )
  }

  return (
    <div className="a-lg" style={{ minHeight: '100vh' }}>
      {/* Panel merek (kiri; di HP menjadi kepala) */}
      <div className="lg-l">
        <div className="seal" />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AppLogo size={46} />
          <div>
            <b style={{ fontFamily: 'var(--f-display)', fontSize: 19, letterSpacing: '-.01em', display: 'block' }}>DaPenDig</b>
            <span style={{ fontSize: 13, color: 'var(--gold-400)' }}>Data Penduduk Digital</span>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <p className="lgh">Data warga tertib, pelayanan makin cepat.</p>
          <p style={{ margin: '14px 0 0', color: '#B8C9E3', fontSize: 15, lineHeight: 1.55, maxWidth: '38ch' }}>
            Kelola penduduk, mutasi, kelahiran, dan kematian {labelDesa(identitas) || 'desa'} dalam satu tempat.
          </p>
        </div>
        <div className="fl">
          <div><b>{APP_VERSION}</b><span>versi aplikasi</span></div>
        </div>
        <div style={{ position: 'relative', fontSize: 13, color: '#8FA5C6' }}>
          {labelPemerintahDesa(identitas)}
        </div>
      </div>

      {/* Form (kanan) */}
      <div className="lg-r">
        <button
          type="button"
          className="ib tm lgt"
          aria-label="Ganti tema"
          onClick={() => setTheme(gelap ? 'light' : 'dark')}
        >
          {gelap ? <Sun className="i" /> : <Moon className="i" />}
        </button>

        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-.025em' }}>
              {isLanjut ? 'Selamat datang kembali' : 'Masuk ke akun'}
            </h1>
            <p style={{ margin: '6px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>
              {isLanjut
                ? 'Lanjutkan sebagai akun terakhir Anda.'
                : 'Gunakan email dan kata sandi akun Anda.'}
            </p>
          </div>

          {error && (
            <p className="a-err" role="alert" style={{
              padding: '10px 14px', borderRadius: 11, background: 'var(--bad-bg)', fontSize: 14,
            }}>
              {error}
            </p>
          )}

          {/* Mode Lanjut: tampilkan email tersimpan */}
          {isLanjut && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 13,
              background: 'var(--navy-50)', border: '1px solid var(--navy-100)',
            }}>
              <Avatar nama={savedEmail} jk="L" size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)' }}>Masuk sebagai</span>
                <b style={{ display: 'block', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {savedEmail}
                </b>
              </div>
              <button
                type="button"
                onClick={handleGanti}
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--lk)', background: 'none', border: 0, cursor: 'pointer', flex: 'none' }}
              >
                Ganti akun
              </button>
            </div>
          )}

          {/* Email — hanya di mode ganti/baru */}
          {!isLanjut && (
            <div className="a-field">
              <label htmlFor="lg-email">Email</label>
              <div className={`a-in${error ? ' err' : ''}`}>
                <Mail className="i" />
                <input
                  id="lg-email"
                  type="email"
                  placeholder="nama@desa.id"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Kata sandi — selalu tampil, sudah terisi dari simpanan */}
          <div className="a-field">
            <label htmlFor="lg-pass">Kata sandi</label>
            <div className={`a-in${error ? ' err' : ''}`}>
              <Lock className="i" />
              <input
                id="lg-pass"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                autoComplete="current-password"
                disabled={loading}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
              />
              <button
                type="button"
                className="pwt"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPw ? <EyeOff className="i" /> : <Eye className="i" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="a-btn pri lg"
            style={{ width: '100%' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <><Loader2 className="i animate-spin" />Memproses...</>
              : <><LogIn className="i" />{isLanjut ? 'Lanjutkan' : 'Masuk'}</>}
          </button>

          {mode === 'ganti' && savedEmail && (
            <button
              type="button"
              onClick={handleBatal}
              style={{ fontSize: 13, color: 'var(--ink-3)', background: 'none', border: 0, cursor: 'pointer', padding: '2px 0' }}
            >
              ← Kembali ke akun sebelumnya
            </button>
          )}

          <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
            © {labelPemerintahDesa({ desa: identitas.desa })} {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
