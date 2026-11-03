import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: () => {} }) }))
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({ matches: q.includes('min-width'), media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
})

import { CetakKKModal } from '@/components/penduduk/CetakKKModal'
import type { Penduduk } from '@/types'

const WILAYAH = { desa: 'Karang Sengon', kecamatan: 'Klabang', kabupaten: 'Bondowoso', provinsi: 'Jawa Timur', kode_pos: '68282', nama_kades: 'Sutrisno' } as never
function p(o: Partial<Penduduk>): Penduduk {
  return {
    id: 'x', nama_lengkap: 'Budi', nik: '3511140109480001', no_kk: '3511030000001826', jenis_kelamin: 'Laki-laki', agama: 'Islam',
    hubungan_keluarga: 'Kepala Keluarga', nama_ayah: '', nama_ibu: '', pendidikan: 'SMA/Sederajat', pekerjaan: 'Petani/Pekebun',
    rt: '003', rw: '001', status: 'aktif', status_perkawinan: 'Kawin', tanggal_lahir: '1985-04-10', tempat_lahir: 'JEMBER',
    alamat: 'KARANG SENGON', golongan_darah: '', ...o,
  } as Penduduk
}

describe('Cetak KK — peringatan kelengkapan data sebelum cetak', () => {
  it('KK lengkap: tidak ada peringatan (golongan darah, ayah, ibu kosong dianggap opsional)', () => {
    render(<CetakKKModal noKk="3511030000001826" anggota={[p({}), p({ nik: '3511140109480002', nama_lengkap: 'Siti', hubungan_keluarga: 'Istri' })]} wilayah={WILAYAH} onClose={() => {}} />)
    expect(screen.queryByText('Data KK belum lengkap.')).toBeNull()
  })

  it('kolom wajib kosong, tanpa Kepala Keluarga, dan Kepala Keluarga ganda dilaporkan', () => {
    const { unmount } = render(<CetakKKModal noKk="3511030000001826" anggota={[p({ hubungan_keluarga: 'Istri', pendidikan: '', agama: '' as Penduduk['agama'] })]} wilayah={WILAYAH} onClose={() => {}} />)
    expect(screen.getByText('Data KK belum lengkap.')).toBeTruthy()
    expect(screen.getByText('Belum ada Kepala Keluarga di KK ini')).toBeTruthy()
    expect(screen.getByText(/Budi: Agama, Pendidikan belum diisi/)).toBeTruthy()
    unmount()
    render(<CetakKKModal noKk="3511030000001826" anggota={[p({}), p({ nik: '3511140109480002', nama_lengkap: 'Ganda' })]} wilayah={WILAYAH} onClose={() => {}} />)
    expect(screen.getByText('Ada 2 Kepala Keluarga (seharusnya satu)')).toBeTruthy()
  })
})
