'use client'

import { create } from 'zustand'
import type { AppUser } from '@/types'

interface AuthStore {
  user: AppUser | null
  loading: boolean
  setUser: (user: AppUser | null) => void
  setLoading: (loading: boolean) => void
  isAdmin: () => boolean
  isOperator: () => boolean
  isViewer: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  isAdmin: () => get().user?.role === 'admin',
  isOperator: () => ['admin', 'operator'].includes(get().user?.role ?? ''),
  isViewer: () => ['admin', 'operator', 'viewer'].includes(get().user?.role ?? ''),
}))
