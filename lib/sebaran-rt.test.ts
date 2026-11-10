import { describe, it, expect } from 'vitest'
import { sebaranPerRt, kelompokRt, kelompokDusun } from '@/lib/sebaran-rt'
import { daftarRt, dusunDariRt, type DusunItem } from '@/lib/dusun'
import { rt3 } from '@/lib/rt-rw'

const L = 'Laki-laki'
const P = 'Perempuan'
const PETA: DusunItem[] = [
  { nama: 'Pesanggrahan', rt: ['001', '002', '003', '007'] },
  { nama: 'Paleran', rt: ['004', '005', '006'] },
  { nama: 'Sumber', rt: ['008'] },
]

describe('sebaranPerRt — data lama dan baru menyatu', () => {
  it('"1", "01", "001", dan angka 1 satu kelompok "001"', () => {
    const hasil = sebaranPerRt([
      { rt: '1', jenis_kelamin: L }, { rt: '01', jenis_kelamin: P }, { rt: '001', jenis_kelamin: L }, { rt: 1, jenis_kelamin: P },
    ])
    expect(Object.keys(hasil)).toEqual(['001'])
    expect(hasil['001']).toEqual({ laki: 2, perempuan: 2 })
  })
  it('RT kosong → kunci yang diminta (bawaan "" untuk Monografi, "—" untuk Beranda)', () => {
    const rows = [{ rt: '', jenis_kelamin: L }, { rt: null, jenis_kelamin: P }, { jenis_kelamin: P }]
    expect(sebaranPerRt(rows)).toEqual({ '': { laki: 1, perempuan: 2 } })
    expect(sebaranPerRt(rows, '—')).toEqual({ '—': { laki: 1, perempuan: 2 } })
  })
  it('selain "Laki-laki" dihitung perempuan; "Lain-lain" apa adanya', () => {
    expect(sebaranPerRt([{ rt: 'Lain-lain', jenis_kelamin: 'x' }, { rt: 'Lain-lain', jenis_kelamin: undefined }])).toEqual({ 'Lain-lain': { laki: 0, perempuan: 2 } })
  })
})

describe('kelompokRt — Sebaran per RT di Beranda', () => {
  const rtResmi = daftarRt(PETA)
  it('semua RT resmi tampil berurutan walau 0; data "4" dan "004" menyatu', () => {
    const hasil = kelompokRt([{ rt: '4', jenis_kelamin: L }, { rt: '004', jenis_kelamin: P }, { rt: '01', jenis_kelamin: L }], rtResmi)
    expect(hasil.map((b) => b.rt)).toEqual(['001', '002', '003', '004', '005', '006', '007', '008'])
    expect(hasil.find((b) => b.rt === '004')).toEqual({ rt: '004', laki: 1, perempuan: 1, jumlah: 2 })
    expect(hasil.find((b) => b.rt === '001')?.jumlah).toBe(1)
    expect(hasil.find((b) => b.rt === '002')?.jumlah).toBe(0)
  })
  it('RT di luar daftar dan RT kosong masuk "Lain-lain" (paling akhir); tanpa itu baris Lain-lain tidak ada', () => {
    const tanpa = kelompokRt([{ rt: '001', jenis_kelamin: L }], rtResmi)
    expect(tanpa.some((b) => b.rt === 'Lain-lain')).toBe(false)
    const dengan = kelompokRt([{ rt: '001', jenis_kelamin: L }, { rt: '099', jenis_kelamin: L }, { rt: '', jenis_kelamin: P }, { rt: 'x', jenis_kelamin: P }], rtResmi)
    expect(dengan.at(-1)).toEqual({ rt: 'Lain-lain', laki: 1, perempuan: 2, jumlah: 3 })
  })
  it('RT mengikuti Pengaturan: RT yang dihapus dari pengaturan pindah ke Lain-lain', () => {
    const hasil = kelompokRt([{ rt: '007', jenis_kelamin: L }], ['001', '002'])
    expect(hasil.map((b) => b.rt)).toEqual(['001', '002', 'Lain-lain'])
    expect(hasil.at(-1)?.jumlah).toBe(1)
  })
  it('jumlah semua baris = jumlah penduduk', () => {
    const rows = ['1', '01', '002', '5', '', '099', 'x', '008'].map((rt, i) => ({ rt, jenis_kelamin: i % 2 ? L : P }))
    expect(kelompokRt(rows, rtResmi).reduce((s, b) => s + b.jumlah, 0)).toBe(rows.length)
  })
})

