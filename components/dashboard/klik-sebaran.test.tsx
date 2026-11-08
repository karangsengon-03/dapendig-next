import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UmurChart } from '@/components/dashboard/UmurChart'
import { PendudukFilter, FILTER_AWAL } from '@/components/penduduk/PendudukFilter'

beforeEach(() => { window.localStorage.clear() })

describe('Beranda → kelompok umur bisa diklik', () => {
  const data = [
    { label: 'Balita', color: '#000', jumlah: 137 }, { label: 'Anak', color: '#000', jumlah: 232 },
    { label: 'Remaja', color: '#000', jumlah: 118 }, { label: 'Dewasa', color: '#000', jumlah: 523 },
    { label: 'Lansia', color: '#000', jumlah: 190 },
  ]
  it('ada teks petunjuk, label hanya rentang, dan tiap baris menaut ke Daftar Penduduk aktif pada rentang itu', () => {
    render(<UmurChart data={data} loading={false} />)
    expect(screen.getByText('Klik untuk melihat warga')).toBeInTheDocument()
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      '/penduduk?umur=0-4&status=aktif', '/penduduk?umur=5-14&status=aktif', '/penduduk?umur=15-24&status=aktif',
      '/penduduk?umur=25-59&status=aktif', '/penduduk?umur=60-999&status=aktif',
    ])
    expect(screen.getByText('0–4 th')).toBeInTheDocument()
    expect(screen.getByText('60+ th')).toBeInTheDocument()
    expect(screen.queryByText(/Balita/)).toBeNull()
  })
})

describe('Daftar Penduduk → chip Dusun, Umur, Pendidikan', () => {
  const props = { onChange: () => {}, total: 1200, filtered: 40, pendidikanOptions: ['SMA/Sederajat', 'Diploma IV/Strata I'] }
  it('chip Dusun, Umur, Klasifikasi, dan Pendidikan tampil bawaan', () => {
    render(<PendudukFilter {...props} filter={FILTER_AWAL} />)
    for (const t of ['Dusun', 'Umur', 'Klasifikasi', 'Pendidikan']) expect(screen.getByRole('button', { name: new RegExp(`^${t}`) })).toBeInTheDocument()
  })
  it('filter aktif dari tautan ditampilkan dengan label yang jelas', () => {
    render(<PendudukFilter {...props} filter={{ ...FILTER_AWAL, dusun: 'Paleran', umur: '0-4', pendidikan: 'Diploma IV/Strata I' }} />)
    expect(screen.getByRole('button', { name: /Dusun Paleran/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Umur 0–4 th/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Diploma IV\/Strata I/ })).toBeInTheDocument()
  })
  it('klasifikasi umur dari Monografi tampil dengan nama dan rentangnya', () => {
    render(<PendudukFilter {...props} filter={{ ...FILTER_AWAL, klasifikasi: 'Balita' }} />)
    expect(screen.getByRole('button', { name: /Balita \(0–5 th\)/ })).toBeInTheDocument()
  })
  it('rentang umur dari Monografi (di luar pilihan chip) tetap berlabel jelas', () => {
    render(<PendudukFilter {...props} filter={{ ...FILTER_AWAL, umur: '45-999' }} />)
    expect(screen.getByRole('button', { name: /Umur 45\+ th/ })).toBeInTheDocument()
  })
})
