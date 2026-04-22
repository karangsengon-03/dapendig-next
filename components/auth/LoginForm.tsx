'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_NAME, APP_TAGLINE, APP_VERSION } from '@/lib/utils'

const STORAGE_KEY = 'dapendig_saved_email'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedEmail, setSavedEmail] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setSavedEmail(stored)
      setEmail(stored)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Email dan kata sandi wajib diisi.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, email)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      router.replace('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Email atau kata sandi tidak sesuai.')
      } else if (code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan. Coba lagi beberapa saat.')
      } else if (code === 'auth/network-request-failed') {
        setError('Gagal terhubung. Periksa koneksi internet.')
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLanjutkan = async () => {
    if (!savedEmail || !password) {
      setError('Masukkan kata sandi untuk melanjutkan.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, savedEmail, password)
      router.replace('/dashboard')
    } catch {
      setError('Kata sandi salah.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-sky-500/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo & brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shadow-lg shadow-sky-500/10">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L28 13H4L16 4Z" fill="#0ea5e9" fillOpacity="0.95" />
              <rect x="6" y="13" width="20" height="13" rx="1" fill="#0ea5e9" fillOpacity="0.25" />
              <rect x="13" y="19" width="6" height="7" rx="1" fill="#0ea5e9" fillOpacity="0.75" />
              <circle cx="9" cy="22" r="1.8" fill="#38bdf8" fillOpacity="0.85" />
              <circle cx="23" cy="22" r="1.8" fill="#38bdf8" fillOpacity="0.85" />
              <circle cx="16" cy="10" r="1.5" fill="#fff" fillOpacity="0.95" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{APP_NAME}</h1>
            <p className="text-sm text-sky-400 font-medium mt-0.5">{APP_TAGLINE}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{APP_VERSION}</p>
            <p className="text-xs text-slate-500 mt-1">Desa Karang Sengon</p>
            <p className="text-xs text-slate-500">Kecamatan Klabang · Kabupaten Bondowoso</p>
          </div>
        </div>

        {/* Card login */}
        <div className="w-full rounded-2xl border border-white/[0.08] bg-[#0d1424] p-6 shadow-2xl">
          <p className="text-sm font-semibold text-slate-300 text-center mb-5">Masuk ke Akun</p>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Mode Lanjutkan jika ada email tersimpan */}
          {savedEmail && (
            <div className="mb-4 px-3.5 py-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-slate-400">Masuk sebagai</p>
                <p className="text-sm font-medium text-slate-200">{savedEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => { setSavedEmail(null); setEmail(''); setRememberMe(false); localStorage.removeItem(STORAGE_KEY) }}
                className="text-xs text-sky-400 hover:text-sky-300 shrink-0"
              >
                Ganti
              </button>
            </div>
          )}

          <form onSubmit={savedEmail ? (e) => { e.preventDefault(); handleLanjutkan() } : handleSubmit} className="flex flex-col gap-4">
            {!savedEmail && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="nama@desa.id" value={email}
                  onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={loading} />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Kata Sandi</Label>
              <div className="relative">
                <Input id="password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" disabled={loading} className="pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!savedEmail && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-sky-500 cursor-pointer" />
                <span className="text-xs text-slate-400">Ingat email saya</span>
              </label>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 mt-1 text-sm">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Memproses...</>
              ) : savedEmail ? (
                <><LogIn className="h-4 w-4" />Lanjutkan</>
              ) : (
                <><LogIn className="h-4 w-4" />Masuk</>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-5 leading-relaxed">
            Hanya akun yang terdaftar yang dapat mengakses sistem ini.<br />
            Hubungi administrator untuk penambahan akun.
          </p>
        </div>

        <p className="text-[11px] text-slate-700 text-center">
          © Pemerintah Desa Karang Sengon 2026
        </p>
      </div>
    </div>
  )
}
