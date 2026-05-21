'use client'

import { useState } from 'react'
import { User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAddMutasiKeluar, useAddMutasiMasuk, useAddMutasiMasukBatch } from '@/hooks/useMutasi'
import { useCatatPindahKeluarKeluarga, usePendudukList } from '@/hooks/usePenduduk'
import { useToast } from '@/components/ui/toast'
import type { MutasiKeluar, MutasiMasuk } from '@/types'
import {
  AGAMA,
  HUBUNGAN_KELUARGA,
  JENIS_KELAMIN,
  PENDIDIKAN,
  PEKERJAAN,
  STATUS_PERKAWINAN,
  RT_LIST,
  RW_LIST,
} from '@/lib/penduduk-constants'

// ── Form Pindah Keluar ───────────────────────────────────────────────────────
// Koleksi mutasi_keluar: nama, nik_target, no_kk, alasan, tujuan, tanggal

interface MutasiKeluarFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function MutasiKeluarForm({ onSuccess, onCancel }: MutasiKeluarFormProps) {
  const { mutate, isPending: isPendingSatu } = useAddMutasiKeluar()
  const mutasiKeluarga = useCatatPindahKeluarKeluarga()
  const { data: allPenduduk = [] } = usePendudukList()
  const { toast } = useToast()
  const [opsi, setOpsi] = useState<'perorangan' | 'keluarga'>('perorangan')
  const [form, setForm] = useState({
    nama: '',
    nik_target: '',
    no_kk: '',
    tujuan: '',
    alasan: '',
    tanggal: new Date().toISOString().slice(0, 10),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  // Anggota KK aktif berdasarkan no_kk yang diisi (opsi keluarga)
  const anggotaKK = form.no_kk.length === 16
    ? allPenduduk.filter((p) => p.no_kk === form.no_kk && p.status === 'aktif')
    : []

  function validate() {
    const e: Record<string, string> = {}
    if (opsi === 'perorangan') {
      if (!form.nama.trim()) e.nama = 'Nama wajib diisi'
      if (!/^\d{16}$/.test(form.nik_target)) e.nik_target = 'NIK harus 16 digit angka'
      if (!/^\d{16}$/.test(form.no_kk)) e.no_kk = 'No. KK harus 16 digit angka'
    } else {
      if (!/^\d{16}$/.test(form.no_kk)) e.no_kk = 'No. KK harus 16 digit angka'
      if (anggotaKK.length === 0 && form.no_kk.length === 16) e.no_kk = 'Tidak ada anggota aktif ditemukan untuk No. KK ini'
    }
    if (!form.tujuan.trim()) e.tujuan = 'Tujuan wajib diisi'
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    if (opsi === 'perorangan') {
      const data: Omit<MutasiKeluar, 'id' | 'created_at' | 'created_by'> = {
        nama: form.nama.trim(),
        nik_target: form.nik_target,
        no_kk: form.no_kk,
        tujuan: form.tujuan.trim(),
        alasan: form.alasan.trim(),
        tanggal: form.tanggal,
      }
      mutate(data, { onSuccess })
    } else {
      try {
        await mutasiKeluarga.mutateAsync({
          noKk: form.no_kk,
          anggotaIds: anggotaKK.map((p) => p.id),
          tujuan: form.tujuan.trim(),
          alasan: form.alasan.trim(),
          tanggal: form.tanggal,
          allPenduduk,
        })
        toast(`${anggotaKK.length} anggota KK berhasil dicatat pindah keluar`, 'success')
        onSuccess()
      } catch {
        toast('Gagal mencatat pindah keluar keluarga', 'error')
      }
    }
  }

  const isPending = isPendingSatu || mutasiKeluarga.isPending

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-4 mb-4 space-y-3">
      <h3 className="text-sm font-semibold text-sky-400">Catat Pindah Keluar</h3>

      {/* Opsi Jenis Pindah */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setOpsi('perorangan')}
          className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
            opsi === 'perorangan'
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300'
          }`}
        >
          <User size={13} className="shrink-0" />
          1 Orang
        </button>
        <button
          onClick={() => setOpsi('keluarga')}
          className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
            opsi === 'keluarga'
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300'
          }`}
        >
          <Users size={13} className="shrink-0" />
          1 Keluarga (KK)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {opsi === 'perorangan' && (
          <>
            <div>
              <Label>Nama Lengkap</Label>
              <Input value={form.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Nama penduduk" />
              {errors.nama && <p className="text-xs text-red-400 mt-1">{errors.nama}</p>}
            </div>
            <div>
              <Label>NIK</Label>
              <Input value={form.nik_target} onChange={(e) => set('nik_target', e.target.value)} placeholder="16 digit" maxLength={16} />
              {errors.nik_target && <p className="text-xs text-red-400 mt-1">{errors.nik_target}</p>}
            </div>
          </>
        )}
        <div>
          <Label>No. KK</Label>
          <Input value={form.no_kk} onChange={(e) => set('no_kk', e.target.value)} placeholder="16 digit" maxLength={16} />
          {errors.no_kk && <p className="text-xs text-red-400 mt-1">{errors.no_kk}</p>}
        </div>
        <div>
          <Label>Tanggal Pindah</Label>
          <Input type="date" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
          {errors.tanggal && <p className="text-xs text-red-400 mt-1">{errors.tanggal}</p>}
        </div>
        <div>
          <Label>Tujuan Pindah</Label>
          <Input value={form.tujuan} onChange={(e) => set('tujuan', e.target.value)} placeholder="Kota/Desa tujuan" />
          {errors.tujuan && <p className="text-xs text-red-400 mt-1">{errors.tujuan}</p>}
        </div>
        <div>
          <Label>Alasan Pindah</Label>
          <Input value={form.alasan} onChange={(e) => set('alasan', e.target.value)} placeholder="Menikah, Pekerjaan, dll" />
        </div>
      </div>

      {/* Preview anggota KK (opsi keluarga) */}
      {opsi === 'keluarga' && form.no_kk.length === 16 && (
        <div className="rounded-xl bg-sky-500/5 border border-sky-500/15 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/70 mb-1">
            {anggotaKK.length} anggota KK aktif akan dicatat pindah
          </p>
          {anggotaKK.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {anggotaKK.map((p) => (
                <p key={p.id} className="text-xs text-slate-400">
                  {p.nama_lengkap}
                  <span className="text-slate-600 ml-1">({p.hubungan_keluarga})</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Tidak ada anggota aktif untuk No. KK ini.</p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSubmit} disabled={isPending || (opsi === 'keluarga' && form.no_kk.length === 16 && anggotaKK.length === 0)} size="sm">
          {isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>Batal</Button>
      </div>
    </div>
  )
}

// ── Form Pindah Masuk ────────────────────────────────────────────────────────
// Koleksi mutasi_masuk: data lengkap seperti penduduk + asal_daerah + tanggal
// Opsi: 1 Orang (langsung submit) | 1 Keluarga (kumpul anggota dulu, submit batch)

interface MutasiMasukFormProps {
  onSuccess: () => void
  onCancel: () => void
}

type OpsiMasuk = 'perorangan' | 'keluarga'

// Form data untuk satu anggota
type AnggotaForm = {
  nama_lengkap: string
  nik: string
  no_kk: string
  jenis_kelamin: typeof JENIS_KELAMIN[number]
  agama: typeof AGAMA[number]
  asal_daerah: string
  hubungan_keluarga: typeof HUBUNGAN_KELUARGA[number]
  nama_ayah: string
  nama_ibu: string
  pekerjaan: string
  pendidikan: string
  rt: typeof RT_LIST[number]
  rw: typeof RW_LIST[number]
  status: 'aktif'
  status_perkawinan: typeof STATUS_PERKAWINAN[number]
  tanggal: string
  tanggal_lahir: string
  tempat_lahir: string
  golongan_darah: string
  alamat: string
}

function emptyAnggotaForm(tanggal: string): AnggotaForm {
  return {
    nama_lengkap: '',
    nik: '',
    no_kk: '',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam',
    asal_daerah: '',
    hubungan_keluarga: 'Kepala Keluarga',
    nama_ayah: '',
    nama_ibu: '',
    pekerjaan: 'Tidak/Belum Bekerja',
    pendidikan: 'Tidak/Belum Sekolah',
    rt: '001',
    rw: '001',
    status: 'aktif',
    status_perkawinan: 'Belum Kawin',
    tanggal,
    tanggal_lahir: '',
    tempat_lahir: '',
    golongan_darah: '',
    alamat: 'KARANG SENGON',
  }
}

function validateAnggota(form: AnggotaForm): Record<string, string> {
  const e: Record<string, string> = {}
  if (!form.nama_lengkap.trim()) e.nama_lengkap = 'Nama wajib diisi'
  if (!/^\d{16}$/.test(form.nik)) e.nik = 'NIK harus 16 digit angka'
  if (!/^\d{16}$/.test(form.no_kk)) e.no_kk = 'No. KK harus 16 digit angka'
  if (!form.asal_daerah.trim()) e.asal_daerah = 'Asal daerah wajib diisi'
  if (!form.tanggal_lahir) e.tanggal_lahir = 'Tanggal lahir wajib diisi'
  if (!form.tempat_lahir.trim()) e.tempat_lahir = 'Tempat lahir wajib diisi'
  if (!form.tanggal) e.tanggal = 'Tanggal masuk wajib diisi'
  return e
}

function toMutasiMasukData(form: AnggotaForm): Omit<MutasiMasuk, 'id' | 'created_at' | 'updated_at' | 'created_by'> {
  return {
    nama_lengkap: form.nama_lengkap.trim(),
    nik: form.nik,
    no_kk: form.no_kk,
    jenis_kelamin: form.jenis_kelamin,
    agama: form.agama,
    asal_daerah: form.asal_daerah.trim(),
    hubungan_keluarga: form.hubungan_keluarga,
    nama_ayah: form.nama_ayah.trim(),
    nama_ibu: form.nama_ibu.trim(),
    pekerjaan: form.pekerjaan,
    pendidikan: form.pendidikan,
    rt: form.rt,
    rw: form.rw,
    status: form.status,
    status_perkawinan: form.status_perkawinan,
    tanggal: form.tanggal,
    tanggal_lahir: form.tanggal_lahir,
    tempat_lahir: form.tempat_lahir.trim().toUpperCase(),
    golongan_darah: form.golongan_darah,
    alamat: form.alamat.trim().toUpperCase(),
  }
}

// ── Sub-komponen form anggota (dipakai di kedua opsi) ────────────────────────
function AnggotaFields({
  form,
  errors,
  onChange,
}: {
  form: AnggotaForm
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
}) {
  const selectClass = "w-full bg-slate-900 border border-white/[0.06] text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <Label>Nama Lengkap</Label>
        <Input value={form.nama_lengkap} onChange={(e) => onChange('nama_lengkap', e.target.value)} placeholder="Nama lengkap" />
        {errors.nama_lengkap && <p className="text-xs text-red-400 mt-1">{errors.nama_lengkap}</p>}
      </div>
      <div>
        <Label>NIK</Label>
        <Input value={form.nik} onChange={(e) => onChange('nik', e.target.value)} placeholder="16 digit" maxLength={16} />
        {errors.nik && <p className="text-xs text-red-400 mt-1">{errors.nik}</p>}
      </div>
      <div>
        <Label>No. KK</Label>
        <Input value={form.no_kk} onChange={(e) => onChange('no_kk', e.target.value)} placeholder="16 digit" maxLength={16} />
        {errors.no_kk && <p className="text-xs text-red-400 mt-1">{errors.no_kk}</p>}
      </div>
      <div>
        <Label>Asal Daerah</Label>
        <Input value={form.asal_daerah} onChange={(e) => onChange('asal_daerah', e.target.value)} placeholder="Kota/Desa asal" />
        {errors.asal_daerah && <p className="text-xs text-red-400 mt-1">{errors.asal_daerah}</p>}
      </div>
      <div>
        <Label>Tanggal Masuk</Label>
        <Input type="date" value={form.tanggal} onChange={(e) => onChange('tanggal', e.target.value)} />
        {errors.tanggal && <p className="text-xs text-red-400 mt-1">{errors.tanggal}</p>}
      </div>
      <div>
        <Label>Jenis Kelamin</Label>
        <select className={selectClass} value={form.jenis_kelamin} onChange={(e) => onChange('jenis_kelamin', e.target.value)}>
          {JENIS_KELAMIN.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <Label>Tempat Lahir</Label>
        <Input value={form.tempat_lahir} onChange={(e) => onChange('tempat_lahir', e.target.value)} placeholder="Kota/Kabupaten" />
        {errors.tempat_lahir && <p className="text-xs text-red-400 mt-1">{errors.tempat_lahir}</p>}
      </div>
      <div>
        <Label>Tanggal Lahir</Label>
        <Input type="date" value={form.tanggal_lahir} onChange={(e) => onChange('tanggal_lahir', e.target.value)} />
        {errors.tanggal_lahir && <p className="text-xs text-red-400 mt-1">{errors.tanggal_lahir}</p>}
      </div>
      <div>
        <Label>Agama</Label>
        <select className={selectClass} value={form.agama} onChange={(e) => onChange('agama', e.target.value)}>
          {AGAMA.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <Label>Hubungan Keluarga</Label>
        <select className={selectClass} value={form.hubungan_keluarga} onChange={(e) => onChange('hubungan_keluarga', e.target.value)}>
          {HUBUNGAN_KELUARGA.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <Label>Status Perkawinan</Label>
        <select className={selectClass} value={form.status_perkawinan} onChange={(e) => onChange('status_perkawinan', e.target.value)}>
          {STATUS_PERKAWINAN.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <Label>Pendidikan</Label>
        <select className={selectClass} value={form.pendidikan} onChange={(e) => onChange('pendidikan', e.target.value)}>
          {PENDIDIKAN.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <Label>Pekerjaan</Label>
        <select className={selectClass} value={form.pekerjaan} onChange={(e) => onChange('pekerjaan', e.target.value)}>
          {PEKERJAAN.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <Label>Nama Ayah</Label>
        <Input value={form.nama_ayah} onChange={(e) => onChange('nama_ayah', e.target.value)} placeholder="Nama ayah kandung" />
      </div>
      <div>
        <Label>Nama Ibu</Label>
        <Input value={form.nama_ibu} onChange={(e) => onChange('nama_ibu', e.target.value)} placeholder="Nama ibu kandung" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>RT</Label>
          <select className={selectClass} value={form.rt} onChange={(e) => onChange('rt', e.target.value)}>
            {RT_LIST.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label>RW</Label>
          <select className={selectClass} value={form.rw} onChange={(e) => onChange('rw', e.target.value)}>
            {RW_LIST.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label>Alamat</Label>
        <Input value={form.alamat} onChange={(e) => onChange('alamat', e.target.value)} placeholder="Contoh: KARANG SENGON" />
      </div>
    </div>
  )
}

export function MutasiMasukForm({ onSuccess, onCancel }: MutasiMasukFormProps) {
  const { mutate, isPending: isPendingSatu } = useAddMutasiMasuk()
  const batchMutation = useAddMutasiMasukBatch()
  const today = new Date().toISOString().slice(0, 10)

  const [opsi, setOpsi] = useState<OpsiMasuk>('perorangan')

  // State untuk form anggota aktif (dipakai di kedua opsi)
  const [form, setFormState] = useState<AnggotaForm>(emptyAnggotaForm(today))
  const [errors, setErrors] = useState<Record<string, string>>({})

  // State untuk daftar anggota yang sudah ditambahkan (opsi keluarga)
  const [daftarAnggota, setDaftarAnggota] = useState<AnggotaForm[]>([])

  function handleChange(field: string, value: string) {
    setFormState((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  function handleGantiOpsi(o: OpsiMasuk) {
    setOpsi(o)
    setFormState(emptyAnggotaForm(today))
    setErrors({})
    setDaftarAnggota([])
  }

  // Opsi perorangan: langsung simpan
  function handleSubmitPerorangan() {
    const errs = validateAnggota(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    mutate(toMutasiMasukData(form), { onSuccess })
  }

  // Opsi keluarga: tambah anggota ke daftar
  function handleTambahAnggota() {
    const errs = validateAnggota(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setDaftarAnggota((prev) => [...prev, { ...form }])
    // Reset form tapi pertahankan no_kk, asal_daerah, tanggal, rt, rw, alamat
    setFormState((prev) => ({
      ...emptyAnggotaForm(prev.tanggal),
      no_kk: prev.no_kk,
      asal_daerah: prev.asal_daerah,
      rt: prev.rt,
      rw: prev.rw,
      alamat: prev.alamat,
      tanggal: prev.tanggal,
    }))
    setErrors({})
  }

  function handleHapusAnggota(idx: number) {
    setDaftarAnggota((prev) => prev.filter((_, i) => i !== idx))
  }

  // Opsi keluarga: simpan semua batch
  async function handleSubmitKeluarga() {
    if (daftarAnggota.length === 0) {
      setErrors({ _global: 'Minimal 1 anggota harus ditambahkan' })
      return
    }
    await batchMutation.mutateAsync(daftarAnggota.map(toMutasiMasukData))
    onSuccess()
  }

  const isPending = isPendingSatu || batchMutation.isPending

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-4 mb-4 space-y-3">
      <h3 className="text-sm font-semibold text-sky-400">Catat Pindah Masuk</h3>

      {/* Pilih Opsi */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleGantiOpsi('perorangan')}
          className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
            opsi === 'perorangan'
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300'
          }`}
        >
          <User size={13} className="shrink-0" />
          1 Orang
        </button>
        <button
          onClick={() => handleGantiOpsi('keluarga')}
          className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
            opsi === 'keluarga'
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300'
          }`}
        >
          <Users size={13} className="shrink-0" />
          1 Keluarga (KK)
        </button>
      </div>

      {/* Daftar anggota yang sudah ditambahkan (opsi keluarga) */}
      {opsi === 'keluarga' && daftarAnggota.length > 0 && (
        <div className="rounded-xl bg-sky-500/5 border border-sky-500/15 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/70 mb-2">
            {daftarAnggota.length} anggota siap disimpan
          </p>
          <div className="flex flex-col gap-1">
            {daftarAnggota.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-300 flex-1 truncate">
                  {a.nama_lengkap}
                  <span className="text-slate-600 ml-1">({a.hubungan_keluarga})</span>
                </p>
                <button
                  onClick={() => handleHapusAnggota(i)}
                  className="text-rose-400/70 hover:text-rose-400 text-xs shrink-0 px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form anggota */}
      {opsi === 'keluarga' && (
        <p className="text-xs text-slate-500">
          Isi data setiap anggota, klik &ldquo;Tambah Anggota&rdquo;, lalu klik &ldquo;Simpan Semua&rdquo; jika sudah selesai.
        </p>
      )}

      <AnggotaFields form={form} errors={errors} onChange={handleChange} />

      {errors._global && <p className="text-xs text-red-400">{errors._global}</p>}

      <div className="flex gap-2 pt-1">
        {opsi === 'perorangan' ? (
          <>
            <Button onClick={handleSubmitPerorangan} disabled={isPending} size="sm">
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>Batal</Button>
          </>
        ) : (
          <>
            <Button onClick={handleTambahAnggota} disabled={isPending} size="sm" variant="outline">
              + Tambah Anggota
            </Button>
            <Button
              onClick={handleSubmitKeluarga}
              disabled={isPending || daftarAnggota.length === 0}
              size="sm"
            >
              {isPending ? 'Menyimpan...' : `Simpan Semua (${daftarAnggota.length})`}
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>Batal</Button>
          </>
        )}
      </div>
    </div>
  )
}
