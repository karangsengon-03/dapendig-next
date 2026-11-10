'use client'

import { useEffect, useState } from 'react'
import { VersiAplikasi } from '@/components/layout/VersiAplikasi'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { useWilayah } from '@/hooks/useWilayah'
import { useWilayahTerpakai } from '@/hooks/useWilayahTerpakai'
import { useIdentitasDesa } from '@/hooks/useIdentitasDesa'
import { labelDesa } from '@/lib/wilayah'
import { cn } from '@/lib/utils'
import { AppLogo } from './AppLogo'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'

interface AppShellProps {
  children: React.ReactNode
  title: string
  /** Jika true: konten mengisi penuh tinggi area, tidak ada scroll di main (halaman dengan tabel) */
  fullHeight?: boolean
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const router = useRouter()
  const identitas = useIdentitasDesa()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center gap-4">
        <AppLogo size={80} className="shadow-pop ring-1 ring-gold-400/40" />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="font-display text-base font-semibold text-ink">Data Penduduk Digital</p>
          {labelDesa(identitas) && <p className="text-xs text-ink-3">{labelDesa(identitas)}</p>}
        </div>
        <div className="w-5 h-5 border-2 border-line-2 border-t-navy-600 rounded-full animate-spin mt-1" />
        <VersiAplikasi />
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}

// Dipasang hanya setelah login terverifikasi, sehingga pintasan Ctrl+K tidak aktif di layar muat.
function ShellFrame({ children, title, fullHeight }: AppShellProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={cn('a-app', sidebarOpen && 'drawer-on')} style={{ height: '100dvh' }}>
      <Sidebar />
      <div className="a-main">
        <Topbar title={title} onSearch={() => setCmdOpen(true)} />
        {/* fullHeight: konten mengisi penuh, tidak ada scroll di main */}
        {/* non-fullHeight: scroll terjadi di dalam main, Topbar tetap terlihat */}
        <main className={cn('a-content', fullHeight && 'flex flex-col overflow-hidden pb-6')}>
          <div className={cn('pg rise', fullHeight && 'flex flex-col flex-1 min-h-0 w-full')}>
            {children}
          </div>
        </main>
      </div>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  )
}

export function AppShell({ children, title, fullHeight }: AppShellProps) {
  // useAuthListener TIDAK dipanggil di sini — sudah dipanggil di root AuthProvider (app/layout.tsx)
  // Memanggil dua kali menyebabkan dua subscriber onAuthStateChanged yang race condition
  useWilayah()
  useWilayahTerpakai()

  // ToastProvider hanya di root (app/layout.tsx): satu penampung toast untuk semua halaman, termasuk /login.
  return (
    <AuthGuard>
      <ShellFrame title={title} fullHeight={fullHeight}>
        {children}
      </ShellFrame>
    </AuthGuard>
  )
}
