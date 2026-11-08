/**
 * sinkron-catatan-tulis.ts — penulisan Firestore untuk Edit catatan Pindah masuk / Kelahiran (aturan lengkap ada di
 * sinkron-catatan.ts). Dipisah supaya halaman bisa memakai pesanHasilSinkron tanpa menarik Firebase.
 */
import { collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { GalatTolak } from '@/lib/galat-tolak'
import { kolomBerubah, nilai, type HasilSinkron } from '@/lib/sinkron-catatan'

/** ID dokumen penduduk untuk NIK catatan: ID = NIK lebih dulu, lalu isian `nik` (data hasil impor). null bila tidak ada. */
async function cariIdPenduduk(nik: string): Promise<string | null> {
  if (!nik) return null
  const langsung = await getDoc(doc(db, 'penduduk', nik))
  if (langsung.exists()) return nik
  const snap = await getDocs(query(collection(db, 'penduduk'), where('nik', '==', nik), limit(1)))
  return snap.empty ? null : snap.docs[0].id
}

async function pastikanNikBebas(nikBaru: string, pendudukId: string): Promise<void> {
  const pesan = (nama?: string) =>
    `NIK ${nikBaru} sudah terdaftar atas nama ${nama ?? 'penduduk lain'}. Perubahan tidak disimpan supaya data penduduk tidak ganda.`
  if (nikBaru !== pendudukId) {
    const langsung = await getDoc(doc(db, 'penduduk', nikBaru))
    if (langsung.exists()) throw new GalatTolak(pesan((langsung.data() as { nama_lengkap?: string } | undefined)?.nama_lengkap))
  }
  const snap = await getDocs(query(collection(db, 'penduduk'), where('nik', '==', nikBaru), limit(2)))
  const lain = snap.docs.find((d) => d.id !== pendudukId)
  if (lain) throw new GalatTolak(pesan((lain.data() as { nama_lengkap?: string } | undefined)?.nama_lengkap))
}

export async function editCatatanDanPenduduk(p: {
  koleksi: 'mutasi_masuk' | 'lahir'
  id: string
  data: Record<string, unknown>
  kolom: readonly string[]
  /** "pindah masuk" atau "kelahiran": dipakai di log. */
  label: string
  nama: string
  email: string
}): Promise<HasilSinkron> {
  const catatanRef = doc(db, p.koleksi, p.id)
  const sebelum = await getDoc(catatanRef)
  if (!sebelum.exists()) throw new GalatTolak('Catatan tidak ditemukan, mungkin sudah dihapus.')
  const nikLama = nilai('nik', (sebelum.data() as { nik?: string }).nik)
  const nikBaru = p.data.nik === undefined ? nikLama : nilai('nik', p.data.nik)

  const pendudukId = await cariIdPenduduk(nikLama)
  if (pendudukId && nikBaru && nikBaru !== nikLama) await pastikanNikBebas(nikBaru, pendudukId)

  const pendudukRef = pendudukId ? doc(db, 'penduduk', pendudukId) : null
  const logRef = doc(collection(db, 'log'))

  return runTransaction(db, async (tx) => {
    // Semua baca dulu, baru tulis (aturan transaksi Firestore)
    const cat = await tx.get(catatanRef)
    if (!cat.exists()) throw new GalatTolak('Catatan tidak ditemukan, mungkin sudah dihapus.')
    const pen = pendudukRef ? await tx.get(pendudukRef) : null
    const ada = !!pen && pen.exists()
    const beda = ada ? kolomBerubah(cat.data() as Record<string, unknown>, p.data, p.kolom) : {}
    const kolom = Object.keys(beda)

    tx.update(catatanRef, { ...p.data, updated_at: serverTimestamp() })
    if (ada && pendudukRef && kolom.length > 0) tx.update(pendudukRef, { ...beda, updated_at: serverTimestamp() })
    tx.set(logRef, {
      aksi: 'edit',
      keterangan: `Edit ${p.label}: ${p.nama}${ada && kolom.length > 0 ? ' (data penduduk ikut diperbarui)' : ''}`,
      nik_target: nikBaru,
      oleh: p.email,
      ts: serverTimestamp(),
    })
    return { pendudukDiperbarui: ada, kolom }
  })
}
