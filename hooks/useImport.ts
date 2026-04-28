'use client'

import { useMutation } from '@tanstack/react-query'
import {
  collection, addDoc, setDoc,
  doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { AGAMA, PENDIDIKAN, PEKERJAAN, HUBUNGAN_KELUARGA } from '@/lib/penduduk-constants'

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
    const match = (HUBUNGAN_KELUARGA as readonly string[]).find(h => h.toLowerCase() === v.toLowerCase())
    if (match) return match
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
    const match = (AGAMA as readonly string[]).find(a => a.toLowerCase() === v.toLowerCase())
    return match ?? v
  }

  if (key === 'pendidikan') {
    if (v.toUpperCase() === 'SLTP/SEDERAJAT') return 'SMP/Sederajat'
    if (v.toUpperCase() === 'SLTA/SEDERAJAT') return 'SMA/Sederajat'
    const match = (PENDIDIKAN as readonly string[]).find(p => p.toLowerCase() === v.toLowerCase())
    return match ?? v
  }

  if (key === 'pekerjaan') {
    const match = (PEKERJAAN as readonly string[]).find(p => p.toLowerCase() === v.toLowerCase())
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

  if (key === 'status') return v || 'aktif'
  if (key === 'id') return v  // referensi saja, tidak disimpan sebagai field

  return v
}

export function useImportPenduduk() {
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (rows: Record<string, unknown>[]): Promise<{ berhasil: number; diperbarui: number; gagal: number }> => {
      const email = user?.email ?? 'unknown'
      let berhasil = 0
      let diperbarui = 0
      let gagal = 0

      for (const row of rows) {
        // NIK adalah ID dokumen — wajib ada
        const nik = String(row.nik ?? row.NIK ?? '').trim()
        const nama = String(row.nama_lengkap ?? '').trim()

        if (!nik && !nama) continue
        if (!nik) { gagal++; continue }  // tanpa NIK tidak bisa disimpan

        try {
          // Bangun data — skip field 'id' (hanya referensi)
          const data: Record<string, unknown> = {
            updated_at: serverTimestamp(),
            updated_by: email,
          }
          for (const [k, v] of Object.entries(row)) {
            if (k === 'id' || k === 'ID') continue
            data[k] = normImportVal(k, v)
          }
          if (!data.status) data.status = 'aktif'
          data.nik = nik  // pastikan NIK tersimpan sebagai field juga

          // Cek apakah dokumen sudah ada
          const docRef = doc(db, 'penduduk', nik)
          const { getDoc } = await import('firebase/firestore')
          const existing = await getDoc(docRef)

          if (existing.exists()) {
            // Update — pakai setDoc dengan merge agar field lain tidak hilang
            await setDoc(docRef, data, { merge: true })
            diperbarui++
          } else {
            // Baru — tambah dengan NIK sebagai ID
            data.created_at = serverTimestamp()
            data.created_by = email
            await setDoc(docRef, data)
            berhasil++
          }
        } catch {
          gagal++
        }
      }

      // Log aktivitas
      await addDoc(collection(db, 'log'), {
        aksi: 'import_excel',
        keterangan: `Import Excel: ${berhasil} ditambah, ${diperbarui} diperbarui`,
        nik_target: '',
        oleh: email,
        ts: serverTimestamp(),
      })

      return { berhasil, diperbarui, gagal }
    },
  })
}
