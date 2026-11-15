'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { tulisBertahap, type HasilTulis } from '@/lib/tulis-bertahap'
import { rencanaKembalikan, ringkasItemPindah, type ItemPindah } from '@/lib/pemekaran'

/**
 * Pemindahan massal RT/RW (pemekaran/penataan wilayah) + pembatalannya, dengan skema seperti Tempat sampah:
 * sebelum menulis, keadaan semula disimpan sebagai satu dokumen `config/pemekaran-<waktu>` (admin saja, tanpa perubahan firestore.rules);
 * "Kembalikan" membalik perubahan lalu menghapus dokumen itu. Tiap penduduk: update rt/rw + satu entri log ber-nik_target
 * (muncul di Riwayat Detail), ditambah satu ringkasan 'edit_wilayah'. Batch 200 penduduk (400 operasi) per commit;
 * bila satu batch ditolak, diulang per penduduk (lib/tulis-bertahap).
 */

const CFG = 'config'
const LOG = 'log'

export interface RiwayatPemekaran {
  id: string
  jumlah: number
  ringkas: string
  oleh: string
  /** Detik epoch (Firestore Timestamp.seconds); 0 bila belum terbaca. */
  dibuatDetik: number
  items: ItemPindah[]
}

function useEmail() {
  return useAuthStore((s) => s.user?.email ?? 'unknown')
}

function tulisPerubahan(items: ItemPindah[], email: string, awalan: string) {
  const log = (i: ItemPindah) => ({
    aksi: 'edit',
    keterangan: `${awalan}: ${i.nama} — ${ringkasItemPindah(i)}`,
    nik_target: i.nik,
    oleh: email,
    ts: serverTimestamp(),
  })
  return tulisBertahap(items, {
    ukuranBatch: 200,
    tulisBatch: async (kelompok) => {
      const batch = writeBatch(db)
      for (const i of kelompok) {
        batch.update(doc(db, 'penduduk', i.id), { rt: i.rtBaru, rw: i.rwBaru, updated_at: serverTimestamp() })
        batch.set(doc(collection(db, LOG)), log(i))
      }
      await batch.commit()
    },
    tulisSatu: async (i) => {
      await updateDoc(doc(db, 'penduduk', i.id), { rt: i.rtBaru, rw: i.rwBaru, updated_at: serverTimestamp() })
      await addDoc(collection(db, LOG), log(i))
    },
  })
}

function invalidasi(qc: ReturnType<typeof useQueryClient>) {
  for (const kunci of ['penduduk', 'dashboard', 'monografi', 'log', 'pemekaran']) qc.invalidateQueries({ queryKey: [kunci] })
}

export function useJalankanPemekaran() {
  const qc = useQueryClient()
  const email = useEmail()

  return useMutation({
    mutationFn: async (items: ItemPindah[]): Promise<{ hasil: HasilTulis<ItemPindah>; idBatch: string | null }> => {
      // 1) Simpan keadaan semula DULU: bila gagal, tidak ada yang dipindah
      const idBatch = `pemekaran-${Date.now()}`
      const ref = doc(db, CFG, idBatch)
      const ringkas = ringkasItemPindah(items[0])
      await setDoc(ref, { jenis: 'pemekaran', ringkas, jumlah: items.length, oleh: email, dibuat_at: serverTimestamp(), items })
      // 2) Tulis perubahan
      const hasil = await tulisPerubahan(items, email, 'Pemekaran wilayah')
      // 3) Rapikan snapshot: hanya yang benar-benar dipindah yang bisa dikembalikan
      if (hasil.berhasil.length === 0) { await deleteDoc(ref); return { hasil, idBatch: null } }
      if (hasil.gagal.length > 0) await updateDoc(ref, { items: hasil.berhasil, jumlah: hasil.berhasil.length })
      await addDoc(collection(db, LOG), {
        aksi: 'edit_wilayah',
        keterangan: `Pemekaran wilayah: ${hasil.berhasil.length} jiwa dipindah (${ringkas}${hasil.berhasil.some((x) => x.rtLama !== items[0].rtLama || x.rwLama !== items[0].rwLama) ? ', dari beberapa RT/RW asal' : ''})`,
        nik_target: '',
        oleh: email,
        ts: serverTimestamp(),
      })
      return { hasil, idBatch }
    },
    onSuccess: () => invalidasi(qc),
  })
}

/** Daftar pemindahan yang masih bisa dikembalikan, terbaru dulu. */
export function usePemekaranRiwayat() {
  return useQuery({
    queryKey: ['pemekaran', 'riwayat'],
    queryFn: async (): Promise<RiwayatPemekaran[]> => {
      const snap = await getDocs(query(collection(db, CFG), where('jenis', '==', 'pemekaran')))
      return snap.docs
        .map((d) => {
          const v = d.data() as Record<string, unknown>
          return {
            id: d.id,
            jumlah: Number(v.jumlah ?? 0),
            ringkas: String(v.ringkas ?? ''),
            oleh: String(v.oleh ?? ''),
            dibuatDetik: (v.dibuat_at as { seconds?: number } | undefined)?.seconds ?? 0,
            items: (v.items as ItemPindah[] | undefined) ?? [],
          }
        })
        .sort((a, b) => b.dibuatDetik - a.dibuatDetik)
    },
    staleTime: 30_000,
  })
}

export interface HasilKembali { dikembalikan: number; dilewati: string[]; gagal: string[] }

/** Kembalikan satu pemindahan: hanya penduduk yang RT/RW-nya masih sama dengan hasil pemindahan; sisanya dilewati dan dilaporkan. */
export function useKembalikanPemekaran() {
  const qc = useQueryClient()
  const email = useEmail()

  return useMutation({
    mutationFn: async (batch: Pick<RiwayatPemekaran, 'id' | 'items' | 'ringkas'>): Promise<HasilKembali> => {
      // Keadaan penduduk SEKARANG dibaca segar dari server (bukan cache) agar perubahan manual terbaru tidak tertimpa
      const snap = await getDocs(collection(db, 'penduduk'))
      const saatIni = new Map(snap.docs.map((d) => [d.id, { rt: String(d.data().rt ?? ''), rw: String(d.data().rw ?? '') }]))
      const { kembali, dilewati } = rencanaKembalikan(batch.items, saatIni)
      const hasil = kembali.length > 0 ? await tulisPerubahan(kembali, email, 'Pemindahan wilayah dikembalikan') : { berhasil: [], gagal: [] }
      if (hasil.gagal.length === 0) {
        // Seperti Tempat sampah: dokumen cadangan dihapus setelah selesai (yang dilewati tidak bisa dikembalikan otomatis)
        await deleteDoc(doc(db, CFG, batch.id))
      } else {
        await updateDoc(doc(db, CFG, batch.id), { items: batch.items.filter((i) => hasil.gagal.some((g) => g.item.id === i.id)), jumlah: hasil.gagal.length })
      }
      await addDoc(collection(db, LOG), {
        aksi: 'edit_wilayah',
        keterangan: `Pemindahan wilayah dikembalikan: ${hasil.berhasil.length} jiwa (${batch.ringkas})${dilewati.length ? `, ${dilewati.length} dilewati` : ''}`,
        nik_target: '',
        oleh: email,
        ts: serverTimestamp(),
      })
      return {
        dikembalikan: hasil.berhasil.length,
        dilewati: dilewati.map((d) => `${d.item.nama}: ${d.alasan}`),
        gagal: hasil.gagal.map((g) => `${g.item.nama}: ${g.pesan}`),
      }
    },
    onSuccess: () => invalidasi(qc),
  })
}
