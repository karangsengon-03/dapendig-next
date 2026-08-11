import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { PendudukFormData } from '@/types'

// Mock lib/firebase — addPenduduk mengimpor `db` langsung dari sini.
// Nilai objeknya sendiri tidak penting (cuma diteruskan ke runTransaction
// yang JUGA di-mock), yang penting import ini tidak crash karena tidak ada
// kredensial Firebase sungguhan di lingkungan test.
vi.mock('@/lib/firebase', () => ({ db: {} }))

// Mock authStore — addPenduduk butuh email user untuk logging, tidak relevan
// dengan logika race-condition yang diuji di sini.
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { user: { email: string } }) => unknown) =>
    selector({ user: { email: 'operator@test.local' } }),
}))

const runTransactionMock = vi.fn()
const docMock = vi.fn((..._args: unknown[]) => ({ __col: String(_args[1]), __id: String(_args[2]) }))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: (...args: unknown[]) => docMock(...args),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_TS'),
  runTransaction: (...args: unknown[]) => runTransactionMock(...args),
}))

// jalankanSuksesiKK tidak relevan untuk addPenduduk (baru tambah data,
// belum ada suksesi) — mock kosong supaya import tidak crash.
vi.mock('@/lib/kk-succession', () => ({
  jalankanSuksesiKK: vi.fn(),
  kembalikanSuksesiKK: vi.fn(),
}))

import { useAddPenduduk } from '@/hooks/usePenduduk'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const dataContoh: PendudukFormData = {
  nik: '3511140109480099',
  nama_lengkap: 'Test Penduduk',
  no_kk: '3511141005052699',
  hubungan_keluarga: 'Anak',
  jenis_kelamin: 'Laki-laki',
  tempat_lahir: 'Bondowoso',
  tanggal_lahir: '2000-01-01',
  agama: 'Islam',
  pendidikan: '-',
  pekerjaan: '-',
  status_perkawinan: 'Belum Kawin',
  rt: '001',
  rw: '001',
  status: 'aktif',
}

beforeEach(() => {
  runTransactionMock.mockClear()
  docMock.mockClear()
})

describe('useAddPenduduk — regression test untuk fix race condition NIK duplikat', () => {
  it('berhasil menyimpan saat NIK belum ada (simulasi tx.get().exists() === false)', async () => {
    runTransactionMock.mockImplementation(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({ exists: () => false }),
        set: vi.fn(),
      }
      return callback(tx)
    })

    const { result } = renderHook(() => useAddPenduduk(), { wrapper })
    result.current.mutate(dataContoh)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(runTransactionMock).toHaveBeenCalledTimes(1)
  })

  it('GAGAL dengan error jelas saat NIK sudah ada — TIDAK menimpa diam-diam (ini persis skenario yang diperbaiki)', async () => {
    runTransactionMock.mockImplementation(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ nama_lengkap: 'Penduduk Lain Yang Sudah Ada' }),
        }),
        set: vi.fn(),
      }
      return callback(tx) // callback akan throw dari dalam, propagate ke sini
    })

    const { result } = renderHook(() => useAddPenduduk(), { wrapper })
    result.current.mutate(dataContoh)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('sudah terdaftar')
    expect(result.current.error?.message).toContain('Penduduk Lain Yang Sudah Ada')
  })

  it('menolak jika NIK kosong SEBELUM transaksi Firestore dimulai (validasi cepat, tidak buang round-trip)', async () => {
    const { result } = renderHook(() => useAddPenduduk(), { wrapper })
    result.current.mutate({ ...dataContoh, nik: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('NIK wajib diisi')
    expect(runTransactionMock).not.toHaveBeenCalled() // tidak buang-buang panggilan Firestore
  })
})
