import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GalatTolak } from '@/lib/galat-tolak'

/**
 * Firestore tiruan di memori. runTransaction atomik: semua tulisan ditahan dan baru diterapkan di akhir;
 * `tolakTulisPenduduk` = menulis ke penduduk ditolak (izin/jaringan), maka tidak ada tulisan yang tersimpan.
 */
const toko = new Map<string, Record<string, unknown>>()
let urutId = 0
let tolakTulisPenduduk = false

type Ref = { __col: string; __id: string; id: string }
const kunci = (r: Ref) => `${r.__col}/${r.__id}`
const isi = (kol: string): ({ id: string } & Record<string, unknown>)[] => [...toko.entries()].filter(([k]) => k.startsWith(`${kol}/`)).map(([k, v]) => ({ id: k.split('/')[1], ...v }))

vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, nama: string) => ({ __col: nama }),
  doc: (a: { __col?: string }, kol?: string, id?: string): Ref => {
    const __id = kol === undefined ? `auto-${++urutId}` : (id as string)
    return { __col: kol ?? (a.__col as string), __id, id: __id }
  },
  where: (f: string, op: string, v: unknown) => ({ f, op, v }),
  limit: (n: number) => ({ lim: n }),
  query: (kol: { __col: string }, ...cons: unknown[]) => ({ __col: kol.__col, cons }),
  getDoc: async (ref: Ref) => {
    const d = toko.get(kunci(ref))
    return { exists: () => !!d, data: () => d, id: ref.__id }
  },
  getDocs: async (q: { __col: string; cons: ({ f?: string; v?: unknown; lim?: number })[] }) => {
    const w = q.cons.find((c) => c.f)
    const lim = q.cons.find((c) => c.lim)?.lim ?? 1000
    const docs = isi(q.__col)
      .filter((d) => !w || (d as Record<string, unknown>)[w.f as string] === w.v)
      .slice(0, lim)
      .map((d) => ({ id: d.id, data: () => d }))
    return { empty: docs.length === 0, docs }
  },
  serverTimestamp: () => 'TS',
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
    const tulisan: [string, Ref, Record<string, unknown>][] = []
    const tx = {
      get: async (ref: Ref) => {
        const d = toko.get(kunci(ref))
        return { exists: () => !!d, data: () => d, id: ref.__id }
      },
      set: (ref: Ref, data: Record<string, unknown>) => { tulisan.push(['set', ref, data]) },
      update: (ref: Ref, data: Record<string, unknown>) => { tulisan.push(['update', ref, data]) },
    }
    const hasil = await fn(tx)
    if (tolakTulisPenduduk && tulisan.some(([, r]) => r.__col === 'penduduk')) throw new Error('permission-denied (tiruan)')
    for (const [jenis, ref, data] of tulisan) toko.set(kunci(ref), jenis === 'update' ? { ...(toko.get(kunci(ref)) ?? {}), ...data } : data)
    return hasil
  },
}))

import { kolomBerubah, pesanHasilSinkron, KOLOM_PENDUDUK_DARI_LAHIR, KOLOM_PENDUDUK_DARI_MASUK } from './sinkron-catatan'
import { editCatatanDanPenduduk } from './sinkron-catatan-tulis'

const NIK = '3511010101900001'
const catatanMasuk = {
  nama_lengkap: 'Budi', nik: NIK, no_kk: '3511010000000001', jenis_kelamin: 'Laki-laki', agama: 'Islam',
  hubungan_keluarga: 'Kepala Keluarga', nama_ayah: '', nama_ibu: '', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Petani/Pekebun',
  rt: '1', rw: '1', status_perkawinan: 'Kawin', tanggal_lahir: '1990-01-01', tempat_lahir: 'Jember', alamat: 'DUSUN KRAJAN',
  asal_daerah: 'Jember', tanggal: '2026-09-01',
}
const pendudukAwal = {
  nama_lengkap: 'Budi', nik: NIK, no_kk: '3511010000000001', jenis_kelamin: 'Laki-laki', agama: 'Islam',
  hubungan_keluarga: 'Kepala Keluarga', nama_ayah: '', nama_ibu: '', pendidikan: 'SLTA/Sederajat', pekerjaan: 'Petani/Pekebun',
  rt: '001', rw: '001', status_perkawinan: 'Kawin', tanggal_lahir: '1990-01-01', tempat_lahir: 'Jember',
  golongan_darah: '', alamat: 'DUSUN KRAJAN', status: 'aktif',
}
const p = (data: Record<string, unknown>, extra: Partial<Parameters<typeof editCatatanDanPenduduk>[0]> = {}) =>
  editCatatanDanPenduduk({ koleksi: 'mutasi_masuk', id: 'c1', data, kolom: KOLOM_PENDUDUK_DARI_MASUK, label: 'pindah masuk', nama: 'Budi', email: 'admin@test.local', ...extra })

