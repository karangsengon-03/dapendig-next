import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppStore } from '@/store/appStore'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const toastMock = vi.fn()
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: toastMock }) }))

// Simpan batch: hasilnya diatur per tes; argumen terakhir yang diterima bisa diperiksa.
const batchMock = vi.fn()
vi.mock('@/hooks/useMutasi', () => ({
  useAddMutasiKeluar: () => ({ mutate: vi.fn(), isPending: false }),
  useAddMutasiMasuk: () => ({ mutate: vi.fn(), isPending: false }),
  useAddMutasiMasukBatch: () => ({ mutateAsync: batchMock, isPending: false }),
}))
vi.mock('@/hooks/usePenduduk', () => ({
  useCatatPindahKeluarKeluarga: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePendudukList: () => ({ data: [], isLoading: false }),
}))

import { MutasiMasukForm } from '@/components/mutasi/MutasiForm'

const KK = '3511030000001826'
const NIK_1 = '3511140109480001'
const NIK_2 = '3511140109480002'
const NIK_3 = '3511140109480003'

function isi(id: string, nilai: string) {
  fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value: nilai } })
}
function pilih(id: string, nilai: string) {
  fireEvent.change(document.getElementById(id) as HTMLSelectElement, { target: { value: nilai } })
}
/** Isi satu anggota lengkap (KK, asal, tanggal masuk, RT/RW terbawa dari anggota sebelumnya). */
function isiAnggota(nama: string, nik: string, hubungan: string, opsi: { pertama?: boolean; jk?: string } = {}) {
  isi('pm-nama', nama)
  isi('pm-nik', nik)
  isi('pm-tempat', 'Jember')
  isi('pm-tgllahir', '1990-05-05')
  pilih('pm-hub', hubungan)
  // Pilihan yang tercetak di KK wajib dipilih sadar (tanpa nilai bawaan): jenis kelamin, agama, status, pendidikan, pekerjaan
  pilih('pm-jk', opsi.jk ?? 'Laki-laki')
  pilih('pm-agama', 'Islam')
  pilih('pm-kawin', 'Kawin')
  pilih('pm-pend', 'SMA/Sederajat')
  pilih('pm-pek', 'Petani/Pekebun')
  if (opsi.pertama) {
    isi('pm-kk', KK)
    isi('pm-asal', 'Jember')
  }
}
function tombolSimpanSemua() {
  return screen.getByRole('button', { name: /Simpan Semua/ }) as HTMLButtonElement
}
function tambahAnggota() {
  fireEvent.click(screen.getByRole('button', { name: /Tambah Anggota/ }))
}
function mulaiKeluarga(onSuccess = vi.fn()) {
  render(<MutasiMasukForm onSuccess={onSuccess} onCancel={vi.fn()} />)
  fireEvent.click(screen.getByRole('radio', { name: /1 Keluarga/ }))
  return onSuccess
}
const nikDiPanggilan = () => (batchMock.mock.calls[0][0] as { nik: string }[]).map((a) => a.nik)

beforeEach(() => {
  // Alamat bawaan form = nama desa dari Pengaturan → Informasi wilayah (store); tidak lagi tertanam di kode
  useAppStore.setState({ wilayah: { desa: 'Karang Sengon', kecamatan: 'Klabang', kabupaten: 'Bondowoso', provinsi: 'Jawa Timur', tahun: '2026' } })
  toastMock.mockClear()
  batchMock.mockReset()
  batchMock.mockResolvedValue(undefined)
})

