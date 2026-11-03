import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { MutasiMasuk } from '@/types'

/**
 * Firestore tiruan di memori. Meniru dua sifat penting Firestore asli:
 *  - setDoc/addDoc berdiri sendiri: yang sudah berhasil TETAP tersimpan walau tulisan berikutnya gagal;
 *  - runTransaction atomik: semua baca dulu, tulis di akhir; bila satu operasi ditolak, TIDAK ada satu pun yang tersimpan.
 * `tolakNik` = penulisan ke penduduk/<nik> itu ditolak (mis. izin/jaringan), di cara tulis apa pun.
 */
const toko = new Map<string, Record<string, unknown>>()
let urutId = 0
let tolakNik: string | null = null

type Ref = { __col: string; __id: string; id: string }

function tulis(ref: Ref, data: Record<string, unknown>) {
  if (ref.__col === 'penduduk' && ref.__id === tolakNik) throw new Error('permission-denied (tiruan)')
  toko.set(`${ref.__col}/${ref.__id}`, data)
}
function isi(kol: string): ({ id: string } & Record<string, unknown>)[] {
  return [...toko.entries()].filter(([k]) => k.startsWith(`${kol}/`)).map(([k, v]) => ({ id: k.split('/')[1], ...v }))
}

vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { user: { email: string } }) => unknown) =>
    selector({ user: { email: 'operator@test.local' } }),
}))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, nama: string) => ({ __col: nama }),
  doc: (a: { __col?: string }, kol?: string, id?: string): Ref => {
    const __id = kol === undefined ? `auto-${++urutId}` : (id as string)
    return { __col: kol ?? (a.__col as string), __id, id: __id }
  },
  addDoc: async (kol: { __col: string }, data: Record<string, unknown>) => {
    const id = `auto-${++urutId}`
    tulis({ __col: kol.__col, __id: id, id }, data)
    return { id }
  },
  setDoc: async (ref: Ref, data: Record<string, unknown>) => { tulis(ref, data) },
  getDoc: async (ref: Ref) => {
    const d = toko.get(`${ref.__col}/${ref.__id}`)
    return { exists: () => !!d, data: () => d, id: ref.__id }
  },
  updateDoc: vi.fn(), deleteDoc: vi.fn(), getDocs: vi.fn(), query: vi.fn(), orderBy: vi.fn(), where: vi.fn(),
  serverTimestamp: () => 'TS',
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
    const tulisan: [Ref, Record<string, unknown>][] = []
    const tx = {
      get: async (ref: Ref) => {
        const d = toko.get(`${ref.__col}/${ref.__id}`)
        return { exists: () => !!d, data: () => d, id: ref.__id }
      },
      set: (ref: Ref, data: Record<string, unknown>) => { tulisan.push([ref, data]) },
    }
    const hasil = await fn(tx)
    // atomik: uji semua operasi dulu, baru tulis semuanya
    if (tulisan.some(([r]) => r.__col === 'penduduk' && r.__id === tolakNik)) throw new Error('permission-denied (tiruan)')
    for (const [r, d] of tulisan) toko.set(`${r.__col}/${r.__id}`, d)
    return hasil
  },
}))

import { useAddMutasiMasuk, useAddMutasiMasukBatch } from '@/hooks/useMutasi'

type Data = Omit<MutasiMasuk, 'id' | 'created_at' | 'updated_at' | 'created_by'>

