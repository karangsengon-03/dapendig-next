'use client'

import { useMutation } from '@tanstack/react-query'
import {
  collection, addDoc, updateDoc, getDocs,
  query, where, doc, serverTimestamp, writeBatch,
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
    // Normalisasi SLTP/SLTA → SMP/SMA otomatis saat import
    if (v.toUpperCase() === 'SLTP/SEDERAJAT') return 'SMP/Sederajat'
    if (v.toUpperCase() === 'SLTA/SEDERAJAT') return 'SMA/Sederajat'
    const match = (PENDIDIKAN as readonly string[]).find(p => p.toLowerCase() === v.toLowerCase())
    return match ?? v
  }

  if (key === 'pekerjaan') {
    // Normalisasi format SIAK uppercase → Title Case
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
  if (key === 'id') return v  // akan dipakai sebagai referensi, tidak disimpan sebagai field

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

      // Batch write untuk efisiensi
      let batch = writeBatch(db)
      let batchCount = 0

      for (const row of rows) {
        const firestoreId = String(row.id ?? '').trim()
        const nik = String(row.nik ?? '').trim()
        const nama = String(row.nama_lengkap ?? '').trim()

        if (!nik && !nama) continue

        try {
          // Bangun objek data — skip field 'id' (itu referensi dokumen, bukan field data)
          const data: Record<string, unknown> = {
            updated_at: serverTimestamp(),
            updated_by: email,
          }
          for (const [k, v] of Object.entries(row)) {
            if (k === 'id') continue  // skip ID dokumen
            data[k] = normImportVal(k, v)
          }
          if (!data.status) data.status = 'aktif'

          if (firestoreId) {
            // Ada ID dokumen — langsung update dokumen tersebut
            batch.update(doc(db, 'penduduk', firestoreId), data)
            diperbarui++
          } else if (nik) {
            // Tidak ada ID — cari berdasarkan NIK
            const snap = await getDocs(query(collection(db, 'penduduk'), where('nik', '==', nik)))
            if (!snap.empty) {
              // NIK ditemukan — update dokumen yang ada
              batch.update(snap.docs[0].ref, data)
              diperbarui++
            } else {
              // NIK baru — tambah dokumen baru
              data.created_at = serverTimestamp()
              data.created_by = email
              // addDoc tidak bisa di batch — commit batch dulu lalu addDoc
              if (batchCount > 0) {
                await batch.commit()
                batch = writeBatch(db)
                batchCount = 0
              }
              await addDoc(collection(db, 'penduduk'), data)
              berhasil++
              continue
            }
          } else {
            // Tidak ada ID dan tidak ada NIK — tambah baru
            data.created_at = serverTimestamp()
            data.created_by = email
            if (batchCount > 0) {
              await batch.commit()
              batch = writeBatch(db)
              batchCount = 0
            }
            await addDoc(collection(db, 'penduduk'), data)
            berhasil++
            continue
          }

          batchCount++
          if (batchCount >= 499) {
            await batch.commit()
            batch = writeBatch(db)
            batchCount = 0
          }
        } catch {
          gagal++
        }
      }

      // Commit sisa batch
      if (batchCount > 0) await batch.commit()

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
