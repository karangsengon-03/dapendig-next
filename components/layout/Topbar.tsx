'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu, UserCircle, LogOut } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { logout } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function Topbar({ title: _ }: { title?: string }) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const { toggleSidebar } = useAppStore()
  const { user } = useAuthStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const getInisial = (nama: string) => {
    const parts = nama.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleLogout() {
    setOpen(false)
    await logout(router)
  }

  function handleProfil() {
    setOpen(false)
    router.push('/profil')
  }

  return (
    <header className="h-13 flex items-center gap-3 px-4 border-b border-white/[0.06] bg-[#0a0f1e]/80 backdrop-blur-sm shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'md:hidden flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
          'text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors'
        )}
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* App name — 2 baris */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-100 leading-tight tracking-tight">
          Data Penduduk Digital
        </p>
        <p className="text-[10px] text-slate-500 leading-tight">
          Desa Karang Sengon
        </p>
      </div>

      {/* Avatar — clickable dropdown */}
      {user && (
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full bg-sky-500 text-xs font-bold text-white',
              'hover:bg-sky-400 transition-colors ring-2 ring-transparent',
              open && 'ring-sky-500/50'
            )}
            title={`${user.nama || user.email} (${user.role})`}
          >
            {getInisial(user.nama || user.email)}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-2xl bg-[#0d1424] border border-white/[0.08] shadow-2xl overflow-hidden">
              {/* Info user */}
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.nama || user.email}</p>
                <p className="text-[10px] text-slate-500 capitalize mt-0.5">{user.role}</p>
              </div>
              {/* Menu items */}
              <div className="py-1.5">
                <button
                  onClick={handleProfil}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors text-left"
                >
                  <UserCircle size={15} className="shrink-0" />
                  Ganti Akun / Profil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/[0.07] transition-colors text-left"
                >
                  <LogOut size={15} className="shrink-0" />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
