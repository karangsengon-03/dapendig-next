import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/layout/useIsDesktop', () => ({ useIsDesktop: () => true }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('') }))
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ isAdmin: () => true, isOperator: () => true }) }))
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/components/mutasi/MutasiForm', () => ({ MutasiKeluarForm: () => null, MutasiMasukForm: () => null }))

let keluar: unknown[] = []
let masuk: unknown[] = []
let penduduk: unknown[] = []
const daftarPendudukMock = vi.fn((opsi?: { enabled?: boolean }) => ({
  data: opsi?.enabled === false ? undefined : penduduk,
  isLoading: false,
}))
const mutasiBiasa = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })
vi.mock('@/hooks/useMutasi', () => ({
  useMutasiKeluar: () => ({ data: keluar, isLoading: false }),
  useMutasiMasuk: () => ({ data: masuk, isLoading: false }),
  useDeleteMutasiKeluar: () => mutasiBiasa(),
  useDeleteMutasiMasuk: () => mutasiBiasa(),
  useRollbackMutasiKeluar: () => mutasiBiasa(),
  useEditMutasiKeluar: () => mutasiBiasa(),
  useEditMutasiMasuk: () => mutasiBiasa(),
}))
vi.mock('@/hooks/usePenduduk', () => ({
  usePendudukDetail: () => ({ data: undefined, isLoading: false }),
  usePendudukList: (opsi?: { enabled?: boolean }) => daftarPendudukMock(opsi),
}))

import MutasiPage from '@/app/mutasi/page'

const NIK = { a: '3511140109480011', b: '3511140109480012', c: '3511140109480013', d: '3511140109480021', e: '3511140109480022', f: '3511140109480023' }

beforeEach(() => {
  daftarPendudukMock.mockClear()
  // Pindah keluar: Agus (Mar, RT 002), Budi (Sep, RT 010), Citra (Jun, RT 002). RT hanya ada di data penduduk.
  keluar = [
    { id: 'k1', nama: 'Agus', nik_target: NIK.a, no_kk: '3511030000000001', tanggal: '2026-03-10', tujuan: 'Malang', alasan: '' },
    { id: 'k2', nama: 'Budi', nik_target: NIK.b, no_kk: '3511030000000002', tanggal: '2026-09-01', tujuan: 'Surabaya', alasan: '' },
    { id: 'k3', nama: 'Citra', nik_target: NIK.c, no_kk: '3511030000000003', tanggal: '2026-06-15', tujuan: 'Jember', alasan: '' },
  ]
  penduduk = [
    { id: NIK.a, nik: NIK.a, rt: '002' },
    { id: NIK.b, nik: NIK.b, rt: '010' },
    { id: NIK.c, nik: NIK.c, rt: '002' },
  ]
  // Pindah masuk: Dewi (Mei, RT 001), Eko (Agu, RT 003), Fajar (Jul, RT 003). RT ada di catatannya.
  masuk = [
    { id: 'm1', nama_lengkap: 'Dewi', nik: NIK.d, no_kk: '3511030000000004', tanggal: '2026-05-01', rt: '001', rw: '001', asal_daerah: 'Bondowoso' },
    { id: 'm2', nama_lengkap: 'Eko', nik: NIK.e, no_kk: '3511030000000005', tanggal: '2026-08-20', rt: '003', rw: '001', asal_daerah: 'Jember' },
    { id: 'm3', nama_lengkap: 'Fajar', nik: NIK.f, no_kk: '3511030000000006', tanggal: '2026-07-04', rt: '003', rw: '001', asal_daerah: 'Situbondo' },
  ]
})

/** NIK pada kolom ke-3 tabel, urut seperti tampil. */
const barisNik = () => Array.from(document.querySelectorAll('tbody tr')).map((tr) => tr.querySelectorAll('td')[2]?.textContent)
const pilihMenu = (chip: string, item: string) => {
  fireEvent.click(screen.getByRole('button', { name: chip }))
  fireEvent.click(screen.getByRole('menuitemradio', { name: item }))
}
const kolomCari = () => screen.getByRole('textbox', { name: 'Cari nama, NIK, atau No. KK' })
const cari = (v: string) => fireEvent.change(kolomCari(), { target: { value: v } })
const bukaTabMasuk = () => fireEvent.click(screen.getByRole('button', { name: /Pindah masuk/ }))

describe('Halaman Mutasi — urutan', () => {
  it('bawaan: terbaru → terlama', () => {
    render(<MutasiPage />)
    expect(barisNik()).toEqual([NIK.b, NIK.c, NIK.a]) // Sep, Jun, Mar
  })

  it('Urutkan → Terlama membalik urutan', () => {
    render(<MutasiPage />)
    pilihMenu('Urutkan', 'Terlama')
    expect(barisNik()).toEqual([NIK.a, NIK.c, NIK.b])
  })

  it('Urutkan → Nama A–Z dan Nama Z–A', () => {
    render(<MutasiPage />)
    pilihMenu('Urutkan', 'Nama A–Z')
    expect(barisNik()).toEqual([NIK.a, NIK.b, NIK.c])
    pilihMenu('Urutkan', 'Nama Z–A')
    expect(barisNik()).toEqual([NIK.c, NIK.b, NIK.a])
  })

  it('Urutkan → NIK ↑ dan No. KK ↑', () => {
    render(<MutasiPage />)
    pilihMenu('Urutkan', 'NIK ↑')
    expect(barisNik()).toEqual([NIK.a, NIK.b, NIK.c])
    pilihMenu('Urutkan', 'No. KK ↑')
    expect(barisNik()).toEqual([NIK.a, NIK.b, NIK.c])
  })
})

