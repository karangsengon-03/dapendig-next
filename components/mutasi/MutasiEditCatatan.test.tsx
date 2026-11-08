import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buangSemuaDraf } from '@/lib/draf-form'
import { render, screen, fireEvent, within, cleanup, waitFor } from '@testing-library/react'

vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/layout/useIsDesktop', () => ({ useIsDesktop: () => true }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('') }))
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ isAdmin: () => true, isOperator: () => true }) }))
const toastMock = vi.fn()
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: toastMock }) }))

let masuk: unknown[] = []
const editMasukMock = vi.fn()
const bias = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })
vi.mock('@/hooks/useMutasi', () => ({
  useMutasiKeluar: () => ({ data: [], isLoading: false }),
  useMutasiMasuk: () => ({ data: masuk, isLoading: false }),
  useDeleteMutasiKeluar: () => bias(),
  useDeleteMutasiMasuk: () => bias(),
  useRollbackMutasiKeluar: () => bias(),
  useEditMutasiKeluar: () => bias(),
  useEditMutasiMasuk: () => ({ mutateAsync: editMasukMock, isPending: false }),
  useAddMutasiKeluar: () => bias(),
  useAddMutasiMasuk: () => bias(),
  useAddMutasiMasukBatch: () => bias(),
}))
vi.mock('@/hooks/usePenduduk', () => ({
  usePendudukDetail: () => ({ data: undefined, isLoading: false }),
  usePendudukList: () => ({ data: [], isLoading: false }),
  useCatatPindahKeluarKeluarga: () => bias(),
}))


// jsdom tidak punya matchMedia; dialog memakainya untuk memilih lembar (HP) atau modal (desktop)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({
    matches: q.includes('min-width'), media: q, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }),
})

import MutasiPage from '@/app/mutasi/page'
import { MutasiMasukForm } from '@/components/mutasi/MutasiForm'
import { GalatTolak } from '@/lib/galat-tolak'

const REKAMAN = {
  id: 'm1', nama_lengkap: 'Budi Santoso', nik: '3511140109480001', no_kk: '3511030000001826',
  jenis_kelamin: 'Laki-laki', agama: 'Islam', asal_daerah: 'Kab. Jember', hubungan_keluarga: 'Kepala Keluarga',
  nama_ayah: 'Slamet', nama_ibu: 'Sumiati', pekerjaan: 'Petani/Pekebun', pendidikan: 'SMA/Sederajat',
  rt: '003', rw: '001', status: 'aktif', status_perkawinan: 'Kawin', tanggal: '2026-09-18',
  tanggal_lahir: '1985-04-10', tempat_lahir: 'JEMBER', golongan_darah: 'B', alamat: 'KARANG SENGON',
}

/** Teks label isian (tanpa tanda * dan "(opsional)"), urut seperti tampil. */
function labelIsian(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('label')).map((l) => {
    const salin = l.cloneNode(true) as HTMLElement
    salin.querySelectorAll('.req, .opt').forEach((e) => e.remove())
    return (salin.textContent ?? '').trim()
  }).filter(Boolean)
}
const bukaTabMasuk = () => fireEvent.click(screen.getByRole('button', { name: /Pindah masuk/ }))
function bukaEdit() {
  bukaTabMasuk()
  fireEvent.click(document.querySelector('tbody tr') as HTMLElement)
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Edit/ }))
  return screen.getByRole('dialog')
}

beforeEach(() => {
  toastMock.mockClear()
  editMasukMock.mockReset()
  editMasukMock.mockResolvedValue(undefined)
  masuk = [{ ...REKAMAN }]
})

describe('Pindah masuk — Detail menampilkan seluruh isian catatan', () => {
  it('semua isian form Tambah ikut tampil di Detail', () => {
    render(<MutasiPage />)
    bukaTabMasuk()
    fireEvent.click(document.querySelector('tbody tr') as HTMLElement)
    const d = within(screen.getByRole('dialog'))
    for (const label of [
      'Nama', 'NIK', 'No. KK', 'Tanggal masuk', 'Asal daerah', 'Jenis kelamin', 'Tempat lahir', 'Tanggal lahir', 'Agama',
      'Hubungan keluarga', 'Status perkawinan', 'Pendidikan', 'Pekerjaan', 'Nama ayah', 'Nama ibu', 'Golongan darah', 'RT / RW', 'Alamat',
    ]) expect(d.getByText(label), `label Detail "${label}"`).toBeTruthy()
    for (const nilai of ['Laki-laki', 'JEMBER', 'Islam', 'Kepala Keluarga', 'Kawin', 'SMA/Sederajat', 'Petani/Pekebun', 'Slamet', 'Sumiati', 'B'])
      expect(d.getAllByText(nilai).length, `nilai Detail "${nilai}"`).toBeGreaterThan(0)
  })
})

