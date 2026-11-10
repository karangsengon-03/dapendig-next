import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/layout/useIsDesktop', () => ({ useIsDesktop: () => true }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('') }))
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ isAdmin: () => true, isOperator: () => true }) }))
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/components/vital/VitalForm', () => ({ LahirForm: () => null, MeninggalForm: () => null }))

let lahir: unknown[] = []
let meninggal: unknown[] = []
let penduduk: unknown[] = []
const vitalBiasa = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })
vi.mock('@/hooks/useVital', () => ({
  useLahir: () => ({ data: lahir, isLoading: false }),
  useMeninggal: () => ({ data: meninggal, isLoading: false }),
  useDeleteLahir: () => vitalBiasa(),
  useDeleteMeninggal: () => vitalBiasa(),
  useRollbackMeninggal: () => vitalBiasa(),
  useEditLahir: () => vitalBiasa(),
  useEditMeninggal: () => vitalBiasa(),
}))
vi.mock('@/hooks/usePenduduk', () => ({
  usePendudukDetail: () => ({ data: undefined, isLoading: false }),
  usePendudukList: () => ({ data: penduduk, isLoading: false }),
}))

import VitalPage from '@/app/vital/page'

const NIK = { l1: '3511140109260031', l2: '3511140109260032', l3: '3511140109260033', d1: '3511140109480041', d2: '3511140109480042', d3: '3511140109480043' }

beforeEach(() => {
  // Kelahiran: Anak A (Feb, RT 001), Anak B (Sep, RT 002), Anak C (Jun, RT 002). RT ada di catatan.
  lahir = [
    { id: 'l1', nama_lengkap: 'Anak A', nik: NIK.l1, no_kk: '3511030000000011', tanggal_lahir: '2026-02-01', rt: '001', rw: '001', jenis_kelamin: 'Laki-laki', nama_ayah: 'Ayah', nama_ibu: 'Ibu' },
    { id: 'l2', nama_lengkap: 'Anak B', nik: NIK.l2, no_kk: '3511030000000012', tanggal_lahir: '2026-09-20', rt: '002', rw: '001', jenis_kelamin: 'Perempuan', nama_ayah: 'Ayah', nama_ibu: 'Ibu' },
    { id: 'l3', nama_lengkap: 'Anak C', nik: NIK.l3, no_kk: '3511030000000013', tanggal_lahir: '2026-06-05', rt: '002', rw: '001', jenis_kelamin: 'Laki-laki', nama_ayah: 'Ayah', nama_ibu: 'Ibu' },
  ]
  // Kematian: Pak X (Apr, RT 003), Pak Y (Agu, RT 004), Bu Z (Jan, RT 003). RT hanya ada di data penduduk.
  meninggal = [
    { id: 'd1', nama: 'Pak X', nik_target: NIK.d1, no_kk: '3511030000000021', tanggal: '2026-04-10', hub_asli: 'Kepala Keluarga', sebab: 'Sakit' },
    { id: 'd2', nama: 'Pak Y', nik_target: NIK.d2, no_kk: '3511030000000022', tanggal: '2026-08-01', hub_asli: 'Kepala Keluarga', sebab: 'Sakit' },
    { id: 'd3', nama: 'Bu Z', nik_target: NIK.d3, no_kk: '3511030000000023', tanggal: '2026-01-15', hub_asli: 'Istri', sebab: 'Sakit' },
  ]
  penduduk = [
    { id: NIK.d1, nik: NIK.d1, rt: '003' },
    { id: NIK.d2, nik: NIK.d2, rt: '004' },
    { id: NIK.d3, nik: NIK.d3, rt: '003' },
  ]
})

const barisNik = () => Array.from(document.querySelectorAll('tbody tr')).map((tr) => tr.querySelectorAll('td')[2]?.textContent)
const pilihMenu = (chip: string, item: string) => {
  fireEvent.click(screen.getByRole('button', { name: chip }))
  fireEvent.click(screen.getByRole('menuitemradio', { name: item }))
}
const kolomCari = () => screen.getByRole('textbox', { name: 'Cari nama, NIK, atau No. KK' })
const cari = (v: string) => fireEvent.change(kolomCari(), { target: { value: v } })
const bukaTabMeninggal = () => fireEvent.click(screen.getByRole('button', { name: /Kematian/ }))

