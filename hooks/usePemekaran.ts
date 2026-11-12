'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { tulisBertahap, type HasilTulis } from '@/lib/tulis-bertahap'
import { ringkasItemPindah, type ItemPindah } from '@/lib/pemekaran'

/**
 * Pemindahan massal RT/RW (pemekaran/penataan wilayah). Tiap penduduk: update rt/rw + satu entri log ber-nik_target
 * (muncul di Riwayat Detail), lalu satu entri ringkasan 'edit_wilayah'. Batch 200 penduduk (400 operasi) per commit;
 * bila satu batch ditolak, diulang per penduduk (lib/tulis-bertahap).
 */
export function useJalankanPemekaran() {
  const qc = useQueryClient()
  const email = useAuthStore((s) => s.user?.email ?? 'unknown')

  return useMutation({
    mutationFn: async (items: ItemPindah[]): Promise<HasilTulis<ItemPindah>> => {
      const log = (i: ItemPindah) => ({
        aksi: 'edit',
        keterangan: `Pemekaran wilayah: ${i.nama} — ${ringkasItemPindah(i)}`,
        nik_target: i.nik,
        oleh: email,
        ts: serverTimestamp(),
      })
      const hasil = await tulisBertahap(items, {
        ukuranBatch: 200,
        tulisBatch: async (kelompok) => {
          const batch = writeBatch(db)
          for (const i of kelompok) {
            batch.update(doc(db, 'penduduk', i.id), { rt: i.rtBaru, rw: i.rwBaru, updated_at: serverTimestamp() })
            batch.set(doc(collection(db, 'log')), log(i))
          }
          await batch.commit()
        },
        tulisSatu: async (i) => {
          await updateDoc(doc(db, 'penduduk', i.id), { rt: i.rtBaru, rw: i.rwBaru, updated_at: serverTimestamp() })
          await addDoc(collection(db, 'log'), log(i))
        },
      })
      if (hasil.berhasil.length > 0) {
        const a = hasil.berhasil[0]
        await addDoc(collection(db, 'log'), {
          aksi: 'edit_wilayah',
          nik_target: '',
          keterangan: `Pemekaran wilayah: ${hasil.berhasil.length} jiwa dipindah (${ringkasItemPindah(a)}${hasil.berhasil.some((x) => x.rtLama !== a.rtLama || x.rwLama !== a.rwLama) ? ', dari beberapa RT/RW asal' : ''})`,
          oleh: email,
          ts: serverTimestamp(),
        })
      }
      return hasil
    },
    onSuccess: () => {
      for (const kunci of ['penduduk', 'dashboard', 'monografi', 'log']) qc.invalidateQueries({ queryKey: [kunci] })
    },
  })
}