describe('Pindah masuk — modal Edit sama dengan form Tambah', () => {
  it('daftar isian (label dan urutan) sama persis dengan form Tambah', () => {
    const { container } = render(<MutasiMasukForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    const tambah = labelIsian(container)
    cleanup()
    buangSemuaDraf() // form Tambah di atas dianggap sudah ditutup; draf tidak boleh membuka form di halaman
    render(<MutasiPage />)
    const dialog = bukaEdit()
    const edit = labelIsian(dialog)
    expect(tambah.length).toBeGreaterThanOrEqual(19)
    expect(edit).toEqual(tambah)
  })

  it('terisi dari catatan (bukan kosong) untuk semua isian', () => {
    render(<MutasiPage />)
    bukaEdit()
    const nilai = (id: string) => (document.getElementById(id) as HTMLInputElement).value
    expect(nilai('pm-nama')).toBe('Budi Santoso')
    expect(nilai('pm-nik')).toBe('3511140109480001')
    expect(nilai('pm-kk')).toBe('3511030000001826')
    expect(nilai('pm-asal')).toBe('Kab. Jember')
    expect(nilai('pm-tempat')).toBe('JEMBER')
    expect(nilai('pm-tgllahir')).toBe('1985-04-10')
    expect(nilai('pm-agama')).toBe('Islam')
    expect(nilai('pm-hub')).toBe('Kepala Keluarga')
    expect(nilai('pm-kawin')).toBe('Kawin')
    expect(nilai('pm-pend')).toBe('SMA/Sederajat')
    expect(nilai('pm-pek')).toBe('Petani/Pekebun')
    expect(nilai('pm-ayah')).toBe('Slamet')
    expect(nilai('pm-ibu')).toBe('Sumiati')
    expect(nilai('pm-goldarah')).toBe('B')
    expect(nilai('pm-rt')).toBe('003')
    expect(nilai('pm-alamat')).toBe('KARANG SENGON')
  })

  it('mengubah isian yang tadinya tak ada di editor (agama, golongan darah) tersimpan lengkap', async () => {
    render(<MutasiPage />)
    bukaEdit()
    fireEvent.change(document.getElementById('pm-agama') as HTMLSelectElement, { target: { value: 'Kristen' } })
    fireEvent.change(document.getElementById('pm-goldarah') as HTMLSelectElement, { target: { value: 'O' } })
    fireEvent.change(document.getElementById('pm-ibu') as HTMLInputElement, { target: { value: 'Sumiati Ningsih' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(editMasukMock).toHaveBeenCalledTimes(1))
    const { id, data } = editMasukMock.mock.calls[0][0]
    expect(id).toBe('m1')
    expect(data).toMatchObject({
      nama_lengkap: 'Budi Santoso', nik: '3511140109480001', no_kk: '3511030000001826', asal_daerah: 'Kab. Jember',
      jenis_kelamin: 'Laki-laki', agama: 'Kristen', hubungan_keluarga: 'Kepala Keluarga', status_perkawinan: 'Kawin',
      pendidikan: 'SMA/Sederajat', pekerjaan: 'Petani/Pekebun', nama_ayah: 'Slamet', nama_ibu: 'Sumiati Ningsih',
      golongan_darah: 'O', rt: '003', rw: '001', tanggal: '2026-09-18', tanggal_lahir: '1985-04-10',
      tempat_lahir: 'JEMBER', alamat: 'KARANG SENGON', status: 'aktif',
    })
    expect(toastMock).toHaveBeenCalledWith('Data diperbarui', 'success')
  })

  it('validasi sama dengan form Tambah: nama kosong dan tanggal lahir kosong ditolak, tidak menyimpan', async () => {
    render(<MutasiPage />)
    bukaEdit()
    fireEvent.change(document.getElementById('pm-nama') as HTMLInputElement, { target: { value: '   ' } })
    fireEvent.change(document.getElementById('pm-tgllahir') as HTMLInputElement, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(editMasukMock).not.toHaveBeenCalled()
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getAllByRole('alert').length).toBeGreaterThanOrEqual(2)
  })

  it('NIK dan No. KK: huruf dibuang, nomor yang ditempel dengan spasi/strip tetap 16 digit utuh', () => {
    render(<MutasiPage />)
    bukaEdit()
    const nik = document.getElementById('pm-nik') as HTMLInputElement
    const kk = document.getElementById('pm-kk') as HTMLInputElement
    fireEvent.change(nik, { target: { value: '3511 0300 0000 1826' } })
    expect(nik.value).toBe('3511030000001826')
    fireEvent.change(kk, { target: { value: '3511-0300-0000-1826' } })
    expect(kk.value).toBe('3511030000001826')
    fireEvent.change(nik, { target: { value: '35ab11' } })
    expect(nik.value).toBe('3511')
  })

  it('catatan lama dengan RT/RW tanpa nol di depan ("3", "1") tetap terpilih di pilihan RT/RW', () => {
    masuk = [{ ...REKAMAN, rt: '3', rw: '1' }]
    render(<MutasiPage />)
    bukaEdit()
    expect((document.getElementById('pm-rt') as HTMLSelectElement).value).toBe('003')
    expect((document.getElementById('pm-rw') as HTMLSelectElement).value).toBe('001')
  })

  it('catatan hasil impor tanpa sebagian isian tetap terbuka; pilihan KK yang kosong dibiarkan kosong (harus dipilih, bukan bawaan)', () => {
    masuk = [{ id: 'm2', nama_lengkap: 'Warga Lama', nik: '3511140109480002', no_kk: '3511030000001826', asal_daerah: 'X', tanggal: '2026-01-01', rt: '001', rw: '001', status: 'aktif' }]
    render(<MutasiPage />)
    bukaEdit()
    expect((document.getElementById('pm-agama') as HTMLSelectElement).value).toBe('')
    expect((document.getElementById('pm-hub') as HTMLSelectElement).value).toBe('')
    expect((document.getElementById('pm-nama') as HTMLInputElement).value).toBe('Warga Lama')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(editMasukMock).not.toHaveBeenCalled()
    expect(within(screen.getByRole('dialog')).getByText('Agama wajib dipilih')).toBeTruthy()
  })

  describe('sinkron ke menu Penduduk', () => {
    const simpanTanpaUbah = async () => {
      render(<MutasiPage />)
      bukaEdit()
      fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
      await waitFor(() => expect(editMasukMock).toHaveBeenCalledTimes(1))
    }
    it('catatan di modal memberi tahu data penduduk ikut diperbarui (bukan lagi "tidak ikut berubah")', () => {
      render(<MutasiPage />)
      const dialog = bukaEdit()
      expect(dialog.textContent).toContain('juga memperbarui data penduduk')
      expect(dialog.textContent).not.toContain('tidak ikut berubah')
    })
    it('penduduk ikut berubah → toast menyebut menu Penduduk', async () => {
      editMasukMock.mockResolvedValue({ pendudukDiperbarui: true, kolom: ['agama'] })
      await simpanTanpaUbah()
      await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Data diperbarui, termasuk data di menu Penduduk.', 'success'))
    })
    it('penduduk tidak ditemukan → toast peringatan, modal ditutup (catatan tetap tersimpan)', async () => {
      editMasukMock.mockResolvedValue({ pendudukDiperbarui: false, kolom: [] })
      await simpanTanpaUbah()
      await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.stringContaining('tidak ditemukan'), 'warning'))
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    it('NIK bentrok dengan penduduk lain (GalatTolak) → pesan alasan tampil, modal tetap terbuka', async () => {
      editMasukMock.mockRejectedValue(new GalatTolak('NIK 3511 sudah terdaftar atas nama Siti.'))
      await simpanTanpaUbah()
      await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Gagal menyimpan: NIK 3511 sudah terdaftar atas nama Siti.', 'error'))
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
    it('galat lain → pesan umum', async () => {
      editMasukMock.mockRejectedValue(new Error('network'))
      await simpanTanpaUbah()
      await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Gagal menyimpan', 'error'))
    })
  })
})
