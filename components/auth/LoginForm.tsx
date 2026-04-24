'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Eye, EyeOff, LogIn, Loader2, UserCircle2, RefreshCw } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { APP_VERSION } from '@/lib/utils'

const KEY_EMAIL = 'dapendig_email'
const KEY_PASS  = 'dapendig_pass'

type Mode = 'lanjut' | 'ganti' | 'baru'

export function LoginForm() {
  const router = useRouter()
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
      setSaved(e)
      setEmail(e)
      setPassword(p)   // isi password dari simpanan — tidak perlu ketik ulang
      setMode('lanjut')
    }
  }, [])

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
      router.replace('/dashboard')
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

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-sky-500/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border border-white/10">
            <img src="/icons/icon-192.png" alt="DaPenDig" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-100 tracking-tight">Data Penduduk Digital</p>
            <p className="text-xs text-slate-500 mt-0.5">Desa Karang Sengon, Kec. Klabang, Kab. Bondowoso</p>
            <p className="text-[10px] text-slate-700 mt-1">{APP_VERSION}</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-white/[0.08] bg-[#0d1424] p-6 shadow-2xl">
          <p className="text-sm font-semibold text-slate-300 text-center mb-5">
            {isLanjut ? 'Selamat Datang Kembali' : 'Masuk ke Akun'}
          </p>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Mode Lanjut: tampilkan email tersimpan */}
          {isLanjut && (
            <div className="mb-5 px-3.5 py-3 rounded-xl bg-sky-500/8 border border-sky-500/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                <UserCircle2 size={16} className="text-sky-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-500">Masuk sebagai</p>
                <p className="text-sm font-medium text-slate-200 truncate">{savedEmail}</p>
              </div>
              <button
                onClick={handleGanti}
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors shrink-0"
              >
                <RefreshCw size={11} />Ganti
              </button>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Email — hanya di mode ganti/baru */}
            {!isLanjut && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="nama@desa.id"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoComplete="email"
                  disabled={loading}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
            )}

            {/* Password — selalu tampil, sudah terisi dari simpanan */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  autoComplete="current-password"
                  disabled={loading}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                  className="w-full bg-[#111827] border border-white/[0.08] rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Tombol */}
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-sm font-semibold text-white transition-colors"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Memproses...</>
                  : isLanjut
                    ? <><LogIn className="h-4 w-4" />Lanjutkan</>
                    : <><LogIn className="h-4 w-4" />Masuk</>
                }
              </button>

              {mode === 'ganti' && savedEmail && (
                <button
                  onClick={handleBatal}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
                >
                  ← Kembali ke akun sebelumnya
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-700">
          © Pemerintah Desa Karang Sengon 2026
        </p>
      </div>
    </div>
  )
}
