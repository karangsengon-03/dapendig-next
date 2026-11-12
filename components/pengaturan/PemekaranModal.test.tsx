import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { useAppStore } from '@/store/appStore'

// jsdom tidak punya matchMedia; dialog memakainya untuk memilih lembar (HP) atau modal (desktop)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({
    matches: q.includes('min-width'), media: q, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }),
})

const mutateMock = vi.fn()
vi.mock('@/hooks/usePenduduk', () => ({
  usePendudukList: () => ({
    data: [
      { id: '1', nik: '1', no_kk: 'KK1', nama_lengkap: 'BUDI', hubungan_keluarga: 'Kepala Keluarga', rt: '005', rw: '002', status: 'aktif' },
      { id: '2', nik: '2', no_kk: 'KK1', nama_lengkap: 'SITI', hubungan_keluarga: 'Istri', rt: '005', rw: '002', status: 'aktif' },
      { id: '3', nik: '3', no_kk: 'KK2', nama_lengkap: 'ANI', hubungan_keluarga: 'Kepala Keluarga', rt: '005', rw: '003', status: 'aktif' },
    ],
  }),
}))
vi.mock('@/hooks/usePemekaran', () => ({ useJalankanPemekaran: () => ({ mutate: mutateMock, isPending: false }) }))
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))

import { PemekaranModal } from '@/components/pengaturan/PemekaranModal'

beforeEach(() => {
  mutateMock.mockReset()
  useAppStore.setState({ rtPakai: { '005': 3 }, rwPakai: { '002': 2, '003': 1 }, dusun: [{ nama: 'A', rt: ['005'] }] })
})

describe('PemekaranModal', () => {
  it('seluruh RT: ringkasan, konfirmasi dua langkah, lalu kirim rencana pemindahan', () => {
    render(<PemekaranModal onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('RT tujuan'), { target: { value: '012' } })
    const ringkas = screen.getByTestId('ringkasan-pemekaran')
    expect(ringkas.textContent).toContain('3 jiwa')
    expect(ringkas.textContent).toContain('RT 012')
    expect(ringkas.textContent).toContain('belum terdaftar di dusun mana pun')
    fireEvent.click(screen.getByRole('button', { name: /Lanjut \(3 jiwa\)/ }))
    expect(mutateMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('mengubah RT/RW 3 penduduk')
    fireEvent.click(screen.getByRole('button', { name: /Ya, pindahkan 3 jiwa/ }))
    const dikirim = mutateMock.mock.calls[0][0] as { id: string; rtBaru: string }[]
    expect(dikirim.map((i) => [i.id, i.rtBaru])).toEqual([['1', '012'], ['2', '012'], ['3', '012']])
  })

  it('sebagian: hanya keluarga yang dicentang; RW tujuan saja', () => {
    render(<PemekaranModal onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText(/Pilih keluarga tertentu/))
    const daftar = screen.getByRole('group', { name: 'Daftar keluarga' })
    fireEvent.click(within(daftar).getByText('BUDI').closest('label')!.querySelector('input')!)
    fireEvent.change(screen.getByLabelText('RW tujuan'), { target: { value: '9' } })
    expect(screen.getByTestId('ringkasan-pemekaran').textContent).toContain('2 jiwa')
    fireEvent.click(screen.getByRole('button', { name: /Lanjut \(2 jiwa\)/ }))
    fireEvent.click(screen.getByRole('button', { name: /Ya, pindahkan 2 jiwa/ }))
    expect((mutateMock.mock.calls[0][0] as { id: string }[]).map((i) => i.id)).toEqual(['1', '2'])
  })

  it('tanpa tujuan, tombol Lanjut nonaktif dan ada pesan galat', () => {
    render(<PemekaranModal onClose={() => {}} />)
    expect((screen.getByRole('button', { name: /Lanjut/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('ringkasan-pemekaran').textContent).toContain('Isi RT tujuan')
  })
})
