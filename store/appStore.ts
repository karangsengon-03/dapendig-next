'use client'

import { create } from 'zustand'
import type { ConfigWilayah } from '@/types'

interface AppStore {
  wilayah: ConfigWilayah
  setWilayah: (w: ConfigWilayah) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

const defaultWilayah: ConfigWilayah = {
  desa: 'Karang Sengon',
  kecamatan: 'Klabang',
  kabupaten: 'Bondowoso',
  provinsi: 'Jawa Timur',
  tahun: String(new Date().getFullYear()),
}

export const useAppStore = create<AppStore>((set) => ({
  wilayah: defaultWilayah,
  setWilayah: (wilayah) => set({ wilayah }),
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
