import { describe, it, expect, vi } from 'vitest'
import { tulisBertahap, pesanGalatTulis } from '@/lib/tulis-bertahap'

const galat = (code: string) => Object.assign(new Error(`firestore ${code}`), { code })

describe('tulisBertahap', () => {
  it('semua batch berhasil → semua berhasil, tulisSatu tidak dipanggil', async () => {
    const tulisBatch = vi.fn().mockResolvedValue(undefined)
    const tulisSatu = vi.fn().mockResolvedValue(undefined)
    const hasil = await tulisBertahap(['a', 'b', 'c'], { tulisBatch, tulisSatu })
    expect(hasil.berhasil).toEqual(['a', 'b', 'c'])
    expect(hasil.gagal).toEqual([])
    expect(tulisBatch).toHaveBeenCalledTimes(1)
    expect(tulisSatu).not.toHaveBeenCalled()
  })

  it('satu dokumen tidak ada: HANYA baris itu gagal, yang lain tetap tertulis (proses tidak berhenti)', async () => {
    const tertulis: string[] = []
    const tulisBatch = vi.fn().mockRejectedValue(galat('not-found'))
    const tulisSatu = vi.fn(async (id: string) => {
      if (id === 'hilang') throw galat('not-found')
      tertulis.push(id)
    })
    const hasil = await tulisBertahap(['a', 'hilang', 'c'], { tulisBatch, tulisSatu })
    expect(hasil.berhasil).toEqual(['a', 'c'])
    expect(hasil.gagal).toEqual([{ item: 'hilang', pesan: 'Dokumen tidak ditemukan' }])
    expect(tertulis).toEqual(['a', 'c'])
  })

  it('batch dipecah menurut ukuranBatch dan kegagalan satu batch tidak memengaruhi batch lain', async () => {
    const batchDipanggil: string[][] = []
    const tulisBatch = vi.fn(async (k: string[]) => {
      batchDipanggil.push(k)
      if (k.includes('rusak')) throw galat('not-found')
    })
    const tulisSatu = vi.fn(async (id: string) => {
      if (id === 'rusak') throw galat('not-found')
    })
    const hasil = await tulisBertahap(['a', 'b', 'rusak', 'd', 'e'], { tulisBatch, tulisSatu, ukuranBatch: 2 })
    expect(batchDipanggil).toEqual([['a', 'b'], ['rusak', 'd'], ['e']])
    expect(hasil.berhasil).toEqual(['a', 'b', 'd', 'e'])
    expect(hasil.gagal.map((g) => g.item)).toEqual(['rusak'])
    // batch pertama dan terakhir berhasil tanpa fallback; hanya batch yang ditolak diulang per item
    expect(tulisSatu).toHaveBeenCalledTimes(2)
  })

  it('daftar kosong → tidak menulis apa pun', async () => {
    const tulisBatch = vi.fn()
    const tulisSatu = vi.fn()
    const hasil = await tulisBertahap([], { tulisBatch, tulisSatu })
    expect(hasil).toEqual({ berhasil: [], gagal: [] })
    expect(tulisBatch).not.toHaveBeenCalled()
  })

  it('semua baris gagal → semua tercatat gagal dengan pesannya, tidak melempar galat', async () => {
    const tulisBatch = vi.fn().mockRejectedValue(galat('permission-denied'))
    const tulisSatu = vi.fn().mockRejectedValue(galat('permission-denied'))
    const hasil = await tulisBertahap(['a', 'b'], { tulisBatch, tulisSatu })
    expect(hasil.berhasil).toEqual([])
    expect(hasil.gagal).toEqual([
      { item: 'a', pesan: 'Tidak punya izin menulis' },
      { item: 'b', pesan: 'Tidak punya izin menulis' },
    ])
  })

  it('onProgress melaporkan jumlah yang sudah diproses', async () => {
    const progres: number[] = []
    await tulisBertahap(['a', 'b', 'c'], {
      tulisBatch: vi.fn().mockResolvedValue(undefined),
      tulisSatu: vi.fn(),
      ukuranBatch: 2,
      onProgress: (n) => progres.push(n),
    })
    expect(progres).toEqual([2, 3])
  })

  it('dijalankan dua kali pada data yang sama memberi hasil yang sama (idempoten)', async () => {
    const opsi = { tulisBatch: vi.fn().mockResolvedValue(undefined), tulisSatu: vi.fn() }
    const a = await tulisBertahap(['x', 'y'], opsi)
    const b = await tulisBertahap(['x', 'y'], opsi)
    expect(b).toEqual(a)
  })
})

describe('pesanGalatTulis', () => {
  it('memetakan kode Firestore umum ke pesan Indonesia', () => {
    expect(pesanGalatTulis(galat('not-found'))).toBe('Dokumen tidak ditemukan')
    expect(pesanGalatTulis(galat('permission-denied'))).toBe('Tidak punya izin menulis')
    expect(pesanGalatTulis(galat('unavailable'))).toBe('Gagal terhubung')
  })

  it('kode lain memakai pesan galat; tanpa pesan memakai teks bawaan', () => {
    expect(pesanGalatTulis(new Error('boom'))).toBe('boom')
    expect(pesanGalatTulis('teks')).toBe('teks')
    expect(pesanGalatTulis(undefined)).toBe('kesalahan tidak diketahui')
    expect(pesanGalatTulis({})).toBe('kesalahan tidak diketahui')
  })
})
