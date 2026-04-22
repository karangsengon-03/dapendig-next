'use client'

import { useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { AppUser, UserRole } from '@/types'

const ALLOWED_UIDS = [
  'dzQ7vIVsTEbtfgML286w9MmUGqz2',
  'ZDX7bXzB95hBMv99Q5OxkXwJfmf2',
  'lZqlErwDKiSWXphAfAcI9uTgQKt2',
  'sdcHroGRTeZQxeQOtmJzMzmskP62',
  'YA7qQvgouLZYyAap44Z0I1kWTx43',
]

export function useAuthListener() {
  const { setUser, setLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      if (!ALLOWED_UIDS.includes(firebaseUser.uid)) {
        await signOut(auth)
        setUser(null)
        setLoading(false)
        router.replace('/login')
        return
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          const appUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            nama: data.nama ?? '',
            role: (data.role as UserRole) ?? 'viewer',
          }
          setUser(appUser)
        } else {
          await signOut(auth)
          setUser(null)
          router.replace('/login')
        }
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsub()
  }, [setUser, setLoading, router])
}

export async function logout(router: ReturnType<typeof useRouter>) {
  await signOut(auth)
  router.replace('/login')
}
