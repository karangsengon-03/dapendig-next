/**
 * sebaran-rt.ts — pengelompokan penduduk per RT dan per dusun (fungsi murni, tanpa Firestore).
 * Dipakai Beranda (useDashboard) dan Monografi (useMonografi) supaya data lama ("1", "01") dan baru ("001") menyatu,
 * dan RT/dusun mengikuti Pengaturan → Dusun dan RT. Diekstrak dari kedua hook tanpa mengubah perilaku.
 */
import { rt3 } from '@/lib/rt-rw'
import { dusunDariRt, type DusunItem } from '@/lib/dusun'

export interface SebaranJk { laki: number; perempuan: number }
export interface BarisRt extends SebaranJk { rt: string; jumlah: number }
export interface BarisDusun extends SebaranJk { dusun: string; jumlah: number }

interface BarisPenduduk { rt?: string | number | null; jenis_kelamin?: string | null }

// Selain "Laki-laki" dihitung perempuan (sama dengan perilaku lama).
const tambah = (s: SebaranJk, jk: string | null | undefined) => { if (jk === 'Laki-laki') s.laki++; else s.perempuan++ }

/**
 * Jumlah L/P per RT 3 digit. RT kosong dikelompokkan di `kunciKosong`
 * ("000" di Beranda; "" di Monografi, sesuai perilaku masing-masing sebelum diekstrak).
 */
export function sebaranPerRt(rows: readonly BarisPenduduk[], kunciKosong = ''): Record<string, SebaranJk> {
  const hasil: Record<string, SebaranJk> = {}
  for (const r of rows) {
    const kunci = rt3(r.rt) || kunciKosong
    if (!hasil[kunci]) hasil[kunci] = { laki: 0, perempuan: 0 }
    tambah(hasil[kunci], r.jenis_kelamin)
  }
  return hasil
}

/** Baris Beranda "Sebaran per RT": semua RT resmi (walau 0), lalu "Lain-lain" bila ada RT di luar daftar (termasuk RT kosong). */
export function kelompokRt(rows: readonly BarisPenduduk[], rtResmi: readonly string[]): BarisRt[] {
  const byRT = sebaranPerRt(rows, '000')
  const hasil: BarisRt[] = rtResmi.map((rt) => ({
    rt,
    laki: byRT[rt]?.laki ?? 0,
    perempuan: byRT[rt]?.perempuan ?? 0,
    jumlah: (byRT[rt]?.laki ?? 0) + (byRT[rt]?.perempuan ?? 0),
  }))
  const luar = Object.entries(byRT).filter(([rt]) => !rtResmi.includes(rt))
  const lainLaki = luar.reduce((s, [, v]) => s + v.laki, 0)
  const lainPerempuan = luar.reduce((s, [, v]) => s + v.perempuan, 0)
  if (lainLaki + lainPerempuan > 0) {
    hasil.push({ rt: 'Lain-lain', laki: lainLaki, perempuan: lainPerempuan, jumlah: lainLaki + lainPerempuan })
  }
  return hasil
}

/** Baris Beranda "Sebaran per dusun": urutan dusun dari Pengaturan (walau 0), lalu "Lain-lain" bila ada RT yang belum masuk dusun mana pun. */
export function kelompokDusun(rows: readonly BarisPenduduk[], petaDusun: readonly DusunItem[]): BarisDusun[] {
  const byDusun: Record<string, SebaranJk> = {}
  for (const r of rows) {
    const dusun = dusunDariRt(rt3(r.rt), petaDusun) || 'Lain-lain'
    if (!byDusun[dusun]) byDusun[dusun] = { laki: 0, perempuan: 0 }
    tambah(byDusun[dusun], r.jenis_kelamin)
  }
  return [...petaDusun.map((d) => d.nama), ...(byDusun['Lain-lain'] ? ['Lain-lain'] : [])].map((dusun) => ({
    dusun,
    laki: byDusun[dusun]?.laki ?? 0,
    perempuan: byDusun[dusun]?.perempuan ?? 0,
    jumlah: (byDusun[dusun]?.laki ?? 0) + (byDusun[dusun]?.perempuan ?? 0),
  }))
}
