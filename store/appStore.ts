'use client'

import { create } from 'zustand'
import type { ConfigWilayah } from '@/types'
import { DUSUN_BAWAAN, RW_BAWAAN, type DusunItem } from '@/lib/dusun'

interface AppStore {
  wilayah: ConfigWilayah
  setWilayah: (w: ConfigWilayah) => void
  /** Pemetaan RT → Dusun (config/dusun); bawaan = DUSUN_BAWAAN. */
  dusun: DusunItem[]
  setDusun: (d: DusunItem[]) => void
  /** Daftar RW (config/dusun, field rw); bawaan = RW_BAWAAN. */
  rw: string[]
  setRw: (r: string[]) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

// Kosong sampai konfigurasi dimuat (Pengaturan → Informasi wilayah): tidak ada nama desa bawaan yang tertanam di kode.
const defaultWilayah: ConfigWilayah = {
  desa: '',
  kecamatan: '',
  kabupaten: '',
  provinsi: '',
  tahun: String(new Date().getFullYear()),
}

export const useAppStore = create<AppStore>((set) => ({
  wilayah: defaultWilayah,
  setWilayah: (wilayah) => set({ wilayah }),
  dusun: DUSUN_BAWAAN,
  setDusun: (dusun) => set({ dusun }),
  rw: RW_BAWAAN,
  setRw: (rw) => set({ rw }),
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
