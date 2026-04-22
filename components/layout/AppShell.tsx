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
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <path d="M16 4L28 13H4L16 4Z" fill="#0ea5e9" fillOpacity="0.9" />
            <rect x="6" y="13" width="20" height="13" rx="1" fill="#0ea5e9" fillOpacity="0.25" />
            <rect x="13" y="19" width="6" height="7" rx="1" fill="#0ea5e9" fillOpacity="0.7" />
            <circle cx="16" cy="10" r="1.5" fill="#fff" fillOpacity="0.9" />
          </svg>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-slate-300">DaPenDig Next</p>
          <p className="text-xs text-slate-500">Memuat data...</p>
        </div>
        <div className="w-5 h-5 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin mt-2" />
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
