/**
 * sebaran-rt.ts — pengelompokan penduduk per RT dan per dusun (fungsi murni, tanpa Firestore).
 * Dipakai Beranda (useDashboard) dan Monografi (useMonografi) supaya data lama ("1", "01") dan baru ("001") menyatu,
 * dan RT/dusun mengikuti Pengaturan → Dusun dan RT. Diekstrak dari kedua hook tanpa mengubah perilaku.
 */
import { rt3 } from '@/lib/rt-rw'
import { dusunDariRt, urutRt, NAMA_DUSUN_LAIN, type DusunItem } from '@/lib/dusun'

export interface SebaranJk { laki: number; perempuan: number }
export interface BarisRt extends SebaranJk { rt: string; jumlah: number; /** false = RT ada di data penduduk tetapi belum didaftarkan di Pengaturan. */ terdaftar: boolean }
export interface BarisDusun extends SebaranJk { dusun: string; jumlah: number; /** Hanya baris "Lain-lain": RT penduduk yang belum masuk dusun mana pun ("—" = RT belum diisi). */ rtLuar?: string[] }

/** Kunci baris untuk penduduk yang RT-nya kosong. */
export const KUNCI_RT_KOSONG = '—'

interface BarisPenduduk { rt?: string | number | null; jenis_kelamin?: string | null }

// Selain "Laki-laki" dihitung perempuan (sama dengan perilaku lama).
const tambah = (s: SebaranJk, jk: string | null | undefined) => { if (jk === 'Laki-laki') s.laki++; else s.perempuan++ }

/**
 * Jumlah L/P per RT 3 digit. RT kosong dikelompokkan di `kunciKosong`
 * ("—" di Beranda, agar tidak bentrok dengan RT 000 yang sah; "" di Monografi, sesuai perilaku masing-masing sebelum diekstrak).
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

/**
 * Baris Beranda "Sebaran per RT": SEMUA RT yang ada di data penduduk tampil apa adanya, ditambah RT terdaftar di Pengaturan walau 0 jiwa.
 * RT yang belum terdaftar ditandai `terdaftar: false`; RT kosong jadi satu baris "—" di akhir.
 */
export function kelompokRt(rows: readonly BarisPenduduk[], rtResmi: readonly string[]): BarisRt[] {
  const byRT = sebaranPerRt(rows, KUNCI_RT_KOSONG)
  const resmi = new Set(rtResmi)
  const semua = [...new Set([...rtResmi, ...Object.keys(byRT).filter((k) => k !== KUNCI_RT_KOSONG)])].sort(urutRt)
  if (byRT[KUNCI_RT_KOSONG]) semua.push(KUNCI_RT_KOSONG)
  return semua.map((rt) => ({
    rt,
    laki: byRT[rt]?.laki ?? 0,
    perempuan: byRT[rt]?.perempuan ?? 0,
    jumlah: (byRT[rt]?.laki ?? 0) + (byRT[rt]?.perempuan ?? 0),
    terdaftar: rt === KUNCI_RT_KOSONG ? false : resmi.has(rt),
  }))
}

/** Baris Beranda "Sebaran per dusun": urutan dusun dari Pengaturan (walau 0), lalu "Lain-lain" bila ada RT yang belum masuk dusun mana pun (daftar RT-nya ikut dicatat). */
export function kelompokDusun(rows: readonly BarisPenduduk[], petaDusun: readonly DusunItem[]): BarisDusun[] {
  const byDusun: Record<string, SebaranJk> = {}
  const rtLuar = new Set<string>()
  for (const r of rows) {
    const rt = rt3(r.rt)
    const dusun = dusunDariRt(rt, petaDusun)
    const kunci = dusun || NAMA_DUSUN_LAIN
    if (!dusun) rtLuar.add(rt || KUNCI_RT_KOSONG)
    if (!byDusun[kunci]) byDusun[kunci] = { laki: 0, perempuan: 0 }
    tambah(byDusun[kunci], r.jenis_kelamin)
  }
  const luarUrut = [...rtLuar].filter((r) => r !== KUNCI_RT_KOSONG).sort(urutRt)
  if (rtLuar.has(KUNCI_RT_KOSONG)) luarUrut.push(KUNCI_RT_KOSONG)
  return [...petaDusun.map((d) => d.nama), ...(byDusun[NAMA_DUSUN_LAIN] && !petaDusun.some((d) => d.nama === NAMA_DUSUN_LAIN) ? [NAMA_DUSUN_LAIN] : [])].map((dusun) => ({
    dusun,
    laki: byDusun[dusun]?.laki ?? 0,
    perempuan: byDusun[dusun]?.perempuan ?? 0,
    jumlah: (byDusun[dusun]?.laki ?? 0) + (byDusun[dusun]?.perempuan ?? 0),
    ...(dusun === NAMA_DUSUN_LAIN && !petaDusun.some((d) => d.nama === NAMA_DUSUN_LAIN) ? { rtLuar: luarUrut } : {}),
  }))
}
