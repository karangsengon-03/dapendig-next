import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { user: { email: string } }) => unknown) =>
    selector({ user: { email: 'admin@test.local' } }),
}))

type Ref = { __col: string; __id: string }
const addDocMock = vi.fn()
const getDocMock = vi.fn()
const updateDocMock = vi.fn()
const deleteDocMock = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ __col: name })),
  doc: vi.fn((_db, col, id): Ref => ({ __col: col, __id: id })),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_TS'),
}))

vi.mock('@/lib/kk-succession', () => ({
  jalankanSuksesiKK: vi.fn(),
  kembalikanSuksesiKK: vi.fn(),
}))

import { useDeleteMutasiKeluar, useDeleteMutasiMasuk, PESAN_HAPUS_MASIH_PINDAH } from '@/hooks/useMutasi'
import { useDeleteMeninggal, useDeleteLahir, PESAN_HAPUS_MASIH_MENINGGAL } from '@/hooks/useVital'
import { GalatTolak } from '@/lib/galat-tolak'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const NIK = '3511140109480099'
const pendudukDengan = (status: string) => ({ exists: () => true, data: () => ({ status }) })
const tidakAda = { exists: () => false, data: () => undefined }

const koleksiDihapus = () => deleteDocMock.mock.calls.map(([ref]) => (ref as Ref).__col)
const logDitulis = () => addDocMock.mock.calls.some(([c]) => (c as { __col: string }).__col === 'log')

beforeEach(() => {
  addDocMock.mockReset().mockResolvedValue({ id: 'log-1' })
  getDocMock.mockReset()
  updateDocMock.mockReset()
  deleteDocMock.mockReset().mockResolvedValue(undefined)
})

describe('Hapus catatan Pindah keluar — hanya untuk catatan yatim', () => {
  it('penduduk MASIH berstatus mutasi-keluar → ditolak, catatan tidak dihapus, tanpa log', async () => {
    getDocMock.mockResolvedValue(pendudukDengan('mutasi-keluar'))
    const { result } = renderHook(() => useDeleteMutasiKeluar(), { wrapper })
    const galat = await result.current.mutateAsync({ id: 'mk-1', nama: 'Test', nik_target: NIK }).catch((e) => e)
    expect(galat).toBeInstanceOf(GalatTolak)
    expect(galat.message).toBe(PESAN_HAPUS_MASIH_PINDAH)
    expect(galat.message).toContain('Gunakan Batalkan untuk mengembalikan penduduk')
    expect(deleteDocMock).not.toHaveBeenCalled()
    expect(logDitulis()).toBe(false)
    // pemeriksaan memakai satu getDoc pada dokumen penduduk ber-ID NIK
    expect(getDocMock).toHaveBeenCalledTimes(1)
    expect(getDocMock.mock.calls[0][0]).toEqual({ __col: 'penduduk', __id: NIK })
  })

  it('penduduk sudah aktif lagi (catatan yatim) → catatan dihapus dan dicatat di log', async () => {
    getDocMock.mockResolvedValue(pendudukDengan('aktif'))
    const { result } = renderHook(() => useDeleteMutasiKeluar(), { wrapper })
    await result.current.mutateAsync({ id: 'mk-1', nama: 'Test', nik_target: NIK })
    expect(koleksiDihapus()).toEqual(['mutasi_keluar'])
    expect(logDitulis()).toBe(true)
  })

  it('penduduk tidak ditemukan (catatan yatim) → catatan dihapus', async () => {
    getDocMock.mockResolvedValue(tidakAda)
    const { result } = renderHook(() => useDeleteMutasiKeluar(), { wrapper })
    await result.current.mutateAsync({ id: 'mk-1', nama: 'Test', nik_target: NIK })
    expect(koleksiDihapus()).toEqual(['mutasi_keluar'])
  })

  it('tanpa nik_target (pemanggil lama) → tidak memeriksa penduduk dan tetap menghapus', async () => {
    const { result } = renderHook(() => useDeleteMutasiKeluar(), { wrapper })
    await result.current.mutateAsync({ id: 'mk-1', nama: 'Test' })
    expect(getDocMock).not.toHaveBeenCalled()
    expect(koleksiDihapus()).toEqual(['mutasi_keluar'])
  })
})

describe('Hapus catatan Kematian — hanya untuk catatan yatim', () => {
  it('penduduk MASIH berstatus meninggal → ditolak, catatan tidak dihapus, tanpa log', async () => {
    getDocMock.mockResolvedValue(pendudukDengan('meninggal'))
    const { result } = renderHook(() => useDeleteMeninggal(), { wrapper })
    const galat = await result.current.mutateAsync({ id: 'mg-1', nama: 'Test', nik_target: NIK }).catch((e) => e)
    expect(galat).toBeInstanceOf(GalatTolak)
    expect(galat.message).toBe(PESAN_HAPUS_MASIH_MENINGGAL)
    expect(galat.message).toContain('Gunakan Batalkan untuk mengembalikan penduduk')
    expect(deleteDocMock).not.toHaveBeenCalled()
    expect(logDitulis()).toBe(false)
    expect(getDocMock).toHaveBeenCalledTimes(1)
  })

  it('penduduk sudah aktif lagi (catatan yatim) → catatan dihapus', async () => {
    getDocMock.mockResolvedValue(pendudukDengan('aktif'))
    const { result } = renderHook(() => useDeleteMeninggal(), { wrapper })
    await result.current.mutateAsync({ id: 'mg-1', nama: 'Test', nik_target: NIK })
    expect(koleksiDihapus()).toEqual(['meninggal'])
    expect(logDitulis()).toBe(true)
  })

  it('penduduk tidak ditemukan (catatan yatim) → catatan dihapus', async () => {
    getDocMock.mockResolvedValue(tidakAda)
    const { result } = renderHook(() => useDeleteMeninggal(), { wrapper })
    await result.current.mutateAsync({ id: 'mg-1', nama: 'Test', nik_target: NIK })
    expect(koleksiDihapus()).toEqual(['meninggal'])
  })

  it('status mutasi-keluar tidak menghalangi hapus catatan kematian (hanya status meninggal yang dijaga)', async () => {
    getDocMock.mockResolvedValue(pendudukDengan('mutasi-keluar'))
    const { result } = renderHook(() => useDeleteMeninggal(), { wrapper })
    await result.current.mutateAsync({ id: 'mg-1', nama: 'Test', nik_target: NIK })
    expect(koleksiDihapus()).toEqual(['meninggal'])
  })
})

describe('Hapus catatan Pindah masuk dan Kelahiran — tidak berubah', () => {
  it('Pindah masuk dihapus tanpa memeriksa penduduk', async () => {
    const { result } = renderHook(() => useDeleteMutasiMasuk(), { wrapper })
    await result.current.mutateAsync({ id: 'mm-1', nama: 'Test' })
    expect(getDocMock).not.toHaveBeenCalled()
    expect(koleksiDihapus()).toEqual(['mutasi_masuk'])
  })

  it('Kelahiran dihapus tanpa memeriksa penduduk', async () => {
    const { result } = renderHook(() => useDeleteLahir(), { wrapper })
    await result.current.mutateAsync({ id: 'lh-1', nama: 'Test' })
    expect(getDocMock).not.toHaveBeenCalled()
    expect(koleksiDihapus()).toEqual(['lahir'])
  })
})
