'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_NAME, APP_TAGLINE, APP_VERSION } from '@/lib/utils'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center px-4 py-12">
      {/* Background orbs */}
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
            <p className="text-xs text-slate-600 mt-1">Desa Karang Sengon · Klabang · Bondowoso</p>
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@desa.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Kata Sandi</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPw
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 mt-1 text-sm">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Masuk
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-5 leading-relaxed">
            Hanya akun yang terdaftar yang dapat mengakses sistem ini.<br />
            Hubungi administrator untuk penambahan akun.
          </p>
        </div>

        <p className="text-[11px] text-slate-700">{APP_VERSION} · Desa Karang Sengon</p>
      </div>
    </div>
  )
}