describe('Pindah masuk 1 Keluarga — anggota yang sedang diisi tidak boleh hilang saat Simpan Semua', () => {
  it('REPRODUKSI BUG: anggota ke-2 sudah diisi tetapi "Tambah Anggota" belum diklik → tetap ikut tersimpan', async () => {
    const onSuccess = mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    tambahAnggota()
    // Anggota ke-2 diisi di formulir di bawah daftar, lalu langsung "Simpan Semua"
    isiAnggota('Siti Aminah', NIK_2, 'Istri')
    fireEvent.click(tombolSimpanSemua())

    await waitFor(() => expect(batchMock).toHaveBeenCalledTimes(1))
    expect(nikDiPanggilan()).toEqual([NIK_1, NIK_2])
    expect(toastMock).toHaveBeenCalledWith('2 anggota KK berhasil dicatat pindah masuk', 'success')
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('anggota pertama pun cukup diisi lalu "Simpan Semua" (tanpa klik "Tambah Anggota" dulu)', async () => {
    mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    expect(tombolSimpanSemua().disabled).toBe(false)
    fireEvent.click(tombolSimpanSemua())
    await waitFor(() => expect(batchMock).toHaveBeenCalledTimes(1))
    expect(nikDiPanggilan()).toEqual([NIK_1])
  })

  it('label tombol menghitung anggota di daftar + anggota yang sedang diisi', () => {
    mulaiKeluarga()
    expect(tombolSimpanSemua().disabled).toBe(true)
    expect(tombolSimpanSemua().textContent).toContain('(0)')
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    expect(tombolSimpanSemua().textContent).toContain('(1)')
    tambahAnggota()
    expect(tombolSimpanSemua().textContent).toContain('(1)') // formulir sudah dikosongkan lagi
    isiAnggota('Siti Aminah', NIK_2, 'Istri')
    expect(tombolSimpanSemua().textContent).toContain('(2)')
  })

  it('formulir kosong setelah "Tambah Anggota" tidak dianggap anggota: hanya isi daftar yang disimpan', async () => {
    mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    tambahAnggota()
    isiAnggota('Siti Aminah', NIK_2, 'Istri')
    tambahAnggota()
    fireEvent.click(tombolSimpanSemua())
    await waitFor(() => expect(batchMock).toHaveBeenCalledTimes(1))
    expect(nikDiPanggilan()).toEqual([NIK_1, NIK_2])
  })

  it('anggota yang sedang diisi belum lengkap → TIDAK menyimpan apa pun, galat tampil di isian (bukan hilang diam-diam)', async () => {
    mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    tambahAnggota()
    isi('pm-nama', 'Siti Aminah')
    isi('pm-nik', '3511') // NIK belum 16 digit, tempat/tanggal lahir kosong
    fireEvent.click(tombolSimpanSemua())

    expect(batchMock).not.toHaveBeenCalled()
    expect(screen.getByText('NIK harus 16 digit angka')).toBeTruthy()
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining('belum lengkap'), 'error')
    // daftar anggota yang sudah ditambahkan tetap utuh
    expect(screen.getByText('1 anggota siap disimpan')).toBeTruthy()
  })

  it('NIK yang sama dengan anggota di daftar ditolak (tidak saling menimpa)', async () => {
    mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    tambahAnggota()
    isiAnggota('Siti Aminah', NIK_1, 'Istri')
    tambahAnggota()
    expect(screen.getByText('NIK ini sudah ada di daftar anggota')).toBeTruthy()
    expect(screen.getByText('1 anggota siap disimpan')).toBeTruthy()
    fireEvent.click(tombolSimpanSemua())
    expect(batchMock).not.toHaveBeenCalled()
  })

  it('tiga anggota: dua di daftar + satu sedang diisi → ketiganya tersimpan berurutan', async () => {
    mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    tambahAnggota()
    isiAnggota('Siti Aminah', NIK_2, 'Istri')
    tambahAnggota()
    isiAnggota('Dewi Lestari', NIK_3, 'Anak')
    fireEvent.click(tombolSimpanSemua())
    await waitFor(() => expect(batchMock).toHaveBeenCalledTimes(1))
    expect(nikDiPanggilan()).toEqual([NIK_1, NIK_2, NIK_3])
  })

  it('simpan GAGAL → toast galat; form dan daftar anggota tetap utuh supaya bisa dicoba lagi', async () => {
    batchMock.mockRejectedValueOnce(new Error('jaringan putus'))
    const onSuccess = mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    tambahAnggota()
    isiAnggota('Siti Aminah', NIK_2, 'Istri')
    fireEvent.click(tombolSimpanSemua())

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Gagal mencatat pindah masuk', 'error'))
    expect(onSuccess).not.toHaveBeenCalled()
    // kedua anggota tidak hilang dari layar: satu di daftar, satu masih di formulir
    expect(screen.getByText('1 anggota siap disimpan')).toBeTruthy()
    expect((document.getElementById('pm-nama') as HTMLInputElement).value).toBe('Siti Aminah')
  })
  it('pilihan yang tercetak di KK kosong → ditolak dengan pesan tiap isian (tidak ada bawaan yang diam-diam salah)', () => {
    mulaiKeluarga()
    isi('pm-nama', 'Budi Santoso'); isi('pm-nik', NIK_1); isi('pm-kk', KK); isi('pm-asal', 'Jember')
    isi('pm-tempat', 'Jember'); isi('pm-tgllahir', '1990-05-05')
    fireEvent.click(tombolSimpanSemua())
    expect(batchMock).not.toHaveBeenCalled()
    for (const pesan of ['Jenis kelamin wajib dipilih', 'Agama wajib dipilih', 'Hubungan keluarga wajib dipilih', 'Status perkawinan wajib dipilih', 'Pendidikan wajib dipilih', 'Pekerjaan wajib dipilih'])
      expect(screen.getByText(pesan), pesan).toBeTruthy()
  })

  it('satu KK hanya boleh satu Kepala Keluarga di daftar', () => {
    mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    tambahAnggota()
    isiAnggota('Siti Aminah', NIK_2, 'Kepala Keluarga', { jk: 'Perempuan' })
    tambahAnggota()
    expect(screen.getByText('KK ini sudah punya Kepala Keluarga di daftar')).toBeTruthy()
    expect(screen.getByText('1 anggota siap disimpan')).toBeTruthy()
  })

  it('agama terbawa ke anggota berikutnya, pilihan KK lain dikosongkan lagi', () => {
    mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    pilih('pm-agama', 'Kristen')
    tambahAnggota()
    expect((document.getElementById('pm-agama') as HTMLSelectElement).value).toBe('Kristen')
    for (const id of ['pm-jk', 'pm-hub', 'pm-kawin', 'pm-pend', 'pm-pek'])
      expect((document.getElementById(id) as HTMLSelectElement).value, id).toBe('')
  })

  it('nama ayah, nama ibu, dan golongan darah opsional: kosong tetap tersimpan', async () => {
    mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    fireEvent.click(tombolSimpanSemua())
    await waitFor(() => expect(batchMock).toHaveBeenCalledTimes(1))
    expect(batchMock.mock.calls[0][0][0]).toMatchObject({ nama_ayah: '', nama_ibu: '', golongan_darah: '' })
  })

  it('alamat wajib untuk Kepala Keluarga saja', () => {
    mulaiKeluarga()
    isiAnggota('Budi Santoso', NIK_1, 'Kepala Keluarga', { pertama: true })
    isi('pm-alamat', '')
    fireEvent.click(tombolSimpanSemua())
    expect(screen.getByText('Alamat Kepala Keluarga wajib diisi')).toBeTruthy()
    expect(batchMock).not.toHaveBeenCalled()
    pilih('pm-hub', 'Anak')
    fireEvent.click(tombolSimpanSemua())
    expect(screen.queryByText('Alamat Kepala Keluarga wajib diisi')).toBeNull()
  })

  it('penanda isian: wajib (*) untuk yang tercetak di KK, (opsional) untuk ayah, ibu, golongan darah', () => {
    mulaiKeluarga()
    const penanda = (teks: string) => {
      const l = Array.from(document.querySelectorAll('label')).find((x) => (x.textContent ?? '').startsWith(teks)) as HTMLElement
      return { req: !!l.querySelector('.req'), opt: !!l.querySelector('.opt') }
    }
    for (const w of ['Jenis kelamin', 'Agama', 'Hubungan keluarga', 'Status perkawinan', 'Pendidikan', 'Pekerjaan', 'Tempat lahir', 'Tanggal lahir'])
      expect(penanda(w), w).toEqual({ req: true, opt: false })
    for (const o of ['Nama ayah', 'Nama ibu', 'Golongan darah'])
      expect(penanda(o), o).toEqual({ req: false, opt: true })
  })
})
