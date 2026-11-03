import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { RecTabs } from '@/components/ui/rec-parts'

const TABS = [{ key: 'keluar', label: 'Pindah keluar', icon: <ArrowRight />, count: 3 }, { key: 'masuk', label: 'Pindah masuk', icon: <ArrowLeft />, count: 5 }]

describe('RecTabs — kunci tab saat form terbuka', () => {
  it('tanpa kunci: klik tab lain memanggil onPilih', () => {
    const onPilih = vi.fn(); const onTerkunci = vi.fn()
    render(<RecTabs tabs={TABS} aktif="keluar" tone="bad" onPilih={onPilih} onTerkunci={onTerkunci} />)
    fireEvent.click(screen.getByRole('button', { name: /Pindah masuk/ }))
    expect(onPilih).toHaveBeenCalledWith('masuk')
    expect(onTerkunci).not.toHaveBeenCalled()
  })
  it('terkunci: tab lain aria-disabled dan klik hanya memanggil onTerkunci; tab aktif tetap bisa diklik', () => {
    const onPilih = vi.fn(); const onTerkunci = vi.fn()
    render(<RecTabs tabs={TABS} aktif="keluar" tone="bad" onPilih={onPilih} terkunci onTerkunci={onTerkunci} />)
    const lain = screen.getByRole('button', { name: /Pindah masuk/ })
    expect(lain).toHaveAttribute('aria-disabled', 'true')
    expect(lain).toHaveAttribute('title', 'Tutup form terlebih dahulu untuk pindah tab')
    fireEvent.click(lain)
    expect(onPilih).not.toHaveBeenCalled()
    expect(onTerkunci).toHaveBeenCalledTimes(1)
    const aktif = screen.getByRole('button', { name: /Pindah keluar/ })
    expect(aktif).not.toHaveAttribute('aria-disabled')
    fireEvent.click(aktif)
    expect(onPilih).toHaveBeenCalledWith('keluar')
  })
})
