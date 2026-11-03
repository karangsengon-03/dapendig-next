import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup, waitFor } from '@testing-library/react'

vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/layout/useIsDesktop', () => ({ useIsDesktop: () => true }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('') }))
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ isAdmin: () => true, isOperator: () => true }) }))
const toastMock = vi.fn()
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: toastMock }) }))

let lahir: unknown[] = []
const editLahirMock = vi.fn()
const bias = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })
vi.mock('@/hooks/useVital', () => ({
  useLahir: () => ({ data: lahir, isLoading: false }),
  useMeninggal: () => ({ data: [], isLoading: false }),
  useDeleteLahir: () => bias(),
  useDeleteMeninggal: () => bias(),
  useRollbackMeninggal: () => bias(),
  useEditLahir: () => ({ mutateAsync: editLahirMock, isPending: false }),
  useEditMeninggal: () => bias(),
  useAddLahir: () => bias(),
  useAddMeninggal: () => bias(),
}))
vi.mock('@/hooks/usePenduduk', () => ({
  usePendudukDetail: () => ({ data: undefined, isLoading: false }),
  usePendudukList: () => ({ data: [], isLoading: false }),
}))

// jsdom tidak punya matchMedia; dialog memakainya untuk memilih lembar (HP) atau modal (desktop)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({
    matches: q.includes('min-width'), media: q, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }),
})

import VitalPage from '@/app/vital/page'
import { GalatTolak } from '@/lib/galat-tolak'
import { LahirForm } from '@/components/vital/VitalForm'

const REKAMAN = {
  id: 'l1', nama_lengkap: 'Muhammad Fajar', nik: '3511142610260001', no_kk: '3511030000001826',
  jenis_kelamin: 'Laki-laki', agama: 'Islam', hubungan_keluarga: 'Anak', nama_ayah: 'Budi Santoso', nama_ibu: 'Siti Aminah',
  rt: '003', rw: '001', status: 'aktif', status_perkawinan: 'Belum Kawin', tanggal_lahir: '2026-10-14',
  tempat_lahir: 'BONDOWOSO', pendidikan: 'PAUD', pekerjaan: 'Tidak/Belum Bekerja', alamat: 'KARANG SENGON',
}

function labelIsian(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('label')).map((l) => {
    const salin = l.cloneNode(true) as HTMLElement
    salin.querySelectorAll('.req, .opt').forEach((e) => e.remove())
    return (salin.textContent ?? '').trim()
  }).filter(Boolean)
}
function bukaEdit() {
  fireEvent.click(document.querySelector('tbody tr') as HTMLElement)
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Edit/ }))
  return screen.getByRole('dialog')
}
const nilai = (id: string) => (document.getElementById(id) as HTMLInputElement).value

beforeEach(() => {
  toastMock.mockClear()
  editLahirMock.mockReset()
  editLahirMock.mockResolvedValue(undefined)
  lahir = [{ ...REKAMAN }]
})

describe('Kelahiran — Detail menampilkan seluruh isian catatan', () => {
  it('semua isian form Tambah ikut tampil di Detail', () => {
    render(<VitalPage />)
    fireEvent.click(document.querySelector('tbody tr') as HTMLElement)
    const d = within(screen.getByRole('dialog'))
    for (const label of [
      'Nama bayi', 'NIK', 'No. KK', 'Jenis kelamin', 'Tanggal lahir', 'Tempat lahir', 'Agama', 'Hubungan keluarga',
      'Nama ayah', 'Nama ibu', 'RT / RW', 'Alamat', 'Pendidikan', 'Pekerjaan',
    ]) expect(d.getByText(label), `label Detail "${label}"`).toBeTruthy()
    for (const v of ['Laki-laki', 'BONDOWOSO', 'Islam', 'Anak', 'Budi Santoso', 'Siti Aminah', 'PAUD'])
      expect(d.getAllByText(v).length, `nilai Detail "${v}"`).toBeGreaterThan(0)
  })
})

