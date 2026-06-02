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
      <div className="min-h-[100dvh] bg-[#050810] flex flex-col items-center justify-center gap-4">
        <div
          className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#164472' }}
        >
          <Image src="/icons/icon-192.png" alt="DaPenDig" width={80} height={80} className="w-full h-full object-cover" style={{ display: 'block' }} priority unoptimized />
        </div>
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="text-base font-semibold text-slate-100">Data Penduduk Digital</p>
          <p className="text-xs text-slate-500">Desa Karang Sengon</p>
        </div>
        <div className="w-5 h-5 border-2 border-white/[0.06] border-t-sky-500 rounded-full animate-spin mt-1" />
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
