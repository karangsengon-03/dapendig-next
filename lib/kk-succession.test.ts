import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Penduduk } from '@/types'

// Mock Firestore SDK — kita uji ALGORITMA suksesi (siapa yang dipilih,
// dalam urutan apa), bukan konektivitas Firebase sungguhan. updateDoc
// dicatat lewat mock supaya kita bisa assert PERSIS apa yang ditulis
// tanpa butuh database nyata.
const updateDocMock = vi.fn()
const getDocsMock = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ __col: name })),
  doc: vi.fn((_db, col, id) => ({ __col: col, __id: id })),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  query: vi.fn((...args) => args),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}))

import { jalankanSuksesiKK, kembalikanSuksesiKK } from '@/lib/kk-succession'

const mockDb = {} as never

function buatPenduduk(overrides: Partial<Penduduk>): Penduduk {
  return {
    id: overrides.id ?? 'nik-default',
    nik: overrides.id ?? 'nik-default',
    nama_lengkap: 'Test',
    no_kk: '1234567890123456',
    hubungan_keluarga: 'Anak',
    jenis_kelamin: 'Laki-laki',
    tempat_lahir: 'Bondowoso',
    tanggal_lahir: '2000-01-01',
    agama: 'Islam',
    pendidikan: '-',
    pekerjaan: '-',
    status_perkawinan: 'Belum Kawin',
    rt: '001',
    rw: '001',
    status: 'aktif',
    ...overrides,
  } as Penduduk
}

beforeEach(() => {
  updateDocMock.mockClear()
  getDocsMock.mockClear()
})

describe('jalankanSuksesiKK', () => {
  it('tidak melakukan apa pun jika yang meninggal BUKAN Kepala Keluarga', async () => {
    await jalankanSuksesiKK(mockDb, {
      pendudukId: 'anak-1',
      hubunganKeluarga: 'Anak',
      noKk: 'KK-001',
      allPenduduk: [buatPenduduk({ id: 'istri-1', hubungan_keluarga: 'Istri' })],
    })
    expect(updateDocMock).not.toHaveBeenCalled()
  })

  it('tidak melakukan apa pun jika noKk kosong (data tidak lengkap)', async () => {
    await jalankanSuksesiKK(mockDb, {
      pendudukId: 'kk-1',
      hubunganKeluarga: 'Kepala Keluarga',
      noKk: '',
      allPenduduk: [buatPenduduk({ id: 'istri-1', hubungan_keluarga: 'Istri' })],
    })
    expect(updateDocMock).not.toHaveBeenCalled()
  })

  it('memilih Istri sebagai pengganti pertama jika ada', async () => {
    const allPenduduk = [
      buatPenduduk({ id: 'istri-1', no_kk: 'KK-001', hubungan_keluarga: 'Istri' }),
      buatPenduduk({ id: 'anak-1', no_kk: 'KK-001', hubungan_keluarga: 'Anak' }),
    ]
    await jalankanSuksesiKK(mockDb, {
      pendudukId: 'kk-mati',
      hubunganKeluarga: 'Kepala Keluarga',
      noKk: 'KK-001',
      allPenduduk,
    })
    expect(updateDocMock).toHaveBeenCalledTimes(1)
    const [ref, data] = updateDocMock.mock.calls[0]
    expect(ref.__id).toBe('istri-1')
    expect(data.hubungan_keluarga).toBe('Kepala Keluarga')
    expect(data.hub_asli_backup).toBe('Istri')
  })

  it('TIDAK PERNAH mencoba mencocokkan "Suami" — regression test untuk bug ditemukan lewat testing (Suami bukan HubunganKeluarga valid, dead code di versi lama)', async () => {
    // 'Suami' bukan bagian dari HUBUNGAN_KELUARGA type sama sekali — tidak
    // ada cara operator membuat data dengan nilai ini lewat form manapun.
    // Test ini memastikan fallback ke Anak tetap benar meski TIDAK ada
    // Istri, tanpa asumsi 'Suami' yang secara struktural mustahil terjadi.
    const allPenduduk = [
      buatPenduduk({ id: 'anak-1', no_kk: 'KK-010', hubungan_keluarga: 'Anak', tanggal_lahir: '1998-01-01' }),
    ]
    await jalankanSuksesiKK(mockDb, {
      pendudukId: 'kk-mati',
      hubunganKeluarga: 'Kepala Keluarga',
      noKk: 'KK-010',
      allPenduduk,
    })
    const [ref, data] = updateDocMock.mock.calls[0]
    expect(ref.__id).toBe('anak-1')
    expect(data.hub_asli_backup).toBe('Anak')
  })

  it('memilih Anak TERTUA jika tidak ada Istri maupun Suami (urut berdasarkan tanggal_lahir)', async () => {
    const allPenduduk = [
      buatPenduduk({ id: 'anak-muda', no_kk: 'KK-003', hubungan_keluarga: 'Anak', tanggal_lahir: '2010-05-05' }),
      buatPenduduk({ id: 'anak-tua', no_kk: 'KK-003', hubungan_keluarga: 'Anak', tanggal_lahir: '1995-01-01' }),
      buatPenduduk({ id: 'anak-tengah', no_kk: 'KK-003', hubungan_keluarga: 'Anak', tanggal_lahir: '2002-03-03' }),
    ]
    await jalankanSuksesiKK(mockDb, {
      pendudukId: 'kk-mati',
      hubunganKeluarga: 'Kepala Keluarga',
      noKk: 'KK-003',
      allPenduduk,
    })
    const [ref] = updateDocMock.mock.calls[0]
    expect(ref.__id).toBe('anak-tua')
  })

  it('TIDAK menulis apa pun jika tidak ada kandidat pengganti sama sekali', async () => {
    const allPenduduk = [
      buatPenduduk({ id: 'famili-1', no_kk: 'KK-004', hubungan_keluarga: 'Famili Lain' }),
    ]
    await jalankanSuksesiKK(mockDb, {
      pendudukId: 'kk-mati',
      hubunganKeluarga: 'Kepala Keluarga',
      noKk: 'KK-004',
      allPenduduk,
    })
    expect(updateDocMock).not.toHaveBeenCalled()
  })

  it('mengabaikan anggota dari KK LAIN meski hubungan_keluarga cocok (isolasi antar keluarga)', async () => {
    const allPenduduk = [
      buatPenduduk({ id: 'istri-kk-lain', no_kk: 'KK-BEDA', hubungan_keluarga: 'Istri' }),
    ]
    await jalankanSuksesiKK(mockDb, {
      pendudukId: 'kk-mati',
      hubunganKeluarga: 'Kepala Keluarga',
      noKk: 'KK-005',
      allPenduduk,
    })
    expect(updateDocMock).not.toHaveBeenCalled()
  })

  it('mengabaikan anggota berstatus TIDAK aktif (mis. sudah meninggal duluan atau mutasi keluar)', async () => {
    const allPenduduk = [
      buatPenduduk({ id: 'istri-nonaktif', no_kk: 'KK-006', hubungan_keluarga: 'Istri', status: 'meninggal' }),
      buatPenduduk({ id: 'anak-aktif', no_kk: 'KK-006', hubungan_keluarga: 'Anak', status: 'aktif' }),
    ]
    await jalankanSuksesiKK(mockDb, {
      pendudukId: 'kk-mati',
      hubunganKeluarga: 'Kepala Keluarga',
      noKk: 'KK-006',
      allPenduduk,
    })
    const [ref] = updateDocMock.mock.calls[0]
    expect(ref.__id).toBe('anak-aktif')
  })
})

