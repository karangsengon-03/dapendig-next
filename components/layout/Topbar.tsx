'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Menu, LogIn, LogOut, UserCircle } from 'lucide-react'
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
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const getInisial = (nama: string) => {
    const parts = nama.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  function openDropdown() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    })
    setOpen(true)
  }

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        btnRef.current && !btnRef.current.contains(target)
      ) {
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

  async function handleGantiAkun() {
    setOpen(false)
    await logout(router)
  }

  function handleProfil() {
    setOpen(false)
    router.push('/profil')
  }

  return (
    <>
      {/* shrink-0 + will-change memastikan header tidak ikut bergeser saat address bar mobile naik/turun */}
      <header className="h-13 flex items-center gap-3 px-4 border-b border-white/[0.06] bg-[#0a0f1e] shrink-0" style={{ willChange: 'transform' }}>
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
          <p className="text-sm font-bold text-slate-100 leading-tight tracking-tight">
            Data Penduduk Digital
          </p>
          <p className="text-xs text-slate-500 leading-tight">
            Desa Karang Sengon
          </p>
        </div>

        {/* Avatar — clickable, dropdown via Portal */}
        {user && (
          <button
            ref={btnRef}
            onClick={() => open ? setOpen(false) : openDropdown()}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-full bg-sky-500 text-sm font-bold text-white shrink-0',
              'hover:bg-sky-400 transition-colors ring-2 ring-transparent',
              open && 'ring-sky-500/50'
            )}
            title={`${user.nama || user.email} (${user.role})`}
          >
            {getInisial(user.nama || user.email)}
          </button>
        )}
      </header>

      {/* Dropdown via Portal — selalu di atas semua konten, tidak terpotong overflow */}
      {mounted && open && user && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-52 rounded-2xl bg-[#0d1424] border border-white/[0.08] shadow-2xl overflow-hidden"
          style={{ top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
        >
          {/* Info user */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-slate-200 truncate">{user.nama || user.email}</p>
            <p className="text-sm text-slate-500 capitalize mt-0.5">{user.role}</p>
          </div>
          {/* Menu items */}
          <div className="py-1.5">
            <button
              onClick={handleProfil}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors text-left"
            >
              <UserCircle size={16} className="shrink-0" />
              Profil Saya
            </button>
            <button
              onClick={handleGantiAkun}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors text-left"
            >
              <LogIn size={16} className="shrink-0" />
              Ganti Akun
            </button>
            <div className="mx-3 my-1 border-t border-white/[0.06]" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/[0.07] transition-colors text-left"
            >
              <LogOut size={16} className="shrink-0" />
              Keluar
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
