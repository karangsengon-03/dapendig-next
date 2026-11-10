import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { GalatTolak } from '@/lib/galat-tolak'
import { DUSUN_BAWAAN, RW_BAWAAN, type DusunItem } from '@/lib/dusun'
import { useAppStore } from '@/store/appStore'

const toastMock = vi.fn()
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: toastMock }) }))

let dataTersimpan: { dusun: DusunItem[]; rw: string[]; tersimpan: boolean } | undefined = { dusun: DUSUN_BAWAAN, rw: RW_BAWAAN, tersimpan: false }
const simpanMock = vi.fn()
vi.mock('@/hooks/usePengaturan', () => ({
  useDusunConfig: () => ({ data: dataTersimpan, isLoading: false }),
  useSaveDusun: () => ({ mutate: simpanMock, isPending: false }),
}))

import { DusunRtSection } from './DusunRtSection'

const kartu = () => screen.getAllByTestId('dusun-kartu')
const klikSimpan = () => fireEvent.click(screen.getByRole('button', { name: /Simpan/ }))

beforeEach(() => {
  toastMock.mockClear(); simpanMock.mockReset()
  useAppStore.setState({ rtPakai: {}, rwPakai: {} })
  dataTersimpan = { dusun: DUSUN_BAWAAN, rw: RW_BAWAAN, tersimpan: false }
})

