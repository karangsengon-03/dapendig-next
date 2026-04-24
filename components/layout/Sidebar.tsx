'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, BarChart3, ArrowLeftRight,
  Heart, Settings, LogOut, X, ClipboardList, UserCircle, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppLogoFull } from './AppLogo'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { logout } from '@/hooks/useAuth'
import { APP_VERSION } from '@/lib/utils'
import { usePendudukBaruBulanIni } from '@/hooks/useDashboard'

const navItems = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard, badgeKey: null },
  { href: '/penduduk', label: 'Penduduk', icon: Users, badgeKey: 'pendudukBaru' },
  { href: '/monografi', label: 'Monografi', icon: BarChart3, badgeKey: null },
  { href: '/mutasi', label: 'Mutasi', icon: ArrowLeftRight, badgeKey: null },
  { href: '/vital', label: 'Vital', icon: Heart, badgeKey: null },
  { href: '/log', label: 'Log Aktivitas', icon: ClipboardList, badgeKey: null },
  { href: '/recycle-bin', label: 'Tempat Sampah', icon: Trash2, badgeKey: null },
]

const bottomItems = [
  { href: '/profil', label: 'Profil Saya', icon: UserCircle },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useAppStore()
  const { data: pendudukBaru = 0 } = usePendudukBaruBulanIni()

  const badges: Record<string, number> = {
    pendudukBaru,
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleNav = () => setSidebarOpen(false)

  const handleLogout = async () => {
    setSidebarOpen(false)
    await logout(router)
  }

  const getInisial = (nama: string) => {
    const parts = nama.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col',
          'bg-[#070c18] border-r border-white/[0.06]',
          'transition-transform duration-300 ease-in-out',
          // Mobile: drawer
          'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: icon-only
          'md:w-14 md:translate-x-0',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/[0.06] md:justify-center md:px-0">
          <div className="md:hidden">
            <AppLogoFull />
          </div>
          {/* Desktop: logo icon only */}
          <div className="hidden md:flex items-center justify-center w-full py-1">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10">
              <img src="/icons/icon-192.png" alt="DaPenDig" className="w-full h-full object-cover" />
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav utama */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, badgeKey }) => {
            const active = isActive(href)
            const badgeCount = badgeKey ? (badges[badgeKey] ?? 0) : 0
            return (
              <Link
                key={href}
                href={href}
                onClick={handleNav}
                title={label}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  'relative overflow-hidden',
                  active
                    ? 'bg-sky-500/15 text-sky-400'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5',
                  // Desktop: center icons
                  'md:justify-center md:px-0 md:w-10 md:mx-auto',
                )}
              >
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-sky-400 rounded-full md:hidden" />
                )}
                {/* Icon + desktop badge */}
                <span className="relative shrink-0">
                  <Icon className={cn(
                    'h-[18px] w-[18px] transition-colors',
                    active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
                  )} />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </span>
                {/* Label + mobile badge */}
                <span className="truncate md:hidden flex-1">{label}</span>
                {badgeCount > 0 && (
                  <span className="md:hidden ml-auto min-w-[20px] h-5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center justify-center px-1.5 border border-rose-500/30">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/[0.06] py-3 px-2 space-y-0.5">
          {bottomItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={handleNav}
                title={label}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-sky-500/15 text-sky-400'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5',
                  'md:justify-center md:px-0 md:w-10 md:mx-auto',
                )}
              >
                <Icon className={cn(
                  'h-[18px] w-[18px] shrink-0',
                  active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
                )} />
                <span className="truncate md:hidden">{label}</span>
              </Link>
            )
          })}

          {/* User info — mobile only */}
          {user && (
            <div className="md:hidden mx-1 mt-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {getInisial(user.nama || user.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user.nama || user.email}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Keluar"
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              'text-slate-500 hover:text-red-400 hover:bg-red-500/10',
              'md:justify-center md:px-0 md:w-10 md:mx-auto',
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className="md:hidden">Keluar</span>
          </button>

          {/* Versi — mobile only */}
          <p className="md:hidden text-center text-[10px] text-slate-600 pt-1">{APP_VERSION}</p>
        </div>
      </aside>
    </>
  )
}
