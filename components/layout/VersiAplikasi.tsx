import { APP_VERSION } from '@/lib/utils'

/** Nomor versi aplikasi yang selalu terlihat (Login, layar muat, Pengaturan, sidebar), termasuk di HP. */
export function VersiAplikasi({ className }: { className?: string }) {
  return <p className={className ? `app-ver ${className}` : 'app-ver'}>DaPenDig {APP_VERSION}</p>
}
