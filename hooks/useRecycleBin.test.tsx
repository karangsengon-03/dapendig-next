import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Penduduk } from '@/types'

// Tanpa kredensial Firebase sungguhan: `db` hanya diteruskan ke fungsi Firestore yang di-mock.
vi.mock('@/lib/firebase', () => ({ db: {} }))

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { user: { email: string } }) => unknown) =>
    selector({ user: { email: 'admin@test.local' } }),
}))

type Ref = { __col: string; __id: string }
const addDocMock = vi.fn()
const deleteDocMock = vi.fn()
const getDocsMock = vi.fn()
const runTransactionMock = vi.fn()
const docMock = vi.fn((..._args: unknown[]): Ref => ({ __col: String(_args[1]), __id: String(_args[2]) }))

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __col: name }),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  query: (...args: unknown[]) => ({ __query: args }),
  where: (...args: unknown[]) => ({ __where: args }),
  orderBy: vi.fn(),
  serverTimestamp: () => 'MOCK_TS',
  runTransaction: (...args: unknown[]) => runTransactionMock(...args),
}))

import { useRestorePenduduk, useHapusSemuaRecycleBin, statusUntukPulihkan } from '@/hooks/useRecycleBin'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const NIK = '3511140109480099'
const TS_ASLI = { seconds: 1700000000, nanoseconds: 0 }

const dataAsli = {
  id: 'id-acak-lama',
  nik: NIK,
  nama_lengkap: 'Test Dipulihkan',
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
  created_at: TS_ASLI,
} as unknown as Penduduk

interface TxPalsu {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

/** Transaksi palsu: ada/tidaknya dokumen ditentukan per koleksi. */
function siapkanTransaksi(opsi: { pendudukAda?: boolean; itemAda?: boolean } = {}) {
  const tx: TxPalsu = {
    get: vi.fn(async (ref: Ref) => ({
      exists: () => (ref.__col === 'penduduk' ? (opsi.pendudukAda ?? false) : (opsi.itemAda ?? true)),
      data: () => ({ nama_lengkap: 'Penduduk Lain' }),
    })),
    set: vi.fn(),
    delete: vi.fn(),
  }
  runTransactionMock.mockImplementation(async (_db: unknown, callback: (t: TxPalsu) => Promise<void>) => callback(tx))
  return tx
}

beforeEach(() => {
  addDocMock.mockReset().mockResolvedValue({ id: 'log-1' })
  deleteDocMock.mockReset()
  getDocsMock.mockReset().mockResolvedValue({ empty: true, docs: [] })
  runTransactionMock.mockReset()
  docMock.mockClear()
})

describe('useRestorePenduduk — Pulihkan menulis ke ID = NIK (bukan dokumen acak)', () => {
  it('menulis dokumen penduduk ber-ID NIK, bukan addDoc ke koleksi penduduk', async () => {
    const tx = siapkanTransaksi()
    const { result } = renderHook(() => useRestorePenduduk(), { wrapper })
    await result.current.mutateAsync({ recycleId: 'rb-1', dataAsli })

    expect(tx.set).toHaveBeenCalledTimes(1)
    const [ref, data] = tx.set.mock.calls[0]
    expect(ref).toEqual({ __col: 'penduduk', __id: NIK })
    // ID lama tidak ikut disalin; field lain utuh
    expect(data).not.toHaveProperty('id')
    expect(data).toMatchObject({ nik: NIK, nama_lengkap: 'Test Dipulihkan', no_kk: '3511141005052699', rt: '001' })
    // tidak ada dokumen penduduk ber-ID acak yang dibuat
    expect(addDocMock.mock.calls.some(([c]) => (c as { __col: string }).__col === 'penduduk')).toBe(false)
  })

  it('menghapus item Tempat Sampah dalam transaksi yang sama, lalu mencatat log', async () => {
    const tx = siapkanTransaksi()
    const { result } = renderHook(() => useRestorePenduduk(), { wrapper })
    await result.current.mutateAsync({ recycleId: 'rb-1', dataAsli })

    expect(tx.delete).toHaveBeenCalledWith({ __col: 'recycle_bin', __id: 'rb-1' })
    const logCall = addDocMock.mock.calls.find(([c]) => (c as { __col: string }).__col === 'log')
    expect(logCall?.[1]).toMatchObject({ aksi: 'restore', nik_target: NIK, oleh: 'admin@test.local' })
  })

  it('status asli dipertahankan dan created_at asli tidak ditimpa', async () => {
    const tx = siapkanTransaksi()
    const { result } = renderHook(() => useRestorePenduduk(), { wrapper })
    await result.current.mutateAsync({
      recycleId: 'rb-1',
      dataAsli: { ...dataAsli, status: 'mutasi-keluar' } as Penduduk,
    })
    const [, data] = tx.set.mock.calls[0]
    expect(data.status).toBe('mutasi-keluar')
    expect(data.created_at).toBe(TS_ASLI)
    expect(data.updated_at).toBe('MOCK_TS')
  })

  it('created_at kosong pada data lama → diisi waktu server', async () => {
    const tx = siapkanTransaksi()
    const { result } = renderHook(() => useRestorePenduduk(), { wrapper })
    const tanpaCreatedAt = { ...dataAsli } as Record<string, unknown>
    delete tanpaCreatedAt.created_at
    await result.current.mutateAsync({ recycleId: 'rb-1', dataAsli: tanpaCreatedAt as unknown as Penduduk })
    expect(tx.set.mock.calls[0][1].created_at).toBe('MOCK_TS')
  })

  it('status kosong atau tidak dikenal → aktif', async () => {
    const tx = siapkanTransaksi()
    const { result } = renderHook(() => useRestorePenduduk(), { wrapper })
    await result.current.mutateAsync({ recycleId: 'rb-1', dataAsli: { ...dataAsli, status: '' } as unknown as Penduduk })
    await result.current.mutateAsync({ recycleId: 'rb-2', dataAsli: { ...dataAsli, status: 'hilang' } as unknown as Penduduk })
    expect(tx.set.mock.calls[0][1].status).toBe('aktif')
    expect(tx.set.mock.calls[1][1].status).toBe('aktif')
  })
})

describe('useRestorePenduduk — menolak bila NIK sudah terdaftar', () => {
  it('dokumen ber-ID = NIK sudah ada → ditolak, tidak menulis, item tetap di Tempat Sampah, tanpa log', async () => {
    const tx = siapkanTransaksi({ pendudukAda: true })
    const { result } = renderHook(() => useRestorePenduduk(), { wrapper })
    await expect(result.current.mutateAsync({ recycleId: 'rb-1', dataAsli })).rejects.toThrow('NIK sudah terdaftar di data penduduk')
    expect(tx.set).not.toHaveBeenCalled()
    expect(tx.delete).not.toHaveBeenCalled()
    expect(addDocMock).not.toHaveBeenCalled()
  })

  it('dokumen lain (ID acak) dengan field nik yang sama sudah ada → ditolak sebelum transaksi', async () => {
    getDocsMock.mockResolvedValue({ empty: false, docs: [{ id: 'acak-1' }] })
    const { result } = renderHook(() => useRestorePenduduk(), { wrapper })
    await expect(result.current.mutateAsync({ recycleId: 'rb-1', dataAsli })).rejects.toThrow('NIK sudah terdaftar di data penduduk')
    expect(runTransactionMock).not.toHaveBeenCalled()
    expect(addDocMock).not.toHaveBeenCalled()
  })

  it('NIK pada data yang dihapus kosong → ditolak tanpa menyentuh Firestore', async () => {
    const { result } = renderHook(() => useRestorePenduduk(), { wrapper })
    await expect(
      result.current.mutateAsync({ recycleId: 'rb-1', dataAsli: { ...dataAsli, nik: '  ' } as Penduduk }),
    ).rejects.toThrow('NIK pada data yang dihapus kosong')
    expect(getDocsMock).not.toHaveBeenCalled()
    expect(runTransactionMock).not.toHaveBeenCalled()
  })

  it('item Tempat Sampah sudah tidak ada (sudah dipulihkan/dihapus di tab lain) → ditolak, tidak menulis', async () => {
    const tx = siapkanTransaksi({ itemAda: false })
    const { result } = renderHook(() => useRestorePenduduk(), { wrapper })
    await expect(result.current.mutateAsync({ recycleId: 'rb-1', dataAsli })).rejects.toThrow('Data sudah tidak ada di Tempat Sampah')
    expect(tx.set).not.toHaveBeenCalled()
  })

  it('peran tanpa izin hapus item (rules): transaksi ditolak utuh → tidak ada penduduk ganda, tidak ada log', async () => {
    runTransactionMock.mockRejectedValue(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }))
    const { result } = renderHook(() => useRestorePenduduk(), { wrapper })
    await expect(result.current.mutateAsync({ recycleId: 'rb-1', dataAsli })).rejects.toMatchObject({ code: 'permission-denied' })
    expect(addDocMock).not.toHaveBeenCalled()
  })
})

