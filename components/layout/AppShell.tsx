'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useAuthListener } from '@/hooks/useAuth'
import { useWilayah } from '@/hooks/useWilayah'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastProvider } from '@/components/ui/toast'

interface AppShellProps {
  children: React.ReactNode
  title: string
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
      <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center gap-4">
        <div
          className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#16447a' }}
        >
          <img src="/icons/icon-192.png" alt="DaPenDig" className="w-full h-full object-cover" style={{ display: 'block' }} />
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

export function AppShell({ children, title }: AppShellProps) {
  useAuthListener()
  useWilayah()

  return (
    <ToastProvider>
      <AuthGuard>
        <div className="min-h-screen bg-[#0a0f1e] flex">
          <Sidebar />
          {/* Main content — offset for desktop icon sidebar */}
          <div className="flex-1 flex flex-col min-w-0 md:ml-14">
            <Topbar title={title} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </AuthGuard>
    </ToastProvider>
  )
}
