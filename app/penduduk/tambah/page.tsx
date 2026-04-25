// Fitur tambah penduduk manual dinonaktifkan.
// Penambahan penduduk hanya melalui: Pindah Masuk, Kelahiran.
// Pengurangan penduduk hanya melalui: Pindah Keluar, Kematian.
import { redirect } from 'next/navigation'

export default function TambahPendudukPage() {
  redirect('/penduduk')
}
