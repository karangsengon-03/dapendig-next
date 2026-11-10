'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { ChevronsLeft, ChevronsRight, LogOut, Moon, Sun, X } from 'lucide-react'
import { cn, APP_VERSION } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import { useIdentitasDesa } from '@/hooks/useIdentitasDesa'
import { labelDesa } from '@/lib/wilayah'
import { useAuthStore } from '@/store/authStore'
import { logout } from '@/hooks/useAuth'
import { usePendudukBaruBulanIni } from '@/hooks/useDashboard'
import { getInisial } from '@/components/ui/avatar'
import { AppLogo } from './AppLogo'
import { NAV_FOOT, NAV_GROUPS, ROLE_LABEL, isNavActive, type NavItem } from './nav'
import { useIsDesktop } from './useIsDesktop'

// Pilihan sidebar ciut disimpan di perangkat (hanya berlaku di layar lebar).
const KUNCI_CIUT = 'dpd_sidebar_ciut'

function NavLink({ item, active, badge, onNavigate }: {
  item: NavItem
  active: boolean
  badge: number
  onNavigate: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      className={cn('it', active && 'on')}
    >
      <Icon className="i" />
      <span className="t">{item.label}</span>
      {badge > 0 && <span className="cn">{badge > 99 ? '99+' : badge}</span>}
    </Link>
  )
}

export function Sidebar() {
  const identitas = useIdentitasDesa()
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, setSidebarOpen } = useAppStore()
  const user = useAuthStore((s) => s.user)
  const { resolvedTheme, setTheme } = useTheme()
  const { data: pendudukBaru = 0 } = usePendudukBaruBulanIni()
  const desktop = useIsDesktop()
  const [ciut, setCiut] = useState(() => {
    try {
      return window.localStorage.getItem(KUNCI_CIUT) === '1'
    } catch {
      return false
    }
  })

  // Mode rail (ikon saja) hanya di layar lebar; di HP sidebar selalu drawer penuh.
  const rail = ciut && desktop
  const gelap = resolvedTheme === 'dark'

  // Esc menutup drawer di HP
  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sidebarOpen, setSidebarOpen])

  const handleNav = () => setSidebarOpen(false)

  function toggleCiut() {
    const next = !ciut
    setCiut(next)
    try {
      window.localStorage.setItem(KUNCI_CIUT, next ? '1' : '0')
    } catch {
      // penyimpanan lokal tidak tersedia: pilihan hanya berlaku selama halaman terbuka
    }
  }

  const handleLogout = async () => {
    setSidebarOpen(false)
    await logout(router)
  }

  const badgeUntuk = (item: NavItem) => (item.badgeKey === 'pendudukBaru' ? pendudukBaru : 0)
  const namaUser = user ? user.nama || user.email : ''

  return (
    <>
      {/* Latar gelap di belakang drawer (HP). Tampil lewat kelas drawer-on pada .a-app */}
      <div className="a-ov" onClick={() => setSidebarOpen(false)} aria-hidden="true" />

      <aside className={cn('a-side', rail && 'rail', sidebarOpen && 'open')}>
        <div className="brand">
          <AppLogo size={40} />
          {!rail && (
            <div>
              <b>DaPenDig</b>
              <span>{labelDesa(identitas) || 'Data Penduduk Digital'}</span>
            </div>
          )}
          {desktop ? (
            <button
              type="button"
              className="colbtn"
              onClick={toggleCiut}
              aria-label={rail ? 'Lebarkan sidebar' : 'Lipat sidebar'}
              title={rail ? 'Lebarkan sidebar' : 'Lipat sidebar'}
            >
              {rail ? <ChevronsRight className="i" /> : <ChevronsLeft className="i" />}
            </button>
          ) : (
            <button type="button" className="colbtn" onClick={handleNav} aria-label="Tutup menu">
              <X className="i" />
            </button>
          )}
        </div>

        <nav aria-label="Menu utama">
          {NAV_GROUPS.map((grup) => (
            <Fragment key={grup.label}>
              <div className="grp">{grup.label}</div>
              {grup.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isNavActive(pathname, item.href)}
                  badge={badgeUntuk(item)}
                  onNavigate={handleNav}
                />
              ))}
            </Fragment>
          ))}
        </nav>

        <div className="foot">
          {NAV_FOOT.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isNavActive(pathname, item.href)}
              badge={0}
              onNavigate={handleNav}
            />
          ))}

          <div className="thm" role="group" aria-label="Tema tampilan">
            <button type="button" className={cn(!gelap && 'on')} aria-pressed={!gelap} onClick={() => setTheme('light')}>
              <Sun className="i" style={{ fontSize: 14 }} />
              Terang
            </button>
            <button type="button" className={cn(gelap && 'on')} aria-pressed={gelap} onClick={() => setTheme('dark')}>
              <Moon className="i" style={{ fontSize: 14 }} />
              Gelap
            </button>
          </div>

          {user && (
            <div className="me">
              <Link href="/profil" onClick={handleNav} className="melink" title="Profil saya">
                <div className="av">{getInisial(namaUser)}</div>
                <div className="who">
                  <b>{namaUser}</b>
                  <span>{ROLE_LABEL[user.role] ?? user.role}</span>
                </div>
              </Link>
              <button type="button" className="lo" onClick={handleLogout} title="Keluar" aria-label="Keluar">
                <LogOut className="i" />
              </button>
            </div>
          )}

          <p className="ver">DaPenDig {APP_VERSION}</p>
        </div>
      </aside>
    </>
  )
}
