import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppStore } from '@/store/appStore'
import { render, screen, fireEvent } from '@testing-library/react'

const toastMock = vi.fn()
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: toastMock }) }))

// Simulasi mutasi: hasilnya diatur per tes lewat `hasilMutasi`.
let hasilMutasi: 'sukses' | 'gagal' = 'gagal'
const mutateMock = vi.fn((_data: unknown, opsi?: { onSuccess?: () => void; onError?: (e: unknown) => void }) => {
  if (hasilMutasi === 'sukses') opsi?.onSuccess?.()
  else opsi?.onError?.(new Error('gagal'))
})

const mutateMasukMock = vi.fn()
vi.mock('@/hooks/useMutasi', () => ({
  useAddMutasiKeluar: () => ({ mutate: mutateMock, isPending: false }),
  useAddMutasiMasuk: () => ({ mutate: mutateMasukMock, isPending: false }),
  useAddMutasiMasukBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
// Daftar penduduk yang "dimuat" hook; diatur per tes
let daftarPenduduk: unknown[] = []
vi.mock('@/hooks/usePenduduk', () => ({
  useCatatPindahKeluarKeluarga: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePendudukList: () => ({ data: daftarPenduduk, isLoading: false }),
}))

import { MutasiKeluarForm, MutasiMasukForm } from '@/components/mutasi/MutasiForm'

function isiFormValid() {
  fireEvent.change(document.getElementById('mk-nama') as HTMLInputElement, { target: { value: 'Uji Pindah' } })
  fireEvent.change(document.getElementById('mk-nik') as HTMLInputElement, { target: { value: '3511140109480099' } })
  fireEvent.change(document.getElementById('mk-kk') as HTMLInputElement, { target: { value: '3511030000001826' } })
  fireEvent.change(document.getElementById('mk-tujuan') as HTMLInputElement, { target: { value: 'Malang' } })
  fireEvent.change(document.getElementById('mk-tanggal') as HTMLInputElement, { target: { value: '2026-10-14' } })
}

beforeEach(() => {
  // Alamat bawaan form = nama desa dari Pengaturan → Informasi wilayah (store); tidak lagi tertanam di kode
  useAppStore.setState({ wilayah: { desa: 'Karang Sengon', kecamatan: 'Klabang', kabupaten: 'Bondowoso', provinsi: 'Jawa Timur', tahun: '2026' } })
  toastMock.mockClear()
  mutateMock.mockClear()
  mutateMasukMock.mockClear()
  daftarPenduduk = []
})

describe('MutasiKeluarForm — penanganan hasil simpan (perorangan)', () => {
  it('GAGAL → toast galat "Gagal mencatat pindah keluar"; form tidak ditutup (onSuccess tidak dipanggil)', () => {
    hasilMutasi = 'gagal'
    const onSuccess = vi.fn()
    render(<MutasiKeluarForm onSuccess={onSuccess} onCancel={vi.fn()} />)
    isiFormValid()
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pindah keluar' }))
    expect(mutateMock).toHaveBeenCalledTimes(1)
    expect(toastMock).toHaveBeenCalledWith('Gagal mencatat pindah keluar', 'error')
    expect(onSuccess).not.toHaveBeenCalled()
    // isian pengguna tidak hilang
    expect((document.getElementById('mk-tujuan') as HTMLInputElement).value).toBe('Malang')
  })

  it('BERHASIL → toast sukses lama dan onSuccess dipanggil (perilaku yang sudah benar tidak berubah)', () => {
    hasilMutasi = 'sukses'
    const onSuccess = vi.fn()
    render(<MutasiKeluarForm onSuccess={onSuccess} onCancel={vi.fn()} />)
    isiFormValid()
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pindah keluar' }))
    expect(toastMock).toHaveBeenCalledWith('Pindah keluar berhasil dicatat', 'success')
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(toastMock).not.toHaveBeenCalledWith(expect.stringContaining('Gagal'), 'error')
  })

  it('validasi gagal → tidak memanggil simpan dan tidak ada toast galat', () => {
    hasilMutasi = 'gagal'
    render(<MutasiKeluarForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pindah keluar' }))
    expect(mutateMock).not.toHaveBeenCalled()
    expect(toastMock).not.toHaveBeenCalled()
  })
})

describe('MutasiMasukForm — isian Golongan darah (opsional)', () => {
  function isiMasukValid() {
    const set = (id: string, v: string) => fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value: v } })
    set('pm-nama', 'Uji Masuk'); set('pm-nik', '3511140109480098'); set('pm-kk', '3511030000001826')
    set('pm-asal', 'Jember'); set('pm-tempat', 'Jember'); set('pm-tgllahir', '1990-05-05'); set('pm-tanggal', '2026-10-14')
    // pilihan yang tercetak di KK wajib dipilih (tanpa nilai bawaan)
    set('pm-jk', 'Laki-laki'); set('pm-agama', 'Islam'); set('pm-hub', 'Kepala Keluarga'); set('pm-kawin', 'Kawin')
    set('pm-pend', 'SMA/Sederajat'); set('pm-pek', 'Petani/Pekebun')
  }

  it('golongan darah yang dipilih ikut tersimpan', () => {
    render(<MutasiMasukForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    isiMasukValid()
    fireEvent.change(document.getElementById('pm-goldarah') as HTMLSelectElement, { target: { value: 'AB' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pindah masuk' }))
    expect(mutateMasukMock).toHaveBeenCalledTimes(1)
    expect(mutateMasukMock.mock.calls[0][0]).toMatchObject({ golongan_darah: 'AB' })
  })

  it('tidak dipilih → tetap valid dan tersimpan kosong (opsional)', () => {
    render(<MutasiMasukForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    isiMasukValid()
    fireEvent.click(screen.getByRole('button', { name: 'Simpan pindah masuk' }))
    expect(mutateMasukMock).toHaveBeenCalledTimes(1)
    expect(mutateMasukMock.mock.calls[0][0]).toMatchObject({ golongan_darah: '' })
  })

  it('pilihan mencakup A, B, AB, O dan "Belum diisi"', () => {
    render(<MutasiMasukForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    const opsi = Array.from((document.getElementById('pm-goldarah') as HTMLSelectElement).options).map((o) => o.textContent)
    expect(opsi).toEqual(['Belum diisi', 'A', 'B', 'AB', 'O'])
  })
})

describe('MutasiKeluarForm (keluarga) — galat isian No. KK saat tak ada anggota aktif', () => {
  const PESAN = 'Tidak ada anggota aktif ditemukan untuk No. KK ini'
  const KK = '3511030000001826'

  function pilihKeluarga() {
    fireEvent.click(screen.getByRole('radio', { name: /1 Keluarga/ }))
    fireEvent.change(document.getElementById('mk-kk') as HTMLInputElement, { target: { value: KK } })
  }

  it('KK 16 digit tanpa anggota aktif → pesan sebagai galat isian, tanpa pratinjau netral, Simpan nonaktif', () => {
    daftarPenduduk = []
    render(<MutasiKeluarForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    pilihKeluarga()
    expect(screen.getByText(PESAN)).toBeTruthy()
    expect(screen.queryByText(/anggota KK aktif akan dicatat pindah/)).toBeNull()
    expect(screen.queryByText('Tidak ada anggota aktif untuk No. KK ini.')).toBeNull()
    expect((screen.getByRole('button', { name: 'Simpan pindah keluar' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('KK punya anggota aktif → pratinjau anggota tampil, tanpa galat, Simpan aktif', () => {
    daftarPenduduk = [{ id: 'a', nama_lengkap: 'Budi', no_kk: KK, status: 'aktif', hubungan_keluarga: 'Kepala Keluarga' }]
    fireEvent.change(document.body, {})
    render(<MutasiKeluarForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    pilihKeluarga()
    fireEvent.change(document.getElementById('mk-tujuan') as HTMLInputElement, { target: { value: 'Malang' } })
    expect(screen.getByText(/1 anggota KK aktif akan dicatat pindah/)).toBeTruthy()
    expect(screen.queryByText(PESAN)).toBeNull()
    expect((screen.getByRole('button', { name: 'Simpan pindah keluar' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('KK belum 16 digit → tidak ada galat "anggota" (belum waktunya)', () => {
    daftarPenduduk = []
    render(<MutasiKeluarForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('radio', { name: /1 Keluarga/ }))
    fireEvent.change(document.getElementById('mk-kk') as HTMLInputElement, { target: { value: '35110300' } })
    expect(screen.queryByText(PESAN)).toBeNull()
  })
})

describe('alamat bawaan mengikuti nama desa di Pengaturan', () => {
  it('desa lain → alamat bawaan form pindah masuk memakai nama desa itu (bukan nama tertanam)', async () => {
    useAppStore.setState({ wilayah: { desa: 'Sumber Wringin', kecamatan: 'Sukowono', kabupaten: 'Jember', provinsi: 'Jawa Timur', tahun: '2026' } })
    const { emptyAnggotaForm } = await import('@/components/mutasi/MutasiForm')
    expect(emptyAnggotaForm('2026-11-03').alamat).toBe('SUMBER WRINGIN')
  })
  it('nama desa belum diisi → alamat bawaan kosong (diisi petugas)', async () => {
    useAppStore.setState({ wilayah: { desa: '', kecamatan: '', kabupaten: '', provinsi: '', tahun: '2026' } })
    const { emptyAnggotaForm } = await import('@/components/mutasi/MutasiForm')
    expect(emptyAnggotaForm('2026-11-03').alamat).toBe('')
  })
})
