'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Eye, EyeOff, LogIn, Loader2, UserCircle2, RefreshCw } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_NAME, APP_TAGLINE, APP_VERSION } from '@/lib/utils'

const KEY_EMAIL = 'dapendig_saved_email'
const KEY_PASS  = 'dapendig_saved_pass'

export function LoginForm() {
  const router = useRouter()

  // State dasar
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // mode:
  //   'lanjut' → ada email+pass tersimpan, langsung bisa klik Lanjutkan
  //   'ganti'  → ingin ganti akun, form terbuka (email & pass sudah terisi dari simpanan, user tinggal ubah)
  //   'baru'   → belum pernah login, form kosong
  const [mode, setMode] = useState<'lanjut' | 'ganti' | 'baru'>('baru')
  const [savedEmail, setSavedEmail] = useState('')

  useEffect(() => {
    const storedEmail = localStorage.getItem(KEY_EMAIL) ?? ''
    const storedPass  = localStorage.getItem(KEY_PASS)  ?? ''
    if (storedEmail) {
      setSavedEmail(storedEmail)
      setEmail(storedEmail)
      setPassword(storedPass)   // selalu isi password dari simpanan
      setMode('lanjut')
    } else {
      setMode('baru')
    }
  }, [])

  function handleGanti() {
    // Tetap isi email & password dari simpanan — user tinggal ubah jika mau akun lain
    setMode('ganti')
    setError('')
  }

  function handleBatalGanti() {
    // Kembali ke mode lanjut
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
      // Simpan email DAN password agar tidak pernah perlu ketik lagi
      localStorage.setItem(KEY_EMAIL, targetEmail)
      localStorage.setItem(KEY_PASS, password)
      router.replace('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setError('Email atau kata sandi salah.')
      } else if (code === 'auth/wrong-password') {
        setError('Kata sandi salah. Silakan coba lagi.')
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

  // Enter key
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !loading) handleSubmit()
  }

  const isLanjut = mode === 'lanjut'

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-sky-500/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo & brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-sky-500/10 border border-white/10">
            <img src="/icons/icon-192.png" alt="DaPenDig" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{APP_NAME}</h1>
            <p className="text-sm text-sky-400 font-medium mt-0.5">{APP_TAGLINE}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{APP_VERSION}</p>
            <p className="text-xs text-slate-500 mt-1">Desa Karang Sengon, Kec. Klabang, Kab. Bondowoso</p>
          </div>
        </div>

        {/* Card login */}
        <div className="w-full rounded-2xl border border-white/[0.08] bg-[#0d1424] p-6 shadow-2xl">
          <p className="text-sm font-semibold text-slate-300 text-center mb-5">
            {isLanjut ? 'Selamat Datang Kembali' : 'Masuk ke Akun'}
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Mode Lanjutkan — tampilkan email tersimpan */}
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
                type="button"
                onClick={handleGanti}
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors shrink-0"
              >
                <RefreshCw size={11} />
                Ganti
              </button>
            </div>
          )}

          <div className="flex flex-col gap-4" onKeyDown={handleKeyDown}>
            {/* Input email — hanya di mode ganti atau baru */}
            {!isLanjut && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@desa.id"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            )}

            {/* Password — selalu ada, sudah terisi dari simpanan */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Kata Sandi</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  autoComplete="current-password"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Tombol aksi */}
            <div className="flex flex-col gap-2 mt-1">
              <Button onClick={handleSubmit} disabled={loading} className="w-full h-11 text-sm">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Memproses...</>
                  : isLanjut
                    ? <><LogIn className="h-4 w-4" />Lanjutkan</>
                    : <><LogIn className="h-4 w-4" />Masuk</>
                }
              </Button>

              {/* Tombol batal ganti — kembali ke mode lanjut */}
              {mode === 'ganti' && (
                <button
                  type="button"
                  onClick={handleBatalGanti}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors text-center py-1"
                >
                  Batal — kembali ke akun sebelumnya
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-5 leading-relaxed">
            Hanya akun yang terdaftar yang dapat mengakses sistem ini.
          </p>
        </div>

        <p className="text-[11px] text-slate-700 text-center">
          © Pemerintah Desa Karang Sengon 2026
        </p>
      </div>
    </div>
  )
}
