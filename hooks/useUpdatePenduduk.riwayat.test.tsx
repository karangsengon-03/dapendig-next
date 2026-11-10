import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Riwayat perubahan di Detail penduduk mencari log berdasarkan nik_target: edit HARUS menulisnya (bug v3.4.0: kosong → Riwayat tidak memuat edit).
vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { user: { email: string } }) => unknown) => selector({ user: { email: 'admin@test.local' } }),
}))

const addDocMock = vi.fn()
const updateDocMock = vi.fn()
const getDocMock = vi.fn()
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __col: name }),
  addDoc: (...a: unknown[]) => addDocMock(...a),
  updateDoc: (...a: unknown[]) => updateDocMock(...a),
  getDoc: (...a: unknown[]) => getDocMock(...a),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: (_db: unknown, col: string, id: string) => ({ __col: col, __id: id }),
  query: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: () => 'MOCK_TS',
}))
vi.mock('@/lib/kk-succession', () => ({ jalankanSuksesiKK: vi.fn() }))

import { useUpdatePenduduk } from '@/hooks/usePenduduk'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const NIK = '3511140109480002'

beforeEach(() => {
  addDocMock.mockReset(); updateDocMock.mockReset(); getDocMock.mockReset()
  updateDocMock.mockResolvedValue(undefined)
  addDocMock.mockResolvedValue({ id: 'x' })
  getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ nik: NIK, nama_lengkap: 'RUS', rt: '000', rw: '000' }) })
})

describe('useUpdatePenduduk — log edit untuk Riwayat', () => {
  it('log edit memuat nik_target dan ringkasan perubahan RT/RW', async () => {
    const { result } = renderHook(() => useUpdatePenduduk(NIK), { wrapper })
    await act(async () => {
      result.current.mutate({ nik: NIK, nama_lengkap: 'RUS', rt: '003', rw: '001' } as never)
    })
    await waitFor(() => expect(addDocMock).toHaveBeenCalled())
    const log = addDocMock.mock.calls[0][1] as Record<string, string>
    expect(log.aksi).toBe('edit')
    expect(log.nik_target).toBe(NIK)
    expect(log.keterangan).toBe('Edit penduduk: RUS — RT 000 → 003; RW 000 → 001')
    expect(log.oleh).toBe('admin@test.local')
  })
})
