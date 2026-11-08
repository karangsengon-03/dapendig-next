import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { bacaDraf, tulisDraf, buangDraf, bukaDraf, tabBerDraf, buangSemuaDraf } from '@/lib/draf-form'
import { useDrafState } from '@/hooks/useDrafForm'

describe('lib/draf-form', () => {
  it('tulis → baca → tabBerDraf; buang satu tab tidak menyentuh tab lain', () => {
    tulisDraf('mutasi.masuk.form', { a: 1 })
    tulisDraf('mutasi.masuk.daftar', [1])
    tulisDraf('mutasi.keluar.form', { b: 2 })
    expect(bacaDraf('mutasi.masuk.form')).toEqual({ a: 1 })
    expect(tabBerDraf('mutasi', ['keluar', 'masuk'])).toBe('keluar')
    buangDraf('mutasi.keluar')
    expect(bacaDraf('mutasi.keluar.form')).toBeUndefined()
    expect(bacaDraf('mutasi.masuk.daftar')).toEqual([1])
    expect(tabBerDraf('mutasi', ['keluar', 'masuk'])).toBe('masuk')
    expect(tabBerDraf('vital', ['lahir', 'meninggal'])).toBeNull()
  })
  it('sesudah dibuang, tulisan susulan diabaikan sampai form dibuka lagi', () => {
    buangDraf('vital.lahir')
    tulisDraf('vital.lahir.form', { x: 1 })
    expect(bacaDraf('vital.lahir.form')).toBeUndefined()
    bukaDraf('vital.lahir')
    tulisDraf('vital.lahir.form', { x: 2 })
    expect(bacaDraf('vital.lahir.form')).toEqual({ x: 2 })
  })
  it('buangSemuaDraf (keluar akun) mengosongkan semuanya', () => {
    tulisDraf('mutasi.masuk.form', 1); tulisDraf('vital.lahir.form', 2)
    buangSemuaDraf()
    expect(tabBerDraf('mutasi', ['masuk'])).toBeNull()
    expect(tabBerDraf('vital', ['lahir'])).toBeNull()
  })
})

function Contoh({ onBuang }: { onBuang?: () => void }) {
  const [nilai, setNilai] = useDrafState('mutasi.keluar', 'form', () => ({ tujuan: '' }))
  return (
    <div>
      <input aria-label="tujuan" value={nilai.tujuan} onChange={(e) => setNilai({ tujuan: e.target.value })} />
      <button onClick={() => { buangDraf('mutasi.keluar'); onBuang?.() }}>tutup</button>
    </div>
  )
}

describe('useDrafState — isian bertahan saat halaman ditinggalkan', () => {
  it('ketik → halaman dilepas → dibuka lagi: isian sama', () => {
    const a = render(<Contoh />)
    fireEvent.change(screen.getByLabelText('tujuan'), { target: { value: 'Desa Wonorejo' } })
    a.unmount()
    render(<Contoh />)
    expect(screen.getByLabelText('tujuan')).toHaveValue('Desa Wonorejo')
  })
  it('Tutup form membuang isian: dibuka lagi kosong, walau komponen sempat render ulang', () => {
    render(<Contoh />)
    fireEvent.change(screen.getByLabelText('tujuan'), { target: { value: 'Jember' } })
    fireEvent.click(screen.getByText('tutup'))
    cleanup()
    render(<Contoh />)
    expect(screen.getByLabelText('tujuan')).toHaveValue('')
  })
  it('awal berupa fungsi dipanggil hanya bila belum ada draf', () => {
    const awal = vi.fn(() => ({ tujuan: 'x' }))
    function C() { const [n] = useDrafState('mutasi.keluar', 'form', awal); return <span>{n.tujuan}</span> }
    render(<C />)
    expect(awal).toHaveBeenCalledTimes(1)
    cleanup()
    render(<C />)
    expect(awal).toHaveBeenCalledTimes(1) // draf sudah ada → awal tidak dipanggil lagi
  })
})
