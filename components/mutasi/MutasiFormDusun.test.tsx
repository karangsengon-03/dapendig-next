import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/hooks/useMutasi', () => ({
  useAddMutasiKeluar: () => ({ mutate: vi.fn(), isPending: false }),
  useAddMutasiMasuk: () => ({ mutate: vi.fn(), isPending: false }),
  useAddMutasiMasukBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/usePenduduk', () => ({
  useCatatPindahKeluarKeluarga: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePendudukList: () => ({ data: [], isLoading: false }),
}))

import { MutasiMasukForm } from '@/components/mutasi/MutasiForm'
import { useAppStore } from '@/store/appStore'
import { DUSUN_BAWAAN, RW_BAWAAN } from '@/lib/dusun'

const dusunEl = () => document.getElementById('pm-dusun') as HTMLInputElement
const rtEl = () => document.getElementById('pm-rt') as HTMLSelectElement
const opsiRt = () => [...rtEl().options].map((o) => o.value)

beforeEach(() => { act(() => useAppStore.setState({ dusun: DUSUN_BAWAAN, rw: RW_BAWAAN })) })
const opsiRw = () => [...(document.getElementById('pm-rw') as HTMLSelectElement).options].map((o) => o.value)

describe('Form Pindah Masuk: isian Dusun mengikuti RT', () => {
  it('ada isian Dusun hanya-baca berisi dusun dari RT terpilih', () => {
    render(<MutasiMasukForm onSuccess={() => {}} onCancel={() => {}} />)
    expect(screen.getByLabelText('Dusun')).toBe(dusunEl())
    expect(dusunEl().readOnly).toBe(true)
    expect(dusunEl().value).toBe('Pesanggrahan') // RT bawaan 001
    fireEvent.change(rtEl(), { target: { value: '004' } })
    expect(dusunEl().value).toBe('Paleran')
    fireEvent.change(rtEl(), { target: { value: '010' } })
    expect(dusunEl().value).toBe('Blangguan')
  })

  it('pilihan RT mengikuti pengaturan: RT baru muncul, RT yang dihapus hilang', () => {
    act(() => useAppStore.setState({ dusun: [{ nama: 'Krajan', rt: ['001', '002'] }, { nama: 'Sengon', rt: ['003', '012'] }] }))
    render(<MutasiMasukForm onSuccess={() => {}} onCancel={() => {}} />)
    expect(opsiRt()).toEqual(['001', '002', '003', '012'])
    fireEvent.change(rtEl(), { target: { value: '012' } })
    expect(dusunEl().value).toBe('Sengon')
  })

  it('RT yang belum masuk dusun mana pun menampilkan "—"', () => {
    act(() => useAppStore.setState({ dusun: [{ nama: 'Krajan', rt: ['002', '003'] }] }))
    render(<MutasiMasukForm onSuccess={() => {}} onCancel={() => {}} />)
    // RT bawaan form 001 tidak ada di daftar baru: tetap tampil (data lama tidak diam-diam diganti), dusunnya "—"
    expect(rtEl().value).toBe('001')
    expect(dusunEl().value).toBe('—')
  })
})

describe('Form Pindah Masuk: pilihan RW mengikuti pengaturan', () => {
  it('bawaan 001–005', () => {
    render(<MutasiMasukForm onSuccess={() => {}} onCancel={() => {}} />)
    expect(opsiRw()).toEqual(['001', '002', '003', '004', '005'])
  })
  it('RW dari pengaturan: RW baru muncul, RW yang dihapus hilang', () => {
    act(() => useAppStore.setState({ rw: ['001', '002', '006'] }))
    render(<MutasiMasukForm onSuccess={() => {}} onCancel={() => {}} />)
    expect(opsiRw()).toEqual(['001', '002', '006'])
  })
})