describe('kembalikanSuksesiKK (rollback)', () => {
  it('query difilter dengan no_kk yang benar (fix bug: dulu tidak difilter, berisiko salah sasaran lintas KK)', async () => {
    getDocsMock.mockResolvedValue({ docs: [] })
    await kembalikanSuksesiKK(mockDb, { noKk: 'KK-007', nikYangDikembalikan: 'nik-target' })
    expect(getDocsMock).toHaveBeenCalledTimes(1)
    // Verifikasi query benar-benar dibentuk dengan where no_kk == 'KK-007'
    const queryArgs = getDocsMock.mock.calls[0][0]
    const whereClauses = JSON.stringify(queryArgs)
    expect(whereClauses).toContain('KK-007')
  })

  it('mengembalikan hubungan_keluarga asli dan menghapus hub_asli_backup', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        { id: 'istri-1', data: () => ({ hub_asli_backup: 'Istri', hubungan_keluarga: 'Kepala Keluarga' }) },
      ],
    })
    await kembalikanSuksesiKK(mockDb, { noKk: 'KK-008', nikYangDikembalikan: 'kk-asli-yang-hidup-lagi' })
    expect(updateDocMock).toHaveBeenCalledTimes(1)
    const [ref, data] = updateDocMock.mock.calls[0]
    expect(ref.__id).toBe('istri-1')
    expect(data.hubungan_keluarga).toBe('Istri')
    expect(data.hub_asli_backup).toBeNull()
  })

  it('melewati dokumen milik orang yang baru dikembalikan sendiri (tidak salah timpa dirinya sendiri)', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        { id: 'kk-yang-hidup-lagi', data: () => ({ hub_asli_backup: null, hubungan_keluarga: 'Kepala Keluarga' }) },
      ],
    })
    await kembalikanSuksesiKK(mockDb, { noKk: 'KK-009', nikYangDikembalikan: 'kk-yang-hidup-lagi' })
    expect(updateDocMock).not.toHaveBeenCalled()
  })

  it('tidak melakukan apa pun jika noKk kosong', async () => {
    await kembalikanSuksesiKK(mockDb, { noKk: '', nikYangDikembalikan: 'x' })
    expect(getDocsMock).not.toHaveBeenCalled()
  })
})
