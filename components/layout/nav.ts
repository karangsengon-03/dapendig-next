import {
  LayoutDashboard, Users, ArrowLeftRight, HeartPulse, BarChart3,
  ClipboardList, Trash2, Settings, type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** 'pendudukBaru' = lencana jumlah penduduk baru bulan ini (usePendudukBaruBulanIni) */
  badgeKey?: 'pendudukBaru'
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

// Menu dikelompokkan seperti prototype. Semua peran melihat semua menu (sama seperti kode asli);
// halaman yang dibatasi (mis. Pengaturan) menjaga aksesnya sendiri.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Utama',
    items: [
      { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
      { href: '/penduduk', label: 'Penduduk', icon: Users, badgeKey: 'pendudukBaru' },
    ],
  },
  {
    label: 'Peristiwa',
    items: [
      { href: '/mutasi', label: 'Mutasi', icon: ArrowLeftRight },
      { href: '/vital', label: 'Kelahiran & Kematian', icon: HeartPulse },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { href: '/monografi', label: 'Monografi', icon: BarChart3 },
      { href: '/log', label: 'Log Aktivitas', icon: ClipboardList },
    ],
  },
]

export const NAV_FOOT: NavItem[] = [
  { href: '/recycle-bin', label: 'Tempat Sampah', icon: Trash2 },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
]

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  operator: 'Operator',
  viewer: 'Viewer',
}

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}
