import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const toastMock = vi.fn()
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: toastMock }) }))

// mutate tiruan: hasilnya diatur per tes lewat opsi callback yang dikirim form
type Opsi = { onSuccess?: () => void; onError?: (e: Error) => void }
const mutateMock = vi.fn<(data: unknown, opsi: Opsi) => void>()
vi.mock('@/hooks/useVital', () => ({
  useAddLahir: () => ({ mutate: mutateMock, isPending: false }),
  useAddMeninggal: () => ({ mutate: vi.fn(), isPending: false }),
}))

import { LahirForm } from '@/components/vital/VitalForm'
import { GalatTolak } from '@/lib/galat-tolak'

function isi(id: string, nilai: string) {
  fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value: nilai } })
}
function isiLengkap() {
  isi('lh-nama', 'Muhammad Fajar')
  isi('lh-nik', '3511142610260001')
  isi('lh-kk', '3511030000001826')
  isi('lh-tempat', 'Bondowoso')
  isi('lh-tgl', '2026-10-14')
  isi('lh-ayah', 'Budi Santoso')
  isi('lh-ibu', 'Siti Aminah')
  // jenis kelamin dan agama tercetak di KK: wajib dipilih (tanpa nilai bawaan); pendidikan/pekerjaan bayi sudah terisi
  isi('lh-jk', 'Laki-laki')
  isi('lh-agama', 'Islam')
}
const simpan = () => fireEvent.click(screen.getByRole('button', { name: 'Simpan kelahiran' }))

beforeEach(() => {
  toastMock.mockClear()
  mutateMock.mockReset()
})

describe('LahirForm — hasil simpan', () => {
  it('berhasil → toast sukses dan onSuccess dipanggil', () => {
    mutateMock.mockImplementation((_data, opsi) => opsi.onSuccess?.())
    const onSuccess = vi.fn()
    render(<LahirForm onSuccess={onSuccess} onCancel={vi.fn()} />)
    isiLengkap()
    simpan()
    expect(mutateMock).toHaveBeenCalledTimes(1)
    expect(toastMock).toHaveBeenCalledWith('Kelahiran berhasil dicatat', 'success')
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('NIK sudah terdaftar (GalatTolak) → alasannya tampil di toast, form tetap terbuka', () => {
    const alasan = 'NIK 3511142610260001 sudah terdaftar atas nama Orang Lama (aktif). Data tidak disimpan untuk mencegah menimpa data yang sudah ada.'
    mutateMock.mockImplementation((_data, opsi) => opsi.onError?.(new GalatTolak(alasan)))
    const onSuccess = vi.fn()
    render(<LahirForm onSuccess={onSuccess} onCancel={vi.fn()} />)
    isiLengkap()
    simpan()
    expect(toastMock).toHaveBeenCalledWith(`Gagal mencatat kelahiran: ${alasan}`, 'error')
    expect(onSuccess).not.toHaveBeenCalled()
    expect((document.getElementById('lh-nama') as HTMLInputElement).value).toBe('Muhammad Fajar')
  })

  it('galat lain (mis. jaringan) → pesan umum tanpa membocorkan detail teknis', () => {
    mutateMock.mockImplementation((_data, opsi) => opsi.onError?.(new Error('permission-denied')))
    render(<LahirForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    isiLengkap()
    simpan()
    expect(toastMock).toHaveBeenCalledWith('Gagal mencatat kelahiran', 'error')
  })

  it('isian belum lengkap → tidak menyimpan', () => {
    render(<LahirForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    isi('lh-nama', 'Muhammad Fajar')
    simpan()
    expect(mutateMock).not.toHaveBeenCalled()
  })
})
