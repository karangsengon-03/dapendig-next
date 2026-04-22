'use client'

import { useMutation } from '@tanstack/react-query'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { AGAMA, PENDIDIKAN, PEKERJAAN, HUBUNGAN_KELUARGA } from '@/lib/penduduk-constants'

const LOG_COL = 'log'

function normImportVal(key: string, rawValue: unknown): unknown {
  const v = String(rawValue ?? '').trim()

  if (key === 'hubungan_keluarga') {
    const up = v.toUpperCase()
    if (up === 'KEPALA KELUARGA' || up === 'KK') return 'Kepala Keluarga'
    if (up === 'ISTRI') return 'Istri'
    if (up === 'SUAMI') return 'Suami'
    if (up === 'ANAK') return 'Anak'
    if (up === 'ORANG TUA' || up === 'IBU' || up === 'BAPAK') return 'Orang Tua'
    if (up === 'MERTUA') return 'Mertua'
    if (up === 'CUCU') return 'Cucu'
    if (up === 'MENANTU') return 'Menantu'
    if (up === 'FAMILI LAIN') return 'Famili Lain'
    if (v) return 'Lainnya'
    return v
  }

  if (key === 'jenis_kelamin') {
    const up = v.toUpperCase()
    if (up === 'L' || up === 'LAKI' || up === 'LAKI-LAKI') return 'Laki-laki'
    if (up === 'P' || up === 'PR' || up === 'PEREMPUAN') return 'Perempuan'
    return v
  }

  if (key === 'agama') {
    const match = (AGAMA as readonly string[]).find((a) => a.toLowerCase() === v.toLowerCase())
    return match ?? v
  }

  if (key === 'pendidikan') {
    const match = (PENDIDIKAN as readonly string[]).find((p) => p.toLowerCase() === v.toLowerCase())
    return match ?? v
  }

  if (key === 'pekerjaan') {
    const match = (PEKERJAAN as readonly string[]).find((p) => p.toLowerCase() === v.toLowerCase())
    return match ?? v
  }

  if (key === 'status_perkawinan') {
    const up = v.toUpperCase()
    if (up === 'BELUM KAWIN' || up === 'BELUM MENIKAH') return 'Belum Kawin'
    if (up === 'KAWIN' || up === 'MENIKAH') return 'Kawin'
    if (up === 'CERAI HIDUP') return 'Cerai Hidup'
    if (up === 'CERAI MATI') return 'Cerai Mati'
    return v
  }

  if (key === 'status') {
    return v || 'aktif'
  }

  if (key === 'hubungan_keluarga' && v) {
    const match = (HUBUNGAN_KELUARGA as readonly string[]).find((h) => h.toLowerCase() === v.toLowerCase())
    return match ?? v
  }

  return v
}

export function useImportPenduduk() {
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (rows: Record<string, unknown>[]): Promise<{ berhasil: number; gagal: number }> => {
      const email = user?.email ?? 'unknown'
      let berhasil = 0
      let gagal = 0

      for (const row of rows) {
        const nik = String(row.nik ?? '').trim()
        const nama = String(row.nama_lengkap ?? '').trim()
        if (!nik && !nama) continue

        try {
          const doc: Record<string, unknown> = { status: 'aktif', created_at: serverTimestamp(), created_by: email }
          for (const [k, v] of Object.entries(row)) {
            doc[k] = normImportVal(k, v)
          }
          if (!doc.status) doc.status = 'aktif'
          await addDoc(collection(db, 'penduduk'), doc)
          berhasil++
        } catch {
          gagal++
        }
      }

      await addDoc(collection(db, LOG_COL), {
        aksi: 'import_excel',
        keterangan: `Import Excel: ${berhasil} data berhasil diimport`,
        nik_target: '',
        oleh: email,
        ts: serverTimestamp(),
      })

      return { berhasil, gagal }
    },
  })
}