beforeEach(() => {
  toko.clear(); urutId = 0; tolakTulisPenduduk = false
  toko.set('mutasi_masuk/c1', { ...catatanMasuk })
  toko.set(`penduduk/${NIK}`, { ...pendudukAwal })
})

describe('kolomBerubah', () => {
  it('hanya kolom yang berbeda; RT/RW dibandingkan sebagai 3 digit', () => {
    const b = kolomBerubah(catatanMasuk, { ...catatanMasuk, rt: '001', agama: 'Hindu', alamat: 'DUSUN BARU' }, KOLOM_PENDUDUK_DARI_MASUK)
    expect(b).toEqual({ agama: 'Hindu', alamat: 'DUSUN BARU' })
  })
  it('RT yang berubah disimpan 3 digit', () => {
    expect(kolomBerubah(catatanMasuk, { ...catatanMasuk, rt: '3' }, KOLOM_PENDUDUK_DARI_MASUK)).toEqual({ rt: '003' })
  })
  it('kolom di luar daftar (asal_daerah, tanggal) tidak pernah diteruskan', () => {
    expect(kolomBerubah(catatanMasuk, { ...catatanMasuk, asal_daerah: 'Lain', tanggal: '2026-10-01' }, KOLOM_PENDUDUK_DARI_MASUK)).toEqual({})
  })
  it('kolom yang tidak dikirim diabaikan; golongan darah kosong sama dengan tidak ada', () => {
    expect(kolomBerubah(catatanMasuk, { nama_lengkap: 'Budi', golongan_darah: '' }, KOLOM_PENDUDUK_DARI_MASUK)).toEqual({})
  })
  it('spasi di tepi diabaikan', () => {
    expect(kolomBerubah(catatanMasuk, { ...catatanMasuk, nama_lengkap: ' Budi ' }, KOLOM_PENDUDUK_DARI_MASUK)).toEqual({})
  })
})

describe('pesanHasilSinkron', () => {
  it('tanpa hasil → pesan dasar', () => expect(pesanHasilSinkron('Data diperbarui')).toEqual({ pesan: 'Data diperbarui', jenis: 'success' }))
  it('ada kolom berubah → menyebut menu Penduduk', () => {
    expect(pesanHasilSinkron('Data diperbarui', { pendudukDiperbarui: true, kolom: ['agama'] }).pesan).toContain('menu Penduduk')
  })
  it('penduduk ada tetapi tidak ada yang berbeda → pesan dasar', () => {
    expect(pesanHasilSinkron('Data diperbarui', { pendudukDiperbarui: true, kolom: [] })).toEqual({ pesan: 'Data diperbarui', jenis: 'success' })
  })
  it('penduduk tidak ditemukan → peringatan', () => {
    const h = pesanHasilSinkron('Data diperbarui', { pendudukDiperbarui: false, kolom: [] })
    expect(h.jenis).toBe('warning')
    expect(h.pesan).toContain('tidak ditemukan')
  })
})

