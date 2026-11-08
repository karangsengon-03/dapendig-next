import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }))
vi.mock('@/hooks/usePenduduk', () => ({ checkNikExists: () => Promise.resolve(false) }))

import { PendudukForm } from '@/components/penduduk/PendudukForm'
import type { PendudukFormData } from '@/types'

const AWAL = {
  nik: '3511140109480001', no_kk: '3511030000001826', nama_lengkap: 'Budi Santoso', hubungan_keluarga: 'Kepala Keluarga',
  nama_ayah: '', nama_ibu: '', jenis_kelamin: 'Laki-laki', tempat_lahir: 'JEMBER', tanggal_lahir: '1985-04-10', agama: 'Islam',
  pendidikan: '', pekerjaan: '', status_perkawinan: 'Kawin', golongan_darah: '', rt: '001', rw: '001', alamat: '', status: 'aktif',
} as unknown as Partial<PendudukFormData>

const el = (id: string) => document.getElementById(id) as HTMLSelectElement & HTMLInputElement
const label = (teks: string) => Array.from(document.querySelectorAll('label')).find((l) => (l.textContent ?? '').startsWith(teks)) as HTMLElement

describe('Edit penduduk — skema isian yang tercetak di KK', () => {
  it('Golongan darah tersedia (opsional) dan ikut tersimpan', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<PendudukForm mode="edit" editId="x" initial={{ ...AWAL, pendidikan: 'SMA/Sederajat', pekerjaan: 'Petani/Pekebun', alamat: 'KARANG SENGON' }} onSubmit={onSubmit} />)
    expect(el('f-gol')).toBeTruthy()
    expect(label('Golongan darah').querySelector('.opt')).toBeTruthy()
    fireEvent.change(el('f-gol'), { target: { value: 'AB' } })
    fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/ }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ golongan_darah: 'AB', pendidikan: 'SMA/Sederajat', pekerjaan: 'Petani/Pekebun' })
  })

  it('pendidikan, pekerjaan, dan alamat Kepala Keluarga yang kosong ditolak dengan pesan; tidak menyimpan', async () => {
    const onSubmit = vi.fn()
    render(<PendudukForm mode="edit" editId="x" initial={AWAL} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/ }))
    await waitFor(() => expect(screen.getByText('Pendidikan wajib dipilih')).toBeTruthy())
    expect(screen.getByText('Pekerjaan wajib dipilih')).toBeTruthy()
    expect(screen.getByText('Alamat Kepala Keluarga wajib diisi')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('alamat tidak wajib untuk anggota yang bukan Kepala Keluarga', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<PendudukForm mode="edit" editId="x" initial={{ ...AWAL, hubungan_keluarga: 'Anak', pendidikan: 'SMP/Sederajat', pekerjaan: 'Pelajar/Mahasiswa' }} onSubmit={onSubmit} />)
    expect(label('Alamat').querySelector('.opt')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/ }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })

  it('penanda: wajib (*) untuk isian KK, (opsional) untuk nama ayah, nama ibu, golongan darah', () => {
    render(<PendudukForm mode="edit" editId="x" initial={AWAL} onSubmit={vi.fn()} />)
    for (const w of ['Hubungan keluarga', 'Status perkawinan', 'Agama', 'Pendidikan', 'Pekerjaan', 'Jenis kelamin']) expect(label(w).querySelector('.req'), w).toBeTruthy()
    for (const o of ['Nama ayah', 'Nama ibu', 'Golongan darah']) expect(label(o).querySelector('.opt'), o).toBeTruthy()
  })

  it('nilai pilihan yang kosong di data lama tampil kosong (bukan diam-diam diganti pilihan pertama)', () => {
    render(<PendudukForm mode="edit" editId="x" initial={AWAL} onSubmit={vi.fn()} />)
    expect(el('f-pend').value).toBe('')
    expect(el('f-pek').value).toBe('')
  })
})
