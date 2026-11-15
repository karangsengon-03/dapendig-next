import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { user: { email: string } }) => unknown) => selector({ user: { email: 'admin@test.local' } }),
}))

const calls: string[] = []
const setDocMock = vi.fn()
const deleteDocMock = vi.fn()
const updateDocMock = vi.fn()
const addDocMock = vi.fn()
const getDocsMock = vi.fn()
const batchUpdate = vi.fn()
const batchSet = vi.fn()
const commitMock = vi.fn()
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __col: name }),
  doc: (a: unknown, col?: unknown, id?: string) => (id === undefined ? { __col: (a as { __col: string }).__col, __id: 'auto' } : { __col: col, __id: id }),
  setDoc: (...a: unknown[]) => { calls.push('setDoc'); return setDocMock(...a) },
  deleteDoc: (...a: unknown[]) => { calls.push('deleteDoc'); return deleteDocMock(...a) },
  updateDoc: (...a: unknown[]) => updateDocMock(...a),
  addDoc: (...a: unknown[]) => addDocMock(...a),
  getDocs: (...a: unknown[]) => getDocsMock(...a),
  query: (...a: unknown[]) => a[0], where: vi.fn(),
  writeBatch: () => ({ update: batchUpdate, set: batchSet, commit: () => { calls.push('commit'); return commitMock() } }),
  serverTimestamp: () => 'TS',
}))

import { useJalankanPemekaran, useKembalikanPemekaran } from '@/hooks/usePemekaran'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const item = (id: string, nama: string) => ({ id, nik: id, nama, rtLama: '005', rwLama: '002', rtBaru: '012', rwBaru: '002' })

beforeEach(() => {
  calls.length = 0
  for (const m of [setDocMock, deleteDocMock, updateDocMock, addDocMock, getDocsMock, batchUpdate, batchSet, commitMock]) m.mockReset()
  setDocMock.mockResolvedValue(undefined); deleteDocMock.mockResolvedValue(undefined); updateDocMock.mockResolvedValue(undefined)
  addDocMock.mockResolvedValue({ id: 'x' }); commitMock.mockResolvedValue(undefined)
})

describe('useJalankanPemekaran', () => {
  it('menyimpan keadaan semula DULU (config/pemekaran-…), baru menulis; log tiap penduduk ber-nik_target', async () => {
    const { result } = renderHook(() => useJalankanPemekaran(), { wrapper })
    await act(async () => { result.current.mutate([item('1', 'BUDI'), item('2', 'SITI')]) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(calls.slice(0, 2)).toEqual(['setDoc', 'commit'])
    const [ref, snap] = setDocMock.mock.calls[0] as [{ __col: string; __id: string }, { items: unknown[]; jumlah: number; jenis: string }]
    expect(ref.__col).toBe('config')
    expect(ref.__id).toMatch(/^pemekaran-/)
    expect(snap).toMatchObject({ jenis: 'pemekaran', jumlah: 2 })
    expect(snap.items).toHaveLength(2)
    expect(batchUpdate).toHaveBeenCalledTimes(2)
    expect(batchSet.mock.calls[0][1]).toMatchObject({ aksi: 'edit', nik_target: '1', keterangan: 'Pemekaran wilayah: BUDI — RT 005 → 012' })
    expect(result.current.data?.idBatch).toMatch(/^pemekaran-/)
  })

  it('bila cadangan gagal disimpan, tidak ada penduduk yang ditulis', async () => {
    setDocMock.mockRejectedValue(new Error('permission-denied'))
    const { result } = renderHook(() => useJalankanPemekaran(), { wrapper })
    await act(async () => { result.current.mutate([item('1', 'BUDI')]) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(commitMock).not.toHaveBeenCalled()
    expect(batchUpdate).not.toHaveBeenCalled()
  })
})

describe('useKembalikanPemekaran', () => {
  const batch = { id: 'pemekaran-1', ringkas: 'RT 005 → 012', items: [item('1', 'BUDI'), item('2', 'SITI')] }
  const snapPenduduk = (rows: Record<string, { rt: string; rw: string }>) => ({
    docs: Object.entries(rows).map(([id, v]) => ({ id, data: () => v })),
  })

  it('mengembalikan yang masih sama, melewati yang sudah diubah lagi, lalu menghapus cadangan', async () => {
    getDocsMock.mockResolvedValue(snapPenduduk({ '1': { rt: '012', rw: '002' }, '2': { rt: '030', rw: '002' } }))
    const { result } = renderHook(() => useKembalikanPemekaran(), { wrapper })
    await act(async () => { result.current.mutate(batch) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.dikembalikan).toBe(1)
    expect(result.current.data?.dilewati[0]).toContain('SITI')
    expect(batchUpdate).toHaveBeenCalledTimes(1)
    expect(batchUpdate.mock.calls[0][1]).toMatchObject({ rt: '005', rw: '002' })
    expect(batchSet.mock.calls[0][1].keterangan).toBe('Pemindahan wilayah dikembalikan: BUDI — RT 012 → 005')
    expect(deleteDocMock).toHaveBeenCalledTimes(1)
  })
})
