// Fitur tambah penduduk manual dinonaktifkan.
// Penambahan penduduk hanya melalui: Pindah masuk, Kelahiran.
// Pengurangan penduduk hanya melalui: Pindah keluar, Kematian.
import { redirect } from 'next/navigation'

export default function TambahPendudukPage() {
  redirect('/penduduk')
}