describe('Halaman Mutasi — pencarian', () => {
  it('nama (sebagian, tanpa membedakan huruf besar/kecil)', () => {
    render(<MutasiPage />)
    cari('cITr')
    expect(barisNik()).toEqual([NIK.c])
  })

  it('potongan NIK dan No. KK lengkap dengan spasi/strip', () => {
    render(<MutasiPage />)
    cari('480012')
    expect(barisNik()).toEqual([NIK.b])
    cari('3511 0300-0000-0001')
    expect(barisNik()).toEqual([NIK.a])
  })

  it('tidak ada yang cocok → pesan kosong yang menyebut RT; Reset memulihkan semua', () => {
    render(<MutasiPage />)
    cari('tidak-ada-nama-ini')
    expect(barisNik()).toEqual([])
    expect(screen.getByText('Tidak ada data yang cocok')).toBeTruthy()
    expect(screen.getByText(/pencarian, bulan, atau RT/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Reset/ }))
    expect(barisNik()).toEqual([NIK.b, NIK.c, NIK.a])
  })
})

describe('Halaman Mutasi — filter RT', () => {
  it('Pindah keluar: RT diambil dari data penduduk (RT tidak disimpan di catatannya)', () => {
    render(<MutasiPage />)
    pilihMenu('Filter RT', 'RT 002')
    expect(barisNik()).toEqual([NIK.c, NIK.a]) // Budi (RT 010) tersaring; sisanya terbaru dulu
    pilihMenu('Filter RT', 'RT 010')
    expect(barisNik()).toEqual([NIK.b])
    pilihMenu('Filter RT', 'Semua RT')
    expect(barisNik()).toHaveLength(3)
  })

  it('daftar penduduk baru diminta saat RT dipakai (hemat pembacaan Firestore)', () => {
    render(<MutasiPage />)
    expect(daftarPendudukMock.mock.calls.at(-1)?.[0]).toEqual({ enabled: false })
    pilihMenu('Filter RT', 'RT 002')
    expect(daftarPendudukMock.mock.calls.at(-1)?.[0]).toEqual({ enabled: true })
  })

  it('Pindah keluar: orang yang tak ada lagi di data penduduk tidak cocok dengan RT mana pun, tetapi tetap muncul tanpa filter RT', () => {
    penduduk = [{ id: NIK.a, nik: NIK.a, rt: '002' }]
    render(<MutasiPage />)
    expect(barisNik()).toHaveLength(3)
    pilihMenu('Filter RT', 'RT 002')
    expect(barisNik()).toEqual([NIK.a])
  })

  it('Pindah masuk: memakai RT pada catatan; gabung dengan pencarian', () => {
    render(<MutasiPage />)
    bukaTabMasuk()
    expect(barisNik()).toEqual([NIK.e, NIK.f, NIK.d]) // Agu, Jul, Mei
    pilihMenu('Filter RT', 'RT 003')
    expect(barisNik()).toEqual([NIK.e, NIK.f])
    cari('fajar')
    expect(barisNik()).toEqual([NIK.f])
    // Pindah masuk tidak butuh daftar penduduk
    expect(daftarPendudukMock.mock.calls.every((c) => c[0]?.enabled === false)).toBe(true)
  })

  it('Pindah masuk: urut RT ↑ (RT 001 dulu), RT sama → nama A–Z', () => {
    render(<MutasiPage />)
    bukaTabMasuk()
    pilihMenu('Urutkan', 'RT ↑')
    expect(barisNik()).toEqual([NIK.d, NIK.e, NIK.f]) // Dewi RT001; Eko & Fajar RT003
  })
})

describe('Halaman Mutasi — Reset dan ganti tab', () => {
  it('tombol Reset hanya tampil bila ada pencarian/filter/urutan selain bawaan', () => {
    render(<MutasiPage />)
    expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull()
    pilihMenu('Urutkan', 'Terlama')
    expect(screen.getByRole('button', { name: /Reset/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Reset/ }))
    expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull()
    expect(barisNik()).toEqual([NIK.b, NIK.c, NIK.a])
  })

  it('Reset mengosongkan pencarian, RT, dan urutan sekaligus', () => {
    render(<MutasiPage />)
    cari('a')
    pilihMenu('Filter RT', 'RT 002')
    pilihMenu('Urutkan', 'Nama Z–A')
    fireEvent.click(screen.getByRole('button', { name: /Reset/ }))
    expect((kolomCari() as HTMLInputElement).value).toBe('')
    expect(barisNik()).toEqual([NIK.b, NIK.c, NIK.a])
    expect(screen.getByRole('button', { name: 'Filter RT' }).textContent).toBe('RT')
  })

  it('pindah tab mengembalikan pencarian, RT, dan urutan ke bawaan', () => {
    render(<MutasiPage />)
    cari('budi')
    pilihMenu('Filter RT', 'RT 010')
    bukaTabMasuk()
    expect((kolomCari() as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Filter RT' }).textContent).toBe('RT')
    expect(barisNik()).toHaveLength(3)
  })
})
