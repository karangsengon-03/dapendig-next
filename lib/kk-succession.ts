/**
 * Logika suksesi Kepala Keluarga (KK) — SATU-SATUNYA sumber kebenaran.
 *
 * Dipakai oleh KEDUA jalur pencatatan kematian:
 * - catatMeninggal() di hooks/usePenduduk.ts (dari CatatMeninggalModal)
 * - addMeninggal() di hooks/useVital.ts (dari MeninggalForm / menu Vital)
 *
 * Sebelumnya kedua jalur ini punya implementasi terpisah dan tidak sinkron:
 * hanya catatMeninggal() yang menjalankan suksesi. Akibatnya jika kematian
 * seorang Kepala Keluarga dicatat lewat menu Vital, tidak ada anggota
 * keluarga yang naik menggantikan, dan tombol "Batalkan" di halaman Vital
 * gagal memulihkan apa pun karena field penanda (hub_asli_backup) memang
 * tidak pernah ditulis.
 *
 * Dengan disatukan di sini, kedua jalur menjalankan algoritma suksesi dan
 * pemulihan yang identik — termasuk skenario salah pencet "meninggal" pada
 * seseorang yang sebenarnya masih hidup (mis. suami/kepala keluarga), yang
 * harus bisa dikembalikan seperti semula lewat rollback.
 */

import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore'
import type { Penduduk } from '@/types'

const COL = 'penduduk'

/** Urutan prioritas pengganti Kepala Keluarga: Istri → Suami → Anak tertua. */
const URUTAN_PENGGANTI = ['Istri', 'Suami', 'Anak'] as const

/**
 * Cari & tetapkan pengganti sementara saat seorang Kepala Keluarga meninggal.
 * Hanya berlaku jika yang meninggal memang berstatus 'Kepala Keluarga'.
 *
 * `allPenduduk` diperlukan untuk mencari anggota keluarga aktif dalam 1 KK
 * yang sama — dilempar dari pemanggil karena keduanya (usePenduduk.ts dan
 * useVital.ts) sudah punya akses ke data ini lewat TanStack Query cache,
 * jadi tidak perlu fetch ulang di sini.
 */
export async function jalankanSuksesiKK(
  db: Firestore,
  params: {
    pendudukId: string
    hubunganKeluarga: string
    noKk: string
    allPenduduk: Penduduk[]
  }
): Promise<void> {
  const { pendudukId, hubunganKeluarga, noKk, allPenduduk } = params
  if (hubunganKeluarga !== 'Kepala Keluarga' || !noKk) return

  const anggota = allPenduduk.filter(
    (p) => p.no_kk === noKk && p.id !== pendudukId && p.status === 'aktif'
  )

  let pengganti: Penduduk | null = null
  for (const hub of URUTAN_PENGGANTI) {
    if (hub === 'Anak') {
      const anakList = anggota
        .filter((p) => p.hubungan_keluarga === 'Anak')
        .sort((a, b) => (a.tanggal_lahir ?? '').localeCompare(b.tanggal_lahir ?? ''))
      if (anakList.length > 0) { pengganti = anakList[0]; break }
    } else {
      const found = anggota.find((p) => p.hubungan_keluarga === hub)
      if (found) { pengganti = found; break }
    }
  }

  if (pengganti) {
    await updateDoc(doc(db, COL, pengganti.id), {
      hubungan_keluarga: 'Kepala Keluarga',
      hub_asli_backup: pengganti.hubungan_keluarga,
      updated_at: serverTimestamp(),
    })
  }
}

/**
 * Kembalikan suksesi KK saat pencatatan kematian di-rollback (dibatalkan).
 * Mengembalikan siapa pun yang sempat naik jadi Kepala Keluarga sementara
 * ke hubungan_keluarga aslinya.
 *
 * FIX tambahan dari versi lama: query sekarang difilter dengan no_kk yang
 * sama persis. Sebelumnya query mengambil SEMUA dokumen berstatus
 * 'Kepala Keluarga' lintas KK manapun di seluruh desa — jika kebetulan ada
 * lebih dari satu KK yang punya kepala-keluarga-sementara aktif di waktu
 * yang sama, rollback bisa salah sasaran memulihkan KK yang tidak
 * berhubungan sama sekali.
 */
export async function kembalikanSuksesiKK(
  db: Firestore,
  params: {
    noKk: string
    nikYangDikembalikan: string
  }
): Promise<void> {
  const { noKk, nikYangDikembalikan } = params
  if (!noKk) return

  const kkSnap = await getDocs(
    query(
      collection(db, COL),
      where('no_kk', '==', noKk),
      where('hubungan_keluarga', '==', 'Kepala Keluarga')
    )
  )

  for (const d of kkSnap.docs) {
    const pData = d.data()
    // Lewati dokumen orang yang baru saja dikembalikan (dia sendiri kembali
    // jadi Kepala Keluarga lewat rollback, bukan hasil suksesi sementara).
    if (pData.hub_asli_backup && d.id !== nikYangDikembalikan) {
      await updateDoc(doc(db, COL, d.id), {
        hubungan_keluarga: pData.hub_asli_backup,
        hub_asli_backup: null,
        updated_at: serverTimestamp(),
      })
      break
    }
  }
}
