import { describe, it, expect, vi } from 'vitest'
import { pindahDokumenAtomik, type TransaksiMinimal } from '@/lib/pindah-dokumen'

type Ref = string

/** Transaksi palsu di atas Map: mencatat urutan operasi untuk memastikan baca mendahului tulis. */
function buatTx(isi: Record<Ref, Record<string, unknown>>) {
  const urutan: string[] = []
  const tx: TransaksiMinimal<Ref> = {
    get: vi.fn(async (ref: Ref) => {
      urutan.push('get:' + ref)
      return { exists: () => ref in isi, data: () => isi[ref] }
    }),
    set: vi.fn((ref: Ref) => { urutan.push('set:' + ref) }),
    delete: vi.fn((ref: Ref) => { urutan.push('delete:' + ref) }),
  }
  return { tx, urutan }
}

describe('pindahDokumenAtomik', () => {
  it('ID baru kosong → dokumen disalin ke ID baru dan dokumen lama dihapus; semua baca sebelum tulis', async () => {
    const { tx, urutan } = buatTx({ acak: { nik: '123', nama: 'A' } })
    expect(await pindahDokumenAtomik(tx, 'acak', '123')).toBe('ok')
    expect(tx.set).toHaveBeenCalledWith('123', { nik: '123', nama: 'A' })
    expect(tx.delete).toHaveBeenCalledWith('acak')
    expect(urutan).toEqual(['get:acak', 'get:123', 'set:123', 'delete:acak'])
  })

  it('dokumen ber-ID baru SUDAH ADA → bentrok: tidak menimpa, tidak menghapus apa pun', async () => {
    const { tx } = buatTx({ acak: { nik: '123', nama: 'Salinan' }, '123': { nik: '123', nama: 'Asli' } })
    expect(await pindahDokumenAtomik(tx, 'acak', '123')).toBe('bentrok')
    expect(tx.set).not.toHaveBeenCalled()
    expect(tx.delete).not.toHaveBeenCalled()
  })

  it('dokumen lama sudah tidak ada → dilewati tanpa menulis (aman dijalankan dua kali)', async () => {
    const { tx } = buatTx({ '123': { nik: '123' } })
    expect(await pindahDokumenAtomik(tx, 'acak', '123')).toBe('hilang')
    expect(tx.set).not.toHaveBeenCalled()
    expect(tx.delete).not.toHaveBeenCalled()
  })

  it('tidak membaca ID baru bila dokumen lama sudah hilang', async () => {
    const { tx } = buatTx({})
    await pindahDokumenAtomik(tx, 'acak', '123')
    expect(tx.get).toHaveBeenCalledTimes(1)
  })
})
