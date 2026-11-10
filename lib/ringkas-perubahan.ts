/**
 * ringkas-perubahan.ts
 * Ringkasan perubahan data penduduk untuk keterangan Log/Riwayat, mis. "RT 000 → 003; RW 000 → 001".
 * Murni (tanpa Firebase). RT/RW dibandingkan sebagai 3 digit ("0" sama dengan "000").
 */
import { rt3 } from '@/lib/rt-rw'

const LABEL: Record<string, string> = {
  nama_lengkap: 'Nama', nik: 'NIK', no_kk: 'No. KK', hubungan_keluarga: 'Hubungan',
  nama_ayah: 'Nama ayah', nama_ibu: 'Nama ibu', jenis_kelamin: 'Jenis kelamin',
  tempat_lahir: 'Tempat lahir', tanggal_lahir: 'Tanggal lahir', agama: 'Agama',
  golongan_darah: 'Gol. darah', pendidikan: 'Pendidikan', pekerjaan: 'Pekerjaan',
  status_perkawinan: 'Status perkawinan', rt: 'RT', rw: 'RW', alamat: 'Alamat', status: 'Status',
}

const BATAS = 240

function nilai(k: string, v: unknown): string {
  if (k === 'rt' || k === 'rw') return rt3(v as string | number | null | undefined) || '—'
  const s = String(v ?? '').trim()
  return s || '—'
}

export function ringkasPerubahan(lama: Record<string, unknown> | undefined, baru: Record<string, unknown>): string {
  if (!lama) return ''
  const hasil: string[] = []
  for (const k of Object.keys(LABEL)) {
    if (!(k in baru)) continue
    const a = nilai(k, lama[k])
    const b = nilai(k, baru[k])
    if (a !== b) hasil.push(`${LABEL[k]} ${a} → ${b}`)
  }
  const teks = hasil.join('; ')
  return teks.length > BATAS ? `${teks.slice(0, BATAS - 1)}…` : teks
}