function anggota(nama: string, nik: string, hub: Data['hubungan_keluarga']): Data {
  return {
    nama_lengkap: nama, nik, no_kk: '3511030000001826', jenis_kelamin: 'Laki-laki', agama: 'Islam',
    asal_daerah: 'Jember', hubungan_keluarga: hub, nama_ayah: '', nama_ibu: '', pekerjaan: 'Tidak/Belum Bekerja',
    pendidikan: 'Tidak/Belum Sekolah', rt: '003', rw: '001', status: 'aktif', status_perkawinan: 'Belum Kawin',
    tanggal: '2026-10-14', tanggal_lahir: '1990-05-05', tempat_lahir: 'JEMBER', golongan_darah: '', alamat: 'KARANG SENGON',
  }
}
const A = () => anggota('Budi Santoso', '3511140109480001', 'Kepala Keluarga')
const B = () => anggota('Siti Aminah', '3511140109480002', 'Istri')
const C = () => anggota('Dewi Lestari', '3511140109480003', 'Anak')

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
async function jalankanBatch(daftar: Data[]) {
  const { result } = renderHook(() => useAddMutasiMasukBatch(), { wrapper })
  return result.current.mutateAsync(daftar)
}

beforeEach(() => { toko.clear(); urutId = 0; tolakNik = null })

describe('useAddMutasiMasukBatch — Pindah Masuk 1 keluarga', () => {
  it('3 anggota → 3 catatan pindah masuk + 3 penduduk aktif + 3 log (tak ada yang tertinggal)', async () => {
    await jalankanBatch([A(), B(), C()])
    expect(isi('mutasi_masuk').map((d) => d.nik).sort()).toEqual(['3511140109480001', '3511140109480002', '3511140109480003'])
    const penduduk = isi('penduduk')
    expect(penduduk.map((d) => d.id).sort()).toEqual(['3511140109480001', '3511140109480002', '3511140109480003'])
    expect(penduduk.every((p) => p.status === 'aktif' && p.no_kk === '3511030000001826')).toBe(true)
    expect(isi('log').map((l) => l.nik_target).sort()).toEqual(['3511140109480001', '3511140109480002', '3511140109480003'])
  })

  it('REPRODUKSI BUG: anggota ke-2 ditolak → TIDAK ada setengah tersimpan (semua atau tidak sama sekali)', async () => {
    tolakNik = '3511140109480002'
    await expect(jalankanBatch([A(), B(), C()])).rejects.toThrow()
    expect(isi('mutasi_masuk')).toHaveLength(0)
    expect(isi('penduduk')).toHaveLength(0)
    expect(isi('log')).toHaveLength(0)
  })

  it('REPRODUKSI BUG: setelah gagal lalu diulang → tepat 3 catatan pindah masuk (bukan 4 atau 5)', async () => {
    tolakNik = '3511140109480002'
    await expect(jalankanBatch([A(), B(), C()])).rejects.toThrow()
    tolakNik = null // gangguan teratasi, pengguna menekan Simpan Semua lagi
    await jalankanBatch([A(), B(), C()])
    expect(isi('mutasi_masuk')).toHaveLength(3)
    expect(isi('penduduk')).toHaveLength(3)
  })

  it('NIK kembar di dalam daftar ditolak sebelum menulis apa pun', async () => {
    await expect(jalankanBatch([A(), { ...B(), nik: A().nik }])).rejects.toThrow(/NIK .* lebih dari sekali/)
    expect(toko.size).toBe(0)
  })

  it('NIK kosong di salah satu anggota ditolak sebelum menulis apa pun', async () => {
    await expect(jalankanBatch([A(), { ...B(), nik: '  ' }])).rejects.toThrow('NIK wajib diisi')
    expect(toko.size).toBe(0)
  })

  it('daftar kosong ditolak', async () => {
    await expect(jalankanBatch([])).rejects.toThrow()
    expect(toko.size).toBe(0)
  })

  it('NIK anggota sudah terdaftar sebagai penduduk AKTIF → seluruh keluarga ditolak, tak ada yang tersimpan, data lama utuh', async () => {
    toko.set('penduduk/3511140109480002', { nama_lengkap: 'Orang Lama', nik: '3511140109480002', status: 'aktif', rt: '009' })
    await expect(jalankanBatch([A(), B(), C()])).rejects.toThrow(/3511140109480002 \(Orang Lama, aktif\) sudah terdaftar/)
    expect(isi('mutasi_masuk')).toHaveLength(0)
    expect(isi('log')).toHaveLength(0)
    expect(isi('penduduk')).toHaveLength(1)
    expect(toko.get('penduduk/3511140109480002')).toMatchObject({ nama_lengkap: 'Orang Lama', rt: '009' })
  })

  it('beberapa NIK bentrok disebut semuanya dalam satu pesan', async () => {
    toko.set('penduduk/3511140109480001', { nama_lengkap: 'Lama Satu', status: 'aktif' })
    toko.set('penduduk/3511140109480003', { nama_lengkap: 'Lama Tiga', status: 'meninggal' })
    await expect(jalankanBatch([A(), B(), C()])).rejects.toThrow(/Lama Satu.*Lama Tiga/)
    expect(isi('mutasi_masuk')).toHaveLength(0)
  })

  it('penduduk berstatus pindah keluar boleh ditimpa (warga kembali) dan kembali aktif', async () => {
    toko.set('penduduk/3511140109480002', { nama_lengkap: 'Siti Aminah', nik: '3511140109480002', status: 'mutasi-keluar', rt: '009' })
    await jalankanBatch([A(), B()])
    expect(toko.get('penduduk/3511140109480002')).toMatchObject({ status: 'aktif', rt: '003' })
    expect(isi('mutasi_masuk')).toHaveLength(2)
  })

  it('penduduk berstatus tidak aktif boleh ditimpa', async () => {
    toko.set('penduduk/3511140109480001', { nama_lengkap: 'Budi Santoso', status: 'tidak aktif' })
    await jalankanBatch([A()])
    expect(toko.get('penduduk/3511140109480001')).toMatchObject({ status: 'aktif' })
  })

  it('isi dokumen penduduk sama dengan jalur 1 orang (kolom, status aktif, golongan darah kosong)', async () => {
    await jalankanBatch([A()])
    const p = toko.get('penduduk/3511140109480001') as Record<string, unknown>
    expect(p).toMatchObject({
      nama_lengkap: 'Budi Santoso', nik: '3511140109480001', no_kk: '3511030000001826', hubungan_keluarga: 'Kepala Keluarga',
      rt: '003', rw: '001', status: 'aktif', golongan_darah: '', alamat: 'KARANG SENGON', created_by: 'operator@test.local',
      created_at: 'TS', updated_at: 'TS',
    })
  })
})

