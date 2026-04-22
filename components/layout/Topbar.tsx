'use client'

import { Menu } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const { toggleSidebar } = useAppStore()
  const { user } = useAuthStore()

  const getInisial = (nama: string) => {
    const parts = nama.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  return (
    <header className="h-13 flex items-center gap-3 px-4 border-b border-white/[0.06] bg-[#0a0f1e]/80 backdrop-blur-sm shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'md:hidden flex items-center justify-center w-8 h-8 rounded-lg',
          'text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors'
        )}
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Title */}
      <h1 className="flex-1 text-[15px] font-bold text-slate-100 tracking-tight">{title}</h1>

      {/* User avatar — desktop */}
      {user && (
        <div
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-sky-500 text-xs font-bold text-white shrink-0"
          title={`${user.nama || user.email} (${user.role})`}
        >
          {getInisial(user.nama || user.email)}
        </div>
      )}
    </header>
  )
}