describe('editCatatanDanPenduduk', () => {
  it('memperbarui catatan DAN penduduk (hanya kolom yang berubah) + log', async () => {
    const h = await p({ ...catatanMasuk, agama: 'Hindu', rt: '2' })
    expect(h).toEqual({ pendudukDiperbarui: true, kolom: ['agama', 'rt'] })
    expect(toko.get('mutasi_masuk/c1')).toMatchObject({ agama: 'Hindu', rt: '2', updated_at: 'TS' })
    expect(toko.get(`penduduk/${NIK}`)).toMatchObject({ agama: 'Hindu', rt: '002', pekerjaan: 'Petani/Pekebun', status: 'aktif' })
    const log = isi('log')
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ aksi: 'edit', nik_target: NIK, oleh: 'admin@test.local' })
    expect(String(log[0].keterangan)).toContain('data penduduk ikut diperbarui')
  })

  it('isian yang sudah diubah lewat Edit penduduk tidak ditimpa isian lama catatan', async () => {
    toko.set(`penduduk/${NIK}`, { ...pendudukAwal, pekerjaan: 'Wiraswasta', golongan_darah: 'B' })
    await p({ ...catatanMasuk, agama: 'Kristen' }) // pekerjaan catatan tidak diubah
    expect(toko.get(`penduduk/${NIK}`)).toMatchObject({ agama: 'Kristen', pekerjaan: 'Wiraswasta', golongan_darah: 'B' })
  })

  it('tidak ada kolom yang berbeda → penduduk tidak ditulis, catatan tetap diperbarui', async () => {
    const sebelum = { ...toko.get(`penduduk/${NIK}`) }
    const h = await p({ ...catatanMasuk, asal_daerah: 'Lain' })
    expect(h).toEqual({ pendudukDiperbarui: true, kolom: [] })
    expect(toko.get(`penduduk/${NIK}`)).toEqual(sebelum)
    expect(toko.get('mutasi_masuk/c1')).toMatchObject({ asal_daerah: 'Lain' })
  })

  it('NIK diganti ke NIK bebas → catatan dan isian nik penduduk berubah; ID dokumen penduduk tetap', async () => {
    const baru = '3511010101900002'
    const h = await p({ ...catatanMasuk, nik: baru })
    expect(h.kolom).toEqual(['nik'])
    expect(toko.get('mutasi_masuk/c1')).toMatchObject({ nik: baru })
    expect(toko.get(`penduduk/${NIK}`)).toMatchObject({ nik: baru })
    expect(toko.has(`penduduk/${baru}`)).toBe(false)
  })

  it('edit kedua setelah NIK diganti tetap menemukan penduduk (lewat isian nik)', async () => {
    const baru = '3511010101900002'
    await p({ ...catatanMasuk, nik: baru })
    const h = await p({ ...catatanMasuk, nik: baru, agama: 'Budha' })
    expect(h).toEqual({ pendudukDiperbarui: true, kolom: ['agama'] })
    expect(toko.get(`penduduk/${NIK}`)).toMatchObject({ nik: baru, agama: 'Budha' })
  })

  it('NIK baru sudah dipakai penduduk lain (ID) → ditolak, tidak ada yang tersimpan', async () => {
    const lain = '3511010101900003'
    toko.set(`penduduk/${lain}`, { ...pendudukAwal, nik: lain, nama_lengkap: 'Siti' })
    const catatanSebelum = { ...toko.get('mutasi_masuk/c1') }
    await expect(p({ ...catatanMasuk, nik: lain, agama: 'Hindu' })).rejects.toThrow(GalatTolak)
    await expect(p({ ...catatanMasuk, nik: lain })).rejects.toThrow(/Siti/)
    expect(toko.get('mutasi_masuk/c1')).toEqual(catatanSebelum)
    expect(toko.get(`penduduk/${NIK}`)).toMatchObject({ agama: 'Islam', nik: NIK })
    expect(isi('log')).toHaveLength(0)
  })

  it('NIK baru sudah dipakai penduduk lain (isian nik, ID berbeda) → ditolak', async () => {
    toko.set('penduduk/impor-77', { ...pendudukAwal, nik: '3511010101900004', nama_lengkap: 'Hasil Impor' })
    await expect(p({ ...catatanMasuk, nik: '3511010101900004' })).rejects.toThrow(/Hasil Impor/)
  })

  it('penduduk tidak ditemukan → catatan tetap diperbarui, hasil memberi tahu', async () => {
    toko.delete(`penduduk/${NIK}`)
    const h = await p({ ...catatanMasuk, agama: 'Hindu' })
    expect(h).toEqual({ pendudukDiperbarui: false, kolom: [] })
    expect(toko.get('mutasi_masuk/c1')).toMatchObject({ agama: 'Hindu' })
    expect(isi('penduduk')).toHaveLength(0)
    expect(String(isi('log')[0].keterangan)).not.toContain('penduduk ikut')
  })

  it('penduduk dicari lewat isian nik bila ID dokumennya bukan NIK (data impor)', async () => {
    toko.delete(`penduduk/${NIK}`)
    toko.set('penduduk/impor-1', { ...pendudukAwal })
    const h = await p({ ...catatanMasuk, pekerjaan: 'Guru' })
    expect(h).toEqual({ pendudukDiperbarui: true, kolom: ['pekerjaan'] })
    expect(toko.get('penduduk/impor-1')).toMatchObject({ pekerjaan: 'Guru' })
  })

  it('catatan tidak ada → ditolak dengan pesan jelas', async () => {
    await expect(p({ ...catatanMasuk }, { id: 'tidak-ada' })).rejects.toThrow(/Catatan tidak ditemukan/)
  })

  it('atomik: bila penduduk gagal ditulis, catatan dan log juga tidak tersimpan', async () => {
    tolakTulisPenduduk = true
    const catatanSebelum = { ...toko.get('mutasi_masuk/c1') }
    await expect(p({ ...catatanMasuk, agama: 'Hindu' })).rejects.toThrow(/permission-denied/)
    expect(toko.get('mutasi_masuk/c1')).toEqual(catatanSebelum)
    expect(isi('log')).toHaveLength(0)
  })

  it('Kelahiran: status perkawinan dan golongan darah penduduk tidak disentuh', async () => {
    toko.set('lahir/l1', { ...catatanMasuk, status_perkawinan: 'Belum Kawin' })
    toko.set(`penduduk/${NIK}`, { ...pendudukAwal, status_perkawinan: 'Kawin', golongan_darah: 'O' })
    const h = await p({ ...catatanMasuk, status_perkawinan: 'Belum Kawin', agama: 'Hindu' }, { koleksi: 'lahir', id: 'l1', kolom: KOLOM_PENDUDUK_DARI_LAHIR, label: 'kelahiran' })
    expect(h.kolom).toEqual(['agama'])
    expect(toko.get(`penduduk/${NIK}`)).toMatchObject({ status_perkawinan: 'Kawin', golongan_darah: 'O', agama: 'Hindu' })
    expect(String(isi('log')[0].keterangan)).toMatch(/^Edit kelahiran: Budi/)
  })
})