describe('useAddMutasiMasuk — 1 orang (perilaku yang sudah benar tidak berubah)', () => {
  it('menulis 1 catatan pindah masuk + 1 penduduk aktif + 1 log', async () => {
    const { result } = renderHook(() => useAddMutasiMasuk(), { wrapper })
    await result.current.mutateAsync(A())
    expect(isi('mutasi_masuk')).toHaveLength(1)
    expect(toko.get('penduduk/3511140109480001')).toMatchObject({ status: 'aktif', nama_lengkap: 'Budi Santoso' })
    expect(isi('log')).toHaveLength(1)
  })

  it('NIK kosong → ditolak SEBELUM catatan pindah masuk ditulis (tidak ada catatan yatim)', async () => {
    const { result } = renderHook(() => useAddMutasiMasuk(), { wrapper })
    await expect(result.current.mutateAsync({ ...A(), nik: '' })).rejects.toThrow('NIK wajib diisi')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toko.size).toBe(0)
  })

  it('NIK sudah terdaftar sebagai penduduk aktif → ditolak, tidak ada catatan yatim', async () => {
    toko.set('penduduk/3511140109480001', { nama_lengkap: 'Orang Lama', status: 'aktif' })
    const { result } = renderHook(() => useAddMutasiMasuk(), { wrapper })
    await expect(result.current.mutateAsync(A())).rejects.toThrow(/sudah terdaftar/)
    expect(isi('mutasi_masuk')).toHaveLength(0)
    expect(toko.get('penduduk/3511140109480001')).toMatchObject({ nama_lengkap: 'Orang Lama' })
  })
})
