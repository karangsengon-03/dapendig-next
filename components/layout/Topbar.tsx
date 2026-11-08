'use client'

import { Fragment, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  ChevronDown, ChevronRight, LogIn, LogOut, Menu, Moon, Search, Settings, Sun, UserCircle,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { logout } from '@/hooks/useAuth'
import { usePendudukDetail } from '@/hooks/usePenduduk'
import { getInisial } from '@/components/ui/avatar'
import { ROLE_LABEL } from './nav'

interface TopbarProps {
  /** Judul halaman dari AppShell; dipakai sebagai remah roti untuk halaman yang tidak dikenal */
  title?: string
  /** Dipanggil saat kolom cari / ikon cari ditekan (membuka palet Ctrl+K) */
  onSearch?: () => void
}

interface Crumb {
  label: string
  href?: string
}

const LEBAR_MENU = 248

function buatCrumb(pathname: string, title: string | undefined, namaPenduduk: string): Crumb[] {
  const [root, a, b] = pathname.split('/').filter(Boolean)
  switch (root) {
    case 'dashboard':
      return [{ label: 'Beranda' }]
    case 'penduduk':
      if (!a) return [{ label: 'Utama' }, { label: 'Penduduk' }]
      if (a === 'tambah') return [{ label: 'Penduduk', href: '/penduduk' }, { label: 'Tambah' }]
      return [
        { label: 'Penduduk', href: '/penduduk' },
        ...(b === 'edit'
          ? [{ label: namaPenduduk, href: `/penduduk/${a}` }, { label: 'Edit' }]
          : [{ label: namaPenduduk }]),
      ]
    case 'mutasi':
      return [{ label: 'Peristiwa' }, { label: 'Mutasi' }]
    case 'vital':
      return [{ label: 'Peristiwa' }, { label: 'Kelahiran & kematian' }]
    case 'monografi':
      return [{ label: 'Laporan' }, { label: 'Monografi' }]
    case 'log':
      return [{ label: 'Laporan' }, { label: 'Log aktivitas' }]
    case 'recycle-bin':
      return [{ label: 'Tempat sampah' }]
    case 'pengaturan':
      return a
        ? [{ label: 'Pengaturan', href: '/pengaturan' }, { label: title || a }]
        : [{ label: 'Pengaturan' }]
    case 'profil':
      return [{ label: 'Profil saya' }]
    default:
      return [{ label: title || 'Beranda' }]
  }
}

export function Topbar({ title, onSearch }: TopbarProps) {
  const { toggleSidebar } = useAppStore()
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [menu, setMenu] = useState<{ left: number; top: number } | null>(null)
  // Lazy initializer: true hanya saat benar-benar dievaluasi di client (browser),
  // tetap false saat SSR/build. Menghindari setState di dalam useEffect body.
  const [mounted] = useState(() => typeof window !== 'undefined')

  // Nama penduduk untuk remah roti halaman detail/edit. Memakai hook detail yang sama dengan
  // halaman itu (kunci cache sama), jadi tidak ada pembacaan tambahan; di halaman lain nonaktif (id kosong).
  const [seg0, seg1] = pathname.split('/').filter(Boolean)
  const idDetail = seg0 === 'penduduk' && seg1 && seg1 !== 'tambah' ? seg1 : ''
  const { data: penduduk, isLoading } = usePendudukDetail(idDetail)
  const namaPenduduk = penduduk?.nama_lengkap ?? (isLoading ? 'Memuat…' : 'Tidak ditemukan')
  const crumbs = buatCrumb(pathname, title, namaPenduduk)

  const gelap = resolvedTheme === 'dark'
  const namaUser = user ? user.nama || user.email : ''

  // Esc menutup menu pengguna
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menu])

  function bukaMenu(el: HTMLElement) {
    const r = el.getBoundingClientRect()
    const kiri = Math.max(8, Math.min(r.right - LEBAR_MENU, window.innerWidth - LEBAR_MENU - 8))
    setMenu({ left: kiri, top: r.bottom + 6 })
  }

  async function handleLogout() {
    setMenu(null)
    await logout(router)
  }

  // Ganti Akun = keluar lalu kembali ke halaman masuk (perilaku sama dengan versi lama)
  async function handleGantiAkun() {
    setMenu(null)
    await logout(router)
  }

  function pindah(href: string) {
    setMenu(null)
    router.push(href)
  }

  return (
    <>
      {/* will-change memastikan header tidak ikut bergeser saat address bar mobile naik/turun */}
      <header className="a-top" style={{ willChange: 'transform' }}>
        <button type="button" className="hb" onClick={toggleSidebar} aria-label="Buka menu">
          <Menu className="i" />
        </button>

        <nav className="crumb" aria-label="Posisi halaman">
          {crumbs.map((c, i) => (
            <Fragment key={i}>
              {i > 0 && <ChevronRight className="i" />}
              {i === crumbs.length - 1 ? (
                <b>{c.label}</b>
              ) : (
                <span>{c.href ? <Link href={c.href}>{c.label}</Link> : c.label}</span>
              )}
            </Fragment>
          ))}
        </nav>

        <div className="grow" />

        <button type="button" className="find" onClick={onSearch}>
          <Search className="i" />
          <span>Cari penduduk, KK, atau menu…</span>
          <kbd>Ctrl K</kbd>
        </button>
        <button type="button" className="ib fs" onClick={onSearch} aria-label="Cari">
          <Search className="i" />
        </button>

        <button
          type="button"
          className="ib tm"
          onClick={() => setTheme(gelap ? 'light' : 'dark')}
          aria-label="Ganti tema"
          title="Ganti tema"
        >
          {gelap ? <Sun className="i" /> : <Moon className="i" />}
        </button>

        {user && (
          <button
            type="button"
            className="usr"
            onClick={(e) => (menu ? setMenu(null) : bukaMenu(e.currentTarget))}
            aria-haspopup="menu"
            aria-expanded={!!menu}
            title={`${namaUser} (${user.role})`}
          >
            <div className="av">{getInisial(namaUser)}</div>
            <div>
              <b>{namaUser}</b>
              <span>{ROLE_LABEL[user.role] ?? user.role}</span>
            </div>
            <ChevronDown className="i" style={{ fontSize: 13 }} />
          </button>
        )}
      </header>

      {/* Menu pengguna via Portal: selalu di atas konten dan tidak terpotong overflow.
          Di HP kelas .pop berubah menjadi sheet dari bawah (CSS prototype). */}
      {mounted && menu && user && createPortal(
        <div
          className="a-pops"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMenu(null)
          }}
        >
          <div className="pop" role="menu" style={{ left: menu.left, top: menu.top, width: LEBAR_MENU }}>
            <div className="pt" style={{ paddingBottom: 8 }}>
              <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600, wordBreak: 'break-word' }}>{namaUser}</div>
              <div style={{ fontWeight: 500 }}>{ROLE_LABEL[user.role] ?? user.role}</div>
            </div>
            <div className="sep" />
            <button type="button" role="menuitem" className="o" onClick={() => pindah('/profil')}>
              <UserCircle className="i" style={{ fontSize: 16 }} />
              Profil saya
            </button>
            <button type="button" role="menuitem" className="o" onClick={() => pindah('/pengaturan')}>
              <Settings className="i" style={{ fontSize: 16 }} />
              Pengaturan
            </button>
            <button type="button" role="menuitem" className="o" onClick={handleGantiAkun}>
              <LogIn className="i" style={{ fontSize: 16 }} />
              Ganti Akun
            </button>
            <div className="sep" />
            <button type="button" role="menuitem" className="o bad" onClick={handleLogout}>
              <LogOut className="i" style={{ fontSize: 16 }} />
              Keluar
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
