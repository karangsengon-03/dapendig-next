'use client'

/**
 * AuthProvider — komponen tipis yang hanya bertugas menjalankan useAuthListener
 * di seluruh aplikasi (termasuk halaman /login).
 *
 * Dipasang di root layout agar listener Firebase onAuthStateChanged aktif
 * sejak pertama kali app dibuka, sebelum halaman manapun di-render.
 * Ini mencegah flash form login saat user sudah punya sesi aktif.
 */
import { useAuthListener } from '@/hooks/useAuth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthListener()
  return <>{children}</>
}
