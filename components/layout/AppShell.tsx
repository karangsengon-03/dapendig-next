'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useWilayah } from '@/hooks/useWilayah'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastProvider } from '@/components/ui/toast'

interface AppShellProps {
  children: React.ReactNode
  title: string
  /** Jika true: konten mengisi penuh tinggi area, tidak ada scroll di main (halaman dengan tabel) */
  fullHeight?: boolean
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0d1a2e] flex flex-col items-center justify-center gap-5">
        {/* Icon menggunakan maskable agar terlihat rapi — warna bg sama dengan manifest background_color */}
        <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
          <Image
            src="/icons/icon-maskable-192.png"
            alt="DaPenDig"
            width={96}
            height={96}
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
            priority
            unoptimized
          />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-base font-bold text-slate-100 tracking-tight">Data Penduduk Digital</p>
          <p className="text-sm text-slate-500">Desa Karang Sengon</p>
        </div>
        <div className="w-5 h-5 border-2 border-white/[0.08] border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}

export function AppShell({ children, title, fullHeight }: AppShellProps) {
  // useAuthListener TIDAK dipanggil di sini — sudah dipanggil di root AuthProvider (app/layout.tsx)
  // Memanggil dua kali menyebabkan dua subscriber onAuthStateChanged yang race condition
  useWilayah()

  return (
    <ToastProvider>
      <AuthGuard>
        <div className="h-[100dvh] bg-[#0a0f1e] flex overflow-hidden">
          <Sidebar />
          {/* Main content — offset for desktop icon sidebar */}
          <div className="flex-1 flex flex-col min-w-0 md:ml-14 overflow-hidden">
            <Topbar title={title} />
            {/* fullHeight: konten mengisi penuh, tidak ada scroll di main */}
            {/* non-fullHeight: scroll terjadi di dalam main, Topbar tetap terlihat */}
            <main className={fullHeight
              ? "flex-1 min-h-0 overflow-hidden p-4 md:p-6 flex flex-col"
              : "flex-1 min-h-0 overflow-y-auto overscroll-none p-4 md:p-6"
            }>
              {children}
            </main>
          </div>
        </div>
      </AuthGuard>
    </ToastProvider>
  )
}