describe('Halaman Kelahiran — pencarian, urutan, RT', () => {
  it('bawaan: tanggal lahir terbaru → terlama; Terlama membalik', () => {
    render(<VitalPage />)
    expect(barisNik()).toEqual([NIK.l2, NIK.l3, NIK.l1]) // Sep, Jun, Feb
    pilihMenu('Urutkan', 'Terlama')
    expect(barisNik()).toEqual([NIK.l1, NIK.l3, NIK.l2])
  })

  it('Nama Z–A', () => {
    render(<VitalPage />)
    pilihMenu('Urutkan', 'Nama Z–A')
    expect(barisNik()).toEqual([NIK.l3, NIK.l2, NIK.l1])
  })

  it('filter RT memakai RT pada catatan kelahiran', () => {
    render(<VitalPage />)
    pilihMenu('Filter RT', 'RT 002')
    expect(barisNik()).toEqual([NIK.l2, NIK.l3])
    pilihMenu('Filter RT', 'RT 001')
    expect(barisNik()).toEqual([NIK.l1])
  })

  it('cari nama, potongan NIK, dan No. KK; digabung dengan filter RT', () => {
    render(<VitalPage />)
    cari('anak c')
    expect(barisNik()).toEqual([NIK.l3])
    cari('260032')
    expect(barisNik()).toEqual([NIK.l2])
    cari('3511 0300 0000 0011')
    expect(barisNik()).toEqual([NIK.l1])
    cari('anak')
    pilihMenu('Filter RT', 'RT 002')
    expect(barisNik()).toEqual([NIK.l2, NIK.l3])
  })

  it('Reset memulihkan pencarian, RT, dan urutan', () => {
    render(<VitalPage />)
    expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull()
    cari('anak a')
    pilihMenu('Filter RT', 'RT 002')
    expect(barisNik()).toEqual([])
    expect(screen.getByText('Tidak ada data yang cocok')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Reset/ }))
    expect(barisNik()).toEqual([NIK.l2, NIK.l3, NIK.l1])
    expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull()
  })
})

describe('Halaman Kematian — pencarian, urutan, RT', () => {
  it('bawaan: tanggal meninggal terbaru → terlama; Terlama membalik', () => {
    render(<VitalPage />)
    bukaTabMeninggal()
    expect(barisNik()).toEqual([NIK.d2, NIK.d1, NIK.d3]) // Agu, Apr, Jan
    pilihMenu('Urutkan', 'Terlama')
    expect(barisNik()).toEqual([NIK.d3, NIK.d1, NIK.d2])
  })

  it('filter RT memakai RT dari data penduduk (RT tidak disimpan di catatan kematian)', () => {
    render(<VitalPage />)
    bukaTabMeninggal()
    pilihMenu('Filter RT', 'RT 003')
    expect(barisNik()).toEqual([NIK.d1, NIK.d3]) // Pak Y (RT 004) tersaring
    pilihMenu('Filter RT', 'RT 004')
    expect(barisNik()).toEqual([NIK.d2])
  })

  it('urut RT ↑: RT 003 dulu lalu RT 004; sama → nama A–Z', () => {
    render(<VitalPage />)
    bukaTabMeninggal()
    pilihMenu('Urutkan', 'RT ↑')
    expect(barisNik()).toEqual([NIK.d3, NIK.d1, NIK.d2]) // Bu Z, Pak X (RT 003), Pak Y (RT 004)
  })

  it('cari nama / NIK / No. KK', () => {
    render(<VitalPage />)
    bukaTabMeninggal()
    cari('pak y')
    expect(barisNik()).toEqual([NIK.d2])
    cari('480043')
    expect(barisNik()).toEqual([NIK.d3])
    cari('3511030000000021')
    expect(barisNik()).toEqual([NIK.d1])
  })

  it('pindah tab mengembalikan pencarian, RT, dan urutan ke bawaan', () => {
    render(<VitalPage />)
    cari('anak b')
    pilihMenu('Filter RT', 'RT 002')
    bukaTabMeninggal()
    expect((kolomCari() as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Filter RT' }).textContent).toBe('RT')
    expect(barisNik()).toHaveLength(3)
  })
})