describe('DusunRtSection', () => {
  it('menampilkan dusun dan RT dari pengaturan (RT tidak harus berurutan)', () => {
    render(<DusunRtSection />)
    expect(kartu()).toHaveLength(4)
    const pes = within(kartu()[0])
    expect((pes.getByLabelText('Nama dusun') as HTMLInputElement).value).toBe('Pesanggrahan')
    expect(pes.getByText('RT 007')).toBeTruthy()
    expect(within(kartu()[1]).getByText('RT 004')).toBeTruthy()
  })

  it('menambah RT ke dusun lewat tombol, RT jadi 3 digit dan terurut', () => {
    render(<DusunRtSection />)
    const k = within(kartu()[3]) // Blangguan: 010, 011
    fireEvent.change(k.getByLabelText('Tambah RT ke Blangguan'), { target: { value: '12' } })
    fireEvent.click(k.getByRole('button', { name: /Tambah RT/ }))
    expect(k.getByText('RT 012')).toBeTruthy()
    klikSimpan()
    const dikirim = (simpanMock.mock.calls[0][0] as { dusun: DusunItem[] }).dusun
    expect(dikirim[3]).toEqual({ nama: 'Blangguan', rt: ['010', '011', '012'] })
  })

  it('menambah RT dengan tombol Enter', () => {
    render(<DusunRtSection />)
    const k = within(kartu()[2])
    const isian = k.getByLabelText('Tambah RT ke Sumber')
    fireEvent.change(isian, { target: { value: '15' } })
    fireEvent.keyDown(isian, { key: 'Enter' })
    expect(k.getByText('RT 015')).toBeTruthy()
  })

  it('menghapus RT dari dusun', () => {
    render(<DusunRtSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Hapus RT 007 dari Pesanggrahan' }))
    expect(screen.queryByText('RT 007')).toBeNull()
    klikSimpan()
    expect((simpanMock.mock.calls[0][0] as { dusun: DusunItem[] }).dusun[0].rt).toEqual(['001', '002', '003'])
  })

  it('mengubah nama dusun', () => {
    render(<DusunRtSection />)
    fireEvent.change(within(kartu()[0]).getByLabelText('Nama dusun'), { target: { value: 'Krajan' } })
    klikSimpan()
    expect((simpanMock.mock.calls[0][0] as { dusun: DusunItem[] }).dusun[0].nama).toBe('Krajan')
  })

  it('RT yang sudah ada di dusun lain ditolak: galat tampil dan tidak disimpan', () => {
    render(<DusunRtSection />)
    const k = within(kartu()[1]) // Paleran
    fireEvent.change(k.getByLabelText('Tambah RT ke Paleran'), { target: { value: '1' } })
    fireEvent.click(k.getByRole('button', { name: /Tambah RT/ }))
    klikSimpan()
    expect(simpanMock).not.toHaveBeenCalled()
    expect(screen.getByText('RT 001 sudah ada di dusun Pesanggrahan')).toBeTruthy()
    expect(toastMock).toHaveBeenCalledWith('Periksa isian dusun, RT, dan RW dulu', 'error')
  })

  it('nama dusun dikosongkan → galat, tidak disimpan', () => {
    render(<DusunRtSection />)
    fireEvent.change(within(kartu()[0]).getByLabelText('Nama dusun'), { target: { value: '' } })
    klikSimpan()
    expect(simpanMock).not.toHaveBeenCalled()
    expect(screen.getByText('Nama dusun wajib diisi')).toBeTruthy()
  })

  it('menambah dusun baru dengan RT-nya, lalu menyimpan', () => {
    render(<DusunRtSection />)
    fireEvent.click(screen.getByRole('button', { name: /Tambah dusun/ }))
    expect(kartu()).toHaveLength(5)
    const baru = within(kartu()[4])
    fireEvent.change(baru.getByLabelText('Nama dusun'), { target: { value: 'Krajan' } })
    fireEvent.change(baru.getByLabelText('Tambah RT ke Krajan'), { target: { value: '12' } })
    fireEvent.click(baru.getByRole('button', { name: /Tambah RT/ }))
    klikSimpan()
    expect((simpanMock.mock.calls[0][0] as { dusun: DusunItem[] }).dusun[4]).toEqual({ nama: 'Krajan', rt: ['012'] })
  })

  it('menghapus dusun', () => {
    render(<DusunRtSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Hapus dusun Blangguan' }))
    expect(kartu()).toHaveLength(3)
  })

  it('"Pakai bawaan" mengembalikan pemetaan bawaan', () => {
    dataTersimpan = { dusun: [{ nama: 'Lain', rt: ['001'] }], rw: ['001'], tersimpan: true }
    render(<DusunRtSection />)
    expect(kartu()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Pakai bawaan/ }))
    expect(kartu()).toHaveLength(4)
  })

  it('daftar RW tampil; menambah RW (jadi 3 digit, terurut) dan menghapus RW', () => {
    render(<DusunRtSection />)
    const k = within(screen.getByTestId('rw-kartu'))
    expect(k.getAllByText(/^RW 00\d$/)).toHaveLength(5)
    fireEvent.change(k.getByLabelText('Tambah RW'), { target: { value: '6' } })
    fireEvent.click(k.getByRole('button', { name: /Tambah RW/ }))
    expect(k.getByText('RW 006')).toBeTruthy()
    fireEvent.click(k.getByRole('button', { name: 'Hapus RW 005' }))
    expect(k.queryByText('RW 005')).toBeNull()
    klikSimpan()
    expect((simpanMock.mock.calls[0][0] as { rw: string[] }).rw).toEqual(['001', '002', '003', '004', '006'])
  })

  it('RW ditambah dengan Enter; RW ganda diabaikan', () => {
    render(<DusunRtSection />)
    const k = within(screen.getByTestId('rw-kartu'))
    const isian = k.getByLabelText('Tambah RW')
    fireEvent.change(isian, { target: { value: '7' } }); fireEvent.keyDown(isian, { key: 'Enter' })
    fireEvent.change(isian, { target: { value: '001' } }); fireEvent.keyDown(isian, { key: 'Enter' })
    expect(k.getAllByText(/^RW 00\d$/)).toHaveLength(6)
  })

  it('semua RW dihapus → galat "Minimal harus ada satu RW", tidak disimpan', () => {
    render(<DusunRtSection />)
    for (const r of ['001', '002', '003', '004', '005']) fireEvent.click(screen.getByRole('button', { name: `Hapus RW ${r}` }))
    klikSimpan()
    expect(simpanMock).not.toHaveBeenCalled()
    expect(screen.getByText('Minimal harus ada satu RW.')).toBeTruthy()
    expect(toastMock).toHaveBeenCalledWith('Periksa isian dusun, RT, dan RW dulu', 'error')
  })

  it('"Pakai bawaan" juga mengembalikan RW bawaan', () => {
    dataTersimpan = { dusun: DUSUN_BAWAAN, rw: ['001'], tersimpan: true }
    render(<DusunRtSection />)
    expect(within(screen.getByTestId('rw-kartu')).getAllByText(/^RW 00\d$/)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Pakai bawaan/ }))
    expect(within(screen.getByTestId('rw-kartu')).getAllByText(/^RW 00\d$/)).toHaveLength(5)
  })

  it('berhasil menyimpan → toast sukses; gagal karena GalatTolak → pesan alasannya', () => {
    simpanMock.mockImplementationOnce((_d, o) => o.onSuccess())
    render(<DusunRtSection />)
    klikSimpan()
    expect(toastMock).toHaveBeenCalledWith('Dusun, RT, dan RW berhasil disimpan', 'success')
    simpanMock.mockImplementationOnce((_d, o) => o.onError(new GalatTolak('Pengaturan dusun belum valid.')))
    klikSimpan()
    expect(toastMock).toHaveBeenCalledWith('Pengaturan dusun belum valid.', 'error')
  })

  it('RT/RW yang dipakai penduduk dikunci (gembok, jumlah, tanpa tombol hapus); yang tidak dipakai tetap bisa dihapus', () => {
    useAppStore.setState({ rtPakai: { '001': 12 }, rwPakai: { '001': 30 } })
    render(<DusunRtSection />)
    expect(screen.queryByRole('button', { name: 'Hapus RT 001 dari Pesanggrahan' })).toBeNull()
    expect(screen.getByText('RT 001').closest('.dsn-chip')?.className).toContain('kunci')
    expect(screen.getByText('· 12')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hapus RT 002 dari Pesanggrahan' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hapus RW 001' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Hapus RW 002' })).toBeTruthy()
  })

  it('dusun yang berisi RT terkunci tidak bisa dihapus', () => {
    useAppStore.setState({ rtPakai: { '004': 5 }, rwPakai: {} })
    render(<DusunRtSection />)
    expect((screen.getByRole('button', { name: 'Hapus dusun Paleran' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Hapus dusun Sumber' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('RT/RW di data yang belum terdaftar diberi keterangan dan bisa didaftarkan sekaligus (RT 000 dan RT 030 ke "Lain-lain")', () => {
    useAppStore.setState({ rtPakai: { '000': 3, '001': 1, '030': 2 }, rwPakai: { '009': 4 } })
    render(<DusunRtSection />)
    const cat = screen.getByTestId('catatan-belum-terdaftar')
    expect(cat.textContent).toContain('000 (3 jiwa), 030 (2 jiwa)')
    expect(cat.textContent).toContain('009 (4 jiwa)')
    fireEvent.click(screen.getByRole('button', { name: /Daftarkan semua/ }))
    expect(screen.queryByTestId('catatan-belum-terdaftar')).toBeNull()
    expect(kartu()).toHaveLength(5)
    klikSimpan()
    const dikirim = simpanMock.mock.calls[0][0] as { dusun: DusunItem[]; rw: string[] }
    expect(dikirim.dusun[4]).toEqual({ nama: 'Lain-lain', rt: ['000', '030'] })
    expect(dikirim.rw).toContain('009')
  })

  it('tanpa RT/RW di luar daftar tidak ada catatan peringatan', () => {
    useAppStore.setState({ rtPakai: { '001': 1 }, rwPakai: { '001': 1 } })
    render(<DusunRtSection />)
    expect(screen.queryByTestId('catatan-belum-terdaftar')).toBeNull()
    expect(screen.getByTestId('catatan-kunci')).toBeTruthy()
  })
})
