import { describe, it, expect } from 'vitest'
import { OPSI_FILTER_AKSI, cocokAksi, infoBatasLog, BATAS_MUAT_LOG } from '@/lib/log-aksi'

describe('OPSI_FILTER_AKSI — hanya aksi yang nyata ditulis hook', () => {
  it('memuat tepat aksi nyata (hapus_permanen digabung ke "Hapus")', () => {
    expect(OPSI_FILTER_AKSI.map((o) => o.value)).toEqual([
      '', 'tambah', 'edit', 'hapus', 'restore', 'rollback', 'meninggal', 'mutasi_keluar', 'normalisasi', 'import_excel', 'edit_wilayah',
    ])
  })

  it('tidak lagi memuat opsi lama yang tak pernah cocok ("Catat", "Pindah")', () => {
    const nilai = OPSI_FILTER_AKSI.map((o) => o.value)
    expect(nilai).not.toContain('Catat')
    expect(nilai).not.toContain('Pindah')
  })

  it('semua opsi berlabel dan nilai unik', () => {
    expect(OPSI_FILTER_AKSI.every((o) => o.label.length > 0)).toBe(true)
    expect(new Set(OPSI_FILTER_AKSI.map((o) => o.value)).size).toBe(OPSI_FILTER_AKSI.length)
  })
})

describe('cocokAksi — pencocokan eksak', () => {
  it('filter kosong cocok dengan apa pun', () => {
    expect(cocokAksi('tambah', '')).toBe(true)
    expect(cocokAksi(undefined, '')).toBe(true)
  })

  it('mutasi_keluar ditemukan oleh opsi "Mutasi keluar" (substring "Pindah" lama tidak menemukannya)', () => {
    expect('mutasi_keluar'.includes('pindah')).toBe(false) // perilaku lama
    expect(cocokAksi('mutasi_keluar', 'mutasi_keluar')).toBe(true)
  })

  it('eksak, bukan substring: "edit" tidak cocok dengan "edit_wilayah"; "hapus" tidak cocok dengan "tambah"', () => {
    expect(cocokAksi('edit_wilayah', 'edit')).toBe(false)
    expect(cocokAksi('edit', 'edit')).toBe(true)
    expect(cocokAksi('tambah', 'hapus')).toBe(false)
  })

  it('opsi "Hapus" mencakup hapus dan hapus_permanen', () => {
    expect(cocokAksi('hapus', 'hapus')).toBe(true)
    expect(cocokAksi('hapus_permanen', 'hapus')).toBe(true)
    expect(cocokAksi('restore', 'hapus')).toBe(false)
  })

  it('entri lama berhuruf besar tetap cocok', () => {
    expect(cocokAksi('Tambah', 'tambah')).toBe(true)
    expect(cocokAksi('Hapus', 'hapus')).toBe(true)
    expect(cocokAksi(' Tambah ', 'tambah')).toBe(true)
  })

  it('aksi kosong tidak cocok dengan filter terpilih', () => {
    expect(cocokAksi(undefined, 'tambah')).toBe(false)
    expect(cocokAksi('', 'tambah')).toBe(false)
  })
})

describe('infoBatasLog', () => {
  it('di bawah batas → tidak terpotong', () => {
    expect(infoBatasLog(BATAS_MUAT_LOG - 1, '2026-01-01', '2026-09-01')).toEqual({ terpotong: false, mulaiSebelumTertua: false })
    expect(infoBatasLog(0, '', null)).toEqual({ terpotong: false, mulaiSebelumTertua: false })
  })

  it('tepat batas → terpotong', () => {
    expect(infoBatasLog(BATAS_MUAT_LOG, '2026-10-14', '2026-09-01')).toEqual({ terpotong: true, mulaiSebelumTertua: false })
  })

  it('rentang dimulai sebelum entri tertua yang dimuat → ditandai', () => {
    expect(infoBatasLog(BATAS_MUAT_LOG, '2026-08-01', '2026-09-01').mulaiSebelumTertua).toBe(true)
  })

  it('rentang dimulai tepat pada atau sesudah entri tertua → tidak ditandai', () => {
    expect(infoBatasLog(BATAS_MUAT_LOG, '2026-09-01', '2026-09-01').mulaiSebelumTertua).toBe(false)
    expect(infoBatasLog(BATAS_MUAT_LOG, '2026-09-02', '2026-09-01').mulaiSebelumTertua).toBe(false)
  })

  it('tanpa tanggal awal atau tanpa entri → tidak ditandai (tetap terpotong bila jumlah mencapai batas)', () => {
    expect(infoBatasLog(BATAS_MUAT_LOG, '', '2026-09-01')).toEqual({ terpotong: true, mulaiSebelumTertua: false })
    expect(infoBatasLog(BATAS_MUAT_LOG, '2026-08-01', null)).toEqual({ terpotong: true, mulaiSebelumTertua: false })
  })
})
