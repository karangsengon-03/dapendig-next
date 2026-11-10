import { describe, expect, it } from 'vitest'
import { ringkasPerubahan } from '@/lib/ringkas-perubahan'

describe('ringkasPerubahan', () => {
  it('RT/RW berubah → "RT 000 → 003; RW 000 → 001"', () => {
    expect(ringkasPerubahan({ rt: '000', rw: '000', nama_lengkap: 'A' }, { rt: '003', rw: '001', nama_lengkap: 'A' }))
      .toBe('RT 000 → 003; RW 000 → 001')
  })
  it('"0" dan "000" dianggap sama; kosong ditulis "—"', () => {
    expect(ringkasPerubahan({ rt: '0' }, { rt: '000' })).toBe('')
    expect(ringkasPerubahan({ alamat: '' }, { alamat: 'Dusun X' })).toBe('Alamat — → Dusun X')
  })
  it('tanpa data lama atau tanpa perubahan → kosong; teks panjang dipotong', () => {
    expect(ringkasPerubahan(undefined, { rt: '001' })).toBe('')
    expect(ringkasPerubahan({ alamat: 'a' }, { alamat: 'b'.repeat(400) }).length).toBeLessThanOrEqual(240)
  })
})
