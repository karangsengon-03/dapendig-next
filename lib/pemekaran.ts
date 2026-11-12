/**
 * pemekaran.ts
 * Pemindahan penduduk antar RT/RW untuk pemekaran atau penataan wilayah (seluruh atau sebagian RT/RW).
 * Murni (tanpa Firebase). Satuan pemindahan adalah KELUARGA (No. KK): semua anggota aktif satu KK dipindah bersama.
 * Hanya penduduk aktif yang dipindah; riwayat penduduk tidak aktif (pindah/meninggal) dibiarkan apa adanya.
 */
import { rt3 } from '@/lib/rt-rw'

export interface PendudukWilayah {
  id: string
  nik: string
  nama_lengkap: string
  no_kk: string
  hubungan_keluarga?: string
  rt?: string | number | null
  rw?: string | number | null
  status?: string
}

export interface KeluargaRt {
  /** Kunci keluarga: No. KK (atau "id:<id>" bila No. KK kosong). */
  kunci: string
  noKk: string
  kepala: string
  jumlah: number
  rw: string
}

export interface ItemPindah {
  id: string
  nik: string
  nama: string
  rtLama: string
  rwLama: string
  rtBaru: string
  rwBaru: string
}

export interface ParamPindah {
  rtAsal: string
  /** "" = semua RW di RT asal. */
  rwAsal: string
  /** null = semua keluarga yang cocok; selain itu hanya keluarga bertanda (kunci keluarga). */
  keluarga: ReadonlySet<string> | null
  /** "" = RT tidak berubah. */
  rtTujuan: string
  /** "" = RW tidak berubah. */
  rwTujuan: string
}

const kunciKeluarga = (p: PendudukWilayah) => (p.no_kk?.trim() ? p.no_kk.trim() : `id:${p.id}`)
const aktifDi = (p: PendudukWilayah, rtAsal: string, rwAsal: string) =>
  p.status === 'aktif' && rt3(p.rt) === rt3(rtAsal) && (!rwAsal || rt3(p.rw) === rt3(rwAsal))

/** Keluarga (penduduk aktif) di RT asal, opsional dibatasi satu RW; terurut menurut nama kepala keluarga. */
export function keluargaDiRt(rows: readonly PendudukWilayah[], rtAsal: string, rwAsal = ''): KeluargaRt[] {
  const peta = new Map<string, { anggota: PendudukWilayah[] }>()
  for (const p of rows) {
    if (!aktifDi(p, rtAsal, rwAsal)) continue
    const k = kunciKeluarga(p)
    if (!peta.has(k)) peta.set(k, { anggota: [] })
    peta.get(k)!.anggota.push(p)
  }
  return [...peta.entries()]
    .map(([kunci, { anggota }]) => {
      const kepala = anggota.find((a) => a.hubungan_keluarga === 'Kepala Keluarga') ?? anggota[0]
      return { kunci, noKk: anggota[0].no_kk ?? '', kepala: kepala.nama_lengkap, jumlah: anggota.length, rw: rt3(kepala.rw) }
    })
    .sort((a, b) => a.kepala.localeCompare(b.kepala, 'id'))
}

/** Pesan galat untuk isian tujuan, atau undefined bila sah. */
export function validasiPemindahan(p: Pick<ParamPindah, 'rtAsal' | 'rwAsal' | 'rtTujuan' | 'rwTujuan'>): string | undefined {
  const sah = (v: string) => /^\d{1,3}$/.test(v.trim())
  if (!p.rtAsal) return 'Pilih RT asal'
  if (p.rtTujuan.trim() === '' && p.rwTujuan.trim() === '') return 'Isi RT tujuan, RW tujuan, atau keduanya'
  if (p.rtTujuan.trim() !== '' && !sah(p.rtTujuan)) return `RT tujuan "${p.rtTujuan}" tidak valid (angka 0–999)`
  if (p.rwTujuan.trim() !== '' && !sah(p.rwTujuan)) return `RW tujuan "${p.rwTujuan}" tidak valid (angka 0–999)`
  return undefined
}

/** Daftar perubahan yang akan ditulis; hanya penduduk yang RT/RW-nya benar-benar berubah. */
export function rencanaPemindahan(rows: readonly PendudukWilayah[], p: ParamPindah): ItemPindah[] {
  const hasil: ItemPindah[] = []
  for (const r of rows) {
    if (!aktifDi(r, p.rtAsal, p.rwAsal)) continue
    if (p.keluarga && !p.keluarga.has(kunciKeluarga(r))) continue
    const rtLama = rt3(r.rt)
    const rwLama = rt3(r.rw)
    const rtBaru = p.rtTujuan.trim() === '' ? rtLama : rt3(p.rtTujuan)
    const rwBaru = p.rwTujuan.trim() === '' ? rwLama : rt3(p.rwTujuan)
    if (rtBaru === rtLama && rwBaru === rwLama) continue
    hasil.push({ id: r.id, nik: r.nik || r.id, nama: r.nama_lengkap, rtLama, rwLama, rtBaru, rwBaru })
  }
  return hasil
}

/** "RT 005 → 012; RW 002 → 004" (hanya bagian yang berubah). */
export function ringkasItemPindah(i: Pick<ItemPindah, 'rtLama' | 'rwLama' | 'rtBaru' | 'rwBaru'>): string {
  const bagian: string[] = []
  if (i.rtLama !== i.rtBaru) bagian.push(`RT ${i.rtLama || '—'} → ${i.rtBaru}`)
  if (i.rwLama !== i.rwBaru) bagian.push(`RW ${i.rwLama || '—'} → ${i.rwBaru}`)
  return bagian.join('; ')
}
