import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const dokumen = new Map<string, Record<string, unknown>>()
const setDocMock = vi.fn(async (ref: { path: string }, data: Record<string, unknown>) => { dokumen.set(ref.path, data) })
const addDocMock = vi.fn(async () => ({ id: 'log1' }))

vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, nama: string) => ({ path: nama }),
  doc: (_db: unknown, kol: string, id: string) => ({ path: `${kol}/${id}` }),
  getDoc: async (ref: { path: string }) => ({ exists: () => dokumen.has(ref.path), data: () => dokumen.get(ref.path) }),
  setDoc: (...a: [{ path: string }, Record<string, unknown>]) => setDocMock(...a),
  addDoc: (...a: unknown[]) => (addDocMock as (...x: unknown[]) => Promise<unknown>)(...a),
  getDocs: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(),
  serverTimestamp: () => 'TS',
}))
vi.mock('@/store/authStore', () => ({
  useAuthStore: (sel: (s: { user: { email: string } }) => unknown) => sel({ user: { email: 'admin@test.local' } }),
}))

import { useDusunConfig, useSaveDusun } from './usePengaturan'
import { useAppStore } from '@/store/appStore'
import { DUSUN_BAWAAN, RW_BAWAAN } from '@/lib/dusun'

const bungkus = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return function Pembungkus({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

beforeEach(() => { dokumen.clear(); setDocMock.mockClear(); addDocMock.mockClear(); act(() => useAppStore.setState({ dusun: DUSUN_BAWAAN, rw: RW_BAWAAN })) })

describe('useDusunConfig', () => {
  it('belum ada dokumen → bawaan dan tersimpan=false', async () => {
    const { result } = renderHook(() => useDusunConfig(), { wrapper: bungkus() })
    await waitFor(() => expect(result.current.data).toBeTruthy())
    expect(result.current.data).toEqual({ dusun: DUSUN_BAWAAN, rw: RW_BAWAAN, tersimpan: false })
  })
  it('dokumen ada → dibaca dan dirapikan', async () => {
    dokumen.set('config/dusun', { dusun: [{ nama: ' Krajan ', rt: ['2', '001'] }] })
    const { result } = renderHook(() => useDusunConfig(), { wrapper: bungkus() })
    await waitFor(() => expect(result.current.data?.tersimpan).toBe(true))
    expect(result.current.data?.dusun).toEqual([{ nama: 'Krajan', rt: ['001', '002'] }])
    expect(result.current.data?.rw).toEqual(RW_BAWAAN) // dokumen lama tanpa field rw
  })
  it('dokumen dengan rw → RW dibaca dan dirapikan', async () => {
    dokumen.set('config/dusun', { dusun: [{ nama: 'Krajan', rt: ['001'] }], rw: ['3', '001'] })
    const { result } = renderHook(() => useDusunConfig(), { wrapper: bungkus() })
    await waitFor(() => expect(result.current.data?.tersimpan).toBe(true))
    expect(result.current.data?.rw).toEqual(['001', '003'])
  })
  it('dokumen rusak → kembali ke bawaan (aplikasi tidak rusak)', async () => {
    dokumen.set('config/dusun', { dusun: 'bukan-daftar' })
    const { result } = renderHook(() => useDusunConfig(), { wrapper: bungkus() })
    await waitFor(() => expect(result.current.data).toBeTruthy())
    expect(result.current.data?.tersimpan).toBe(false)
  })
})

describe('useSaveDusun', () => {
  it('menyimpan ke config/dusun, mencatat log, dan langsung memperbarui store (form/filter ikut berubah)', async () => {
    const { result } = renderHook(() => useSaveDusun(), { wrapper: bungkus() })
    await act(async () => { await result.current.mutateAsync({ dusun: [{ nama: ' Krajan ', rt: ['3', '1'] }, { nama: 'Sengon', rt: ['12'] }], rw: ['2', '1', '6'] }) })
    expect(setDocMock).toHaveBeenCalledTimes(1)
    const [ref, data] = setDocMock.mock.calls[0]
    expect(ref.path).toBe('config/dusun')
    expect(data).toMatchObject({ dusun: [{ nama: 'Krajan', rt: ['001', '003'] }, { nama: 'Sengon', rt: ['012'] }], rw: ['001', '002', '006'], updated_by: 'admin@test.local' })
    expect(addDocMock).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().dusun).toEqual([{ nama: 'Krajan', rt: ['001', '003'] }, { nama: 'Sengon', rt: ['012'] }])
    expect(useAppStore.getState().rw).toEqual(['001', '002', '006'])
  })
  it('isian tidak valid ditolak: tidak ada tulisan, store tidak berubah', async () => {
    const { result } = renderHook(() => useSaveDusun(), { wrapper: bungkus() })
    await act(async () => {
      await expect(result.current.mutateAsync({ dusun: [{ nama: 'A', rt: ['001'] }, { nama: 'B', rt: ['001'] }], rw: ['001'] })).rejects.toThrow(/belum valid/)
    })
    expect(setDocMock).not.toHaveBeenCalled()
    expect(useAppStore.getState().dusun).toEqual(DUSUN_BAWAAN)
  })
  it('daftar RW kosong atau tidak valid ditolak', async () => {
    const { result } = renderHook(() => useSaveDusun(), { wrapper: bungkus() })
    await act(async () => {
      await expect(result.current.mutateAsync({ dusun: DUSUN_BAWAAN, rw: [] })).rejects.toThrow(/RW belum valid/)
      await expect(result.current.mutateAsync({ dusun: DUSUN_BAWAAN, rw: ['x'] })).rejects.toThrow(/RW belum valid/)
    })
    expect(setDocMock).not.toHaveBeenCalled()
  })
})
