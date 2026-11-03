import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Lahir } from '@/types'

/**
 * Firestore tiruan di memori (sama polanya dengan useMutasi.masukKeluarga.test.tsx):
 *  - setDoc/addDoc berdiri sendiri: yang sudah berhasil TETAP tersimpan walau tulisan berikutnya gagal;
 *  - runTransaction atomik: semua baca dulu, tulis di akhir; satu operasi ditolak = tidak ada yang tersimpan.
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
vi.mock('@/lib/kk-succession', () => ({ jalankanSuksesiKK: vi.fn(), kembalikanSuksesiKK: vi.fn() }))
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

import { useAddLahir } from '@/hooks/useVital'

type Data = Omit<Lahir, 'id' | 'created_at' | 'created_by'>
const NIK_BAYI = '3511142610260001'

function bayi(p: Partial<Data> = {}): Data {
  return {
    nama_lengkap: 'Muhammad Fajar', nik: NIK_BAYI, no_kk: '3511030000001826', jenis_kelamin: 'Laki-laki', agama: 'Islam',
    hubungan_keluarga: 'Anak', nama_ayah: 'Budi Santoso', nama_ibu: 'Siti Aminah', rt: '003', rw: '001', status: 'aktif',
    status_perkawinan: 'Belum Kawin', tanggal_lahir: '2026-10-14', tempat_lahir: 'BONDOWOSO', pendidikan: '', pekerjaan: '',
    alamat: 'KARANG SENGON', ...p,
  }
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
async function catatLahir(data: Data) {
  const { result } = renderHook(() => useAddLahir(), { wrapper })
  return result.current.mutateAsync(data)
}

beforeEach(() => { toko.clear(); urutId = 0; tolakNik = null })

describe('useAddLahir — Kelahiran', () => {
  it('bayi baru → 1 catatan kelahiran + 1 penduduk aktif + 1 log', async () => {
    const id = await catatLahir(bayi())
    expect(isi('lahir')).toHaveLength(1)
    expect(isi('lahir')[0].id).toBe(id)
    expect(toko.get(`penduduk/${NIK_BAYI}`)).toMatchObject({ nama_lengkap: 'Muhammad Fajar', status: 'aktif' })
    expect(isi('log').map((l) => l.nik_target)).toEqual([NIK_BAYI])
  })

  it('isi dokumen penduduk: bawaan bayi (Belum Kawin, Tidak/Belum Sekolah, Tidak/Belum Bekerja, golongan darah kosong)', async () => {
    await catatLahir(bayi())
    expect(toko.get(`penduduk/${NIK_BAYI}`)).toMatchObject({
      nik: NIK_BAYI, no_kk: '3511030000001826', hubungan_keluarga: 'Anak', rt: '003', rw: '001', tempat_lahir: 'BONDOWOSO',
      tanggal_lahir: '2026-10-14', status_perkawinan: 'Belum Kawin', pendidikan: 'Tidak/Belum Sekolah',
      pekerjaan: 'Tidak/Belum Bekerja', golongan_darah: '', alamat: 'KARANG SENGON', created_by: 'operator@test.local',
      created_at: 'TS', updated_at: 'TS',
    })
  })

  it('pendidikan dan pekerjaan yang diisi dipakai apa adanya', async () => {
    await catatLahir(bayi({ pendidikan: 'PAUD', pekerjaan: 'Pelajar/Mahasiswa' }))
    expect(toko.get(`penduduk/${NIK_BAYI}`)).toMatchObject({ pendidikan: 'PAUD', pekerjaan: 'Pelajar/Mahasiswa' })
  })

  it('REPRODUKSI BUG: NIK sudah terdaftar sebagai penduduk → ditolak, data lama utuh, tidak ada catatan kelahiran', async () => {
    toko.set(`penduduk/${NIK_BAYI}`, { nama_lengkap: 'Orang Lama', nik: NIK_BAYI, status: 'aktif', rt: '009' })
    await expect(catatLahir(bayi())).rejects.toThrow(/NIK 3511142610260001 sudah terdaftar atas nama Orang Lama \(aktif\)/)
    expect(isi('lahir')).toHaveLength(0)
    expect(isi('log')).toHaveLength(0)
    expect(toko.get(`penduduk/${NIK_BAYI}`)).toMatchObject({ nama_lengkap: 'Orang Lama', rt: '009' })
  })

  it.each(['mutasi-keluar', 'meninggal', 'tidak aktif'])('NIK sudah ada berstatus "%s" juga ditolak (kelahiran selalu orang baru)', async (status) => {
    toko.set(`penduduk/${NIK_BAYI}`, { nama_lengkap: 'Orang Lama', status })
    await expect(catatLahir(bayi())).rejects.toThrow(/sudah terdaftar/)
    expect(isi('lahir')).toHaveLength(0)
    expect(toko.get(`penduduk/${NIK_BAYI}`)).toMatchObject({ nama_lengkap: 'Orang Lama', status })
  })

  it('REPRODUKSI BUG: NIK kosong → ditolak SEBELUM menulis apa pun (tidak ada catatan kelahiran yatim)', async () => {
    await expect(catatLahir(bayi({ nik: '  ' }))).rejects.toThrow('NIK bayi wajib diisi')
    expect(toko.size).toBe(0)
  })

  it('REPRODUKSI BUG: penulisan penduduk gagal → tidak ada catatan kelahiran setengah jadi; diulang → tepat 1 catatan', async () => {
    tolakNik = NIK_BAYI
    await expect(catatLahir(bayi())).rejects.toThrow()
    expect(isi('lahir')).toHaveLength(0)
    expect(isi('penduduk')).toHaveLength(0)
    expect(isi('log')).toHaveLength(0)
    tolakNik = null // gangguan teratasi, pengguna menekan Simpan lagi
    await catatLahir(bayi())
    expect(isi('lahir')).toHaveLength(1)
    expect(isi('penduduk')).toHaveLength(1)
  })
})