describe('statusUntukPulihkan', () => {
  it('mempertahankan status yang dikenal', () => {
    expect(statusUntukPulihkan('aktif')).toBe('aktif')
    expect(statusUntukPulihkan('tidak aktif')).toBe('tidak aktif')
    expect(statusUntukPulihkan('meninggal')).toBe('meninggal')
    expect(statusUntukPulihkan('mutasi-keluar')).toBe('mutasi-keluar')
  })

  it('kosong/tidak dikenal → aktif', () => {
    expect(statusUntukPulihkan(undefined)).toBe('aktif')
    expect(statusUntukPulihkan(null)).toBe('aktif')
    expect(statusUntukPulihkan('')).toBe('aktif')
    expect(statusUntukPulihkan('Aktif')).toBe('aktif')
    expect(statusUntukPulihkan(42)).toBe('aktif')
  })
})

describe('useHapusSemuaRecycleBin — mengembalikan jumlah yang benar-benar dihapus', () => {
  it('menghapus semua dokumen yang ada SAAT ITU dan mengembalikan jumlahnya (untuk toast hasil)', async () => {
    getDocsMock.mockResolvedValue({ empty: false, size: 3, docs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] })
    deleteDocMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useHapusSemuaRecycleBin(), { wrapper })
    const jumlah = await result.current.mutateAsync()
    expect(jumlah).toBe(3)
    expect(deleteDocMock).toHaveBeenCalledTimes(3)
    expect(deleteDocMock.mock.calls.map(([ref]) => (ref as Ref).__id).sort()).toEqual(['a', 'b', 'c'])
    const logCall = addDocMock.mock.calls.find(([c]) => (c as { __col: string }).__col === 'log')
    expect(logCall?.[1]).toMatchObject({ aksi: 'hapus_permanen', keterangan: 'Hapus semua recycle bin (3 data)' })
  })

  it('Tempat Sampah sudah kosong → mengembalikan 0', async () => {
    getDocsMock.mockResolvedValue({ empty: true, size: 0, docs: [] })
    const { result } = renderHook(() => useHapusSemuaRecycleBin(), { wrapper })
    expect(await result.current.mutateAsync()).toBe(0)
    expect(deleteDocMock).not.toHaveBeenCalled()
  })
})