describe('kelompokDusun — Sebaran per dusun di Beranda', () => {
  it('urutan dusun mengikuti Pengaturan (walau 0); RT "1" dan "001" masuk dusun yang sama', () => {
    const hasil = kelompokDusun([{ rt: '1', jenis_kelamin: L }, { rt: '001', jenis_kelamin: P }, { rt: '6', jenis_kelamin: L }], PETA)
    expect(hasil).toEqual([
      { dusun: 'Pesanggrahan', laki: 1, perempuan: 1, jumlah: 2 },
      { dusun: 'Paleran', laki: 1, perempuan: 0, jumlah: 1 },
      { dusun: 'Sumber', laki: 0, perempuan: 0, jumlah: 0 },
    ])
  })
  it('RT yang belum masuk dusun mana pun dan RT kosong → "Lain-lain" di akhir', () => {
    const hasil = kelompokDusun([{ rt: '099', jenis_kelamin: L }, { rt: '', jenis_kelamin: P }, { rt: '008', jenis_kelamin: P }], PETA)
    expect(hasil.map((b) => b.dusun)).toEqual(['Pesanggrahan', 'Paleran', 'Sumber', 'Lain-lain'])
    expect(hasil.at(-1)).toEqual({ dusun: 'Lain-lain', laki: 1, perempuan: 1, jumlah: 2 })
    expect(hasil.find((b) => b.dusun === 'Sumber')?.jumlah).toBe(1)
  })
  it('pemetaan baru dari Pengaturan langsung dipakai (RT dipindah antardusun)', () => {
    const peta: DusunItem[] = [{ nama: 'A', rt: ['001'] }, { nama: 'B', rt: ['002', '003'] }]
    const hasil = kelompokDusun([{ rt: '3', jenis_kelamin: L }, { rt: '1', jenis_kelamin: L }], peta)
    expect(hasil.map((b) => [b.dusun, b.jumlah])).toEqual([['A', 1], ['B', 1]])
  })
})

// Penjaga "tidak ada perubahan perilaku": salinan logika lama yang tertanam di useDashboard sebelum diekstrak,
// dibandingkan dengan fungsi baru pada data acak (benih tetap).
function lamaDashboard(rows: { rt?: string | number | null; jenis_kelamin?: string }[], petaDusun: DusunItem[]) {
  const byRT: Record<string, { laki: number; perempuan: number }> = {}
  for (const r of rows) {
    const key = rt3(r.rt) || '—'
    if (!byRT[key]) byRT[key] = { laki: 0, perempuan: 0 }
    if (r.jenis_kelamin === 'Laki-laki') byRT[key].laki++
    else byRT[key].perempuan++
  }
  const RT_VALID = daftarRt(petaDusun)
  const rtData = RT_VALID.map((rt) => ({ rt, laki: byRT[rt]?.laki ?? 0, perempuan: byRT[rt]?.perempuan ?? 0, jumlah: (byRT[rt]?.laki ?? 0) + (byRT[rt]?.perempuan ?? 0) }))
  const lainLaki = Object.entries(byRT).filter(([rt]) => !RT_VALID.includes(rt)).reduce((s, [, v]) => s + v.laki, 0)
  const lainPerempuan = Object.entries(byRT).filter(([rt]) => !RT_VALID.includes(rt)).reduce((s, [, v]) => s + v.perempuan, 0)
  if (lainLaki + lainPerempuan > 0) rtData.push({ rt: 'Lain-lain', laki: lainLaki, perempuan: lainPerempuan, jumlah: lainLaki + lainPerempuan })
  const DUSUN_ORDER = petaDusun.map((d) => d.nama)
  const byDusun: Record<string, { laki: number; perempuan: number }> = {}
  for (const r of rows) {
    const dusun = dusunDariRt(rt3(r.rt), petaDusun) || 'Lain-lain'
    if (!byDusun[dusun]) byDusun[dusun] = { laki: 0, perempuan: 0 }
    if (r.jenis_kelamin === 'Laki-laki') byDusun[dusun].laki++
    else byDusun[dusun].perempuan++
  }
  const dusunData = [...DUSUN_ORDER, ...(byDusun['Lain-lain'] ? ['Lain-lain'] : [])].map((dusun) => ({
    dusun, laki: byDusun[dusun]?.laki ?? 0, perempuan: byDusun[dusun]?.perempuan ?? 0, jumlah: (byDusun[dusun]?.laki ?? 0) + (byDusun[dusun]?.perempuan ?? 0),
  }))
  return { rtData, dusunData }
}

describe('hasil sama persis dengan logika lama di hook (data acak)', () => {
  it('500 baris campuran bentuk RT', () => {
    let seed = 20261102
    const acak = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
    const bentuk = ['1', '01', '001', '2', '002', '3', '4', '004', '5', '6', '7', '8', '09', '099', '', 'x', 'Lain-lain']
    const rows = Array.from({ length: 500 }, () => {
      const rt: string | number | null | undefined = (() => { const b = bentuk[Math.floor(acak() * bentuk.length)]; const t = acak(); return t < 0.1 ? Number(b) || b : t < 0.15 ? null : b })()
      return { rt, jenis_kelamin: acak() < 0.5 ? L : acak() < 0.9 ? P : undefined }
    })
    for (const peta of [PETA, [{ nama: 'A', rt: ['001'] }, { nama: 'B', rt: ['002', '003'] }], []] as DusunItem[][]) {
      const lama = lamaDashboard(rows, peta)
      expect(kelompokRt(rows, daftarRt(peta))).toEqual(lama.rtData)
      expect(kelompokDusun(rows, peta)).toEqual(lama.dusunData)
    }
  })
})