describe('Kelahiran — modal Edit sama dengan form Tambah', () => {
  it('daftar isian (label dan urutan) sama persis dengan form Tambah', () => {
    const { container } = render(<LahirForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    const tambah = labelIsian(container)
    cleanup()
    render(<VitalPage />)
    const edit = labelIsian(bukaEdit())
    expect(tambah.length).toBeGreaterThanOrEqual(15)
    expect(edit).toEqual(tambah)
  })

  it('terisi dari catatan, termasuk jenis kelamin, agama, dan hubungan keluarga yang dulu tak ada di editor', () => {
    render(<VitalPage />)
    bukaEdit()
    expect(nilai('lh-nama')).toBe('Muhammad Fajar')
    expect(nilai('lh-nik')).toBe('3511142610260001')
    expect(nilai('lh-kk')).toBe('3511030000001826')
    expect(nilai('lh-jk')).toBe('Laki-laki')
    expect(nilai('lh-tempat')).toBe('BONDOWOSO')
    expect(nilai('lh-tgl')).toBe('2026-10-14')
    expect(nilai('lh-agama')).toBe('Islam')
    expect(nilai('lh-hub')).toBe('Anak')
    expect(nilai('lh-ayah')).toBe('Budi Santoso')
    expect(nilai('lh-ibu')).toBe('Siti Aminah')
    expect(nilai('lh-rt')).toBe('003')
    expect(nilai('lh-pend')).toBe('PAUD')
  })

  it('mengubah jenis kelamin dan agama tersimpan lengkap', async () => {
    render(<VitalPage />)
    bukaEdit()
    fireEvent.change(document.getElementById('lh-jk') as HTMLSelectElement, { target: { value: 'Perempuan' } })
    fireEvent.change(document.getElementById('lh-agama') as HTMLSelectElement, { target: { value: 'Kristen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(editLahirMock).toHaveBeenCalledTimes(1))
    const { id, data } = editLahirMock.mock.calls[0][0]
    expect(id).toBe('l1')
    expect(data).toMatchObject({
      nama_lengkap: 'Muhammad Fajar', nik: '3511142610260001', no_kk: '3511030000001826', jenis_kelamin: 'Perempuan',
      agama: 'Kristen', hubungan_keluarga: 'Anak', nama_ayah: 'Budi Santoso', nama_ibu: 'Siti Aminah', rt: '003', rw: '001',
      tanggal_lahir: '2026-10-14', tempat_lahir: 'BONDOWOSO', pendidikan: 'PAUD', pekerjaan: 'Tidak/Belum Bekerja', alamat: 'KARANG SENGON',
    })
    expect(toastMock).toHaveBeenCalledWith('Data kelahiran diperbarui', 'success')
  })

  it('validasi sama dengan form Tambah: nama ayah kosong ditolak, tidak menyimpan', () => {
    render(<VitalPage />)
    bukaEdit()
    fireEvent.change(document.getElementById('lh-ayah') as HTMLInputElement, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(editLahirMock).not.toHaveBeenCalled()
    expect(within(screen.getByRole('dialog')).getAllByRole('alert').length).toBeGreaterThanOrEqual(1)
  })

  it('NIK dan No. KK: huruf dibuang, nomor yang ditempel dengan spasi/strip tetap 16 digit utuh', () => {
    render(<VitalPage />)
    bukaEdit()
    const nik = document.getElementById('lh-nik') as HTMLInputElement
    fireEvent.change(nik, { target: { value: '3511 4226 1026 0001' } })
    expect(nik.value).toBe('3511422610260001')
    fireEvent.change(nik, { target: { value: '35x11' } })
    expect(nik.value).toBe('3511')
  })

  it('catatan hasil impor tanpa sebagian isian tetap terbuka; jenis kelamin dan agama yang kosong harus dipilih (bukan bawaan)', () => {
    lahir = [{ id: 'l2', nama_lengkap: 'Bayi Lama', nik: '3511142610260002', no_kk: '3511030000001826', tanggal_lahir: '2026-01-01', rt: '1', rw: '1', status: 'aktif' }]
    render(<VitalPage />)
    bukaEdit()
    expect(nilai('lh-jk')).toBe('')
    expect(nilai('lh-agama')).toBe('')
    expect(nilai('lh-hub')).toBe('')
    expect(nilai('lh-rt')).toBe('001')
  })

  describe('sinkron ke menu Penduduk', () => {
    const simpanTanpaUbah = async () => {
      render(<VitalPage />)
      bukaEdit()
      fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
      await waitFor(() => expect(editLahirMock).toHaveBeenCalledTimes(1))
    }
    it('catatan di modal memberi tahu data penduduk ikut diperbarui (bukan lagi "tidak ikut berubah")', () => {
      render(<VitalPage />)
      const dialog = bukaEdit()
      expect(dialog.textContent).toContain('juga memperbarui data penduduk')
      expect(dialog.textContent).not.toContain('tidak ikut berubah')
    })
    it('penduduk ikut berubah → toast menyebut menu Penduduk', async () => {
      editLahirMock.mockResolvedValue({ pendudukDiperbarui: true, kolom: ['agama'] })
      await simpanTanpaUbah()
      await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Data kelahiran diperbarui, termasuk data di menu Penduduk.', 'success'))
    })
    it('penduduk tidak ditemukan → toast peringatan', async () => {
      editLahirMock.mockResolvedValue({ pendudukDiperbarui: false, kolom: [] })
      await simpanTanpaUbah()
      await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.stringContaining('tidak ditemukan'), 'warning'))
    })
    it('NIK bentrok dengan penduduk lain (GalatTolak) → pesan alasan tampil, modal tetap terbuka', async () => {
      editLahirMock.mockRejectedValue(new GalatTolak('NIK 3511 sudah terdaftar atas nama Siti.'))
      await simpanTanpaUbah()
      await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Gagal menyimpan: NIK 3511 sudah terdaftar atas nama Siti.', 'error'))
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
  })
})
