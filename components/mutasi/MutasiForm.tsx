'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAddMutasiKeluar, useAddMutasiMasuk } from '@/hooks/useMutasi'
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
  const { mutate, isPending } = useAddMutasiKeluar()
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

  function validate() {
    const e: Record<string, string> = {}
    if (!form.nama.trim()) e.nama = 'Nama wajib diisi'
    if (!/^\d{16}$/.test(form.nik_target)) e.nik_target = 'NIK harus 16 digit angka'
    if (!/^\d{16}$/.test(form.no_kk)) e.no_kk = 'No. KK harus 16 digit angka'
    if (!form.tujuan.trim()) e.tujuan = 'Tujuan wajib diisi'
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const data: Omit<MutasiKeluar, 'id' | 'created_at' | 'created_by'> = {
      nama: form.nama.trim(),
      nik_target: form.nik_target,
      no_kk: form.no_kk,
      tujuan: form.tujuan.trim(),
      alasan: form.alasan.trim(),
      tanggal: form.tanggal,
    }
    mutate(data, { onSuccess })
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 mb-4 space-y-3">
      <h3 className="text-sm font-semibold text-sky-400">Catat Pindah Keluar</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSubmit} disabled={isPending} size="sm">
          {isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>Batal</Button>
      </div>
    </div>
  )
}

// ── Form Pindah Masuk ────────────────────────────────────────────────────────
// Koleksi mutasi_masuk: data lengkap seperti penduduk + asal_daerah + tanggal

interface MutasiMasukFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function MutasiMasukForm({ onSuccess, onCancel }: MutasiMasukFormProps) {
  const { mutate, isPending } = useAddMutasiMasuk()
  const [form, setForm] = useState({
    nama_lengkap: '',
    nik: '',
    no_kk: '',
    jenis_kelamin: 'Laki-laki' as typeof JENIS_KELAMIN[number],
    agama: 'Islam' as typeof AGAMA[number],
    asal_daerah: '',
    hubungan_keluarga: 'Kepala Keluarga' as typeof HUBUNGAN_KELUARGA[number],
    nama_ayah: '',
    nama_ibu: '',
    pekerjaan: 'Belum/Tidak Bekerja' as typeof PEKERJAAN[number],
    pendidikan: 'Belum/Tidak Sekolah' as typeof PENDIDIKAN[number],
    rt: '001' as typeof RT_LIST[number],
    rw: '001' as typeof RW_LIST[number],
    status: 'aktif' as const,
    status_perkawinan: 'Belum Kawin' as typeof STATUS_PERKAWINAN[number],
    tanggal: new Date().toISOString().slice(0, 10),
    tanggal_lahir: '',
    tempat_lahir: '',
    golongan_darah: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.nama_lengkap.trim()) e.nama_lengkap = 'Nama wajib diisi'
    if (!/^\d{16}$/.test(form.nik)) e.nik = 'NIK harus 16 digit angka'
    if (!/^\d{16}$/.test(form.no_kk)) e.no_kk = 'No. KK harus 16 digit angka'
    if (!form.asal_daerah.trim()) e.asal_daerah = 'Asal daerah wajib diisi'
    if (!form.tanggal_lahir) e.tanggal_lahir = 'Tanggal lahir wajib diisi'
    if (!form.tempat_lahir.trim()) e.tempat_lahir = 'Tempat lahir wajib diisi'
    if (!form.tanggal) e.tanggal = 'Tanggal masuk wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const data: Omit<MutasiMasuk, 'id' | 'created_at' | 'updated_at' | 'created_by'> = {
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
    }
    mutate(data, { onSuccess })
  }

  const selectClass = "w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 mb-4 space-y-3">
      <h3 className="text-sm font-semibold text-sky-400">Catat Pindah Masuk</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Nama Lengkap</Label>
          <Input value={form.nama_lengkap} onChange={(e) => set('nama_lengkap', e.target.value)} placeholder="Nama lengkap" />
          {errors.nama_lengkap && <p className="text-xs text-red-400 mt-1">{errors.nama_lengkap}</p>}
        </div>
        <div>
          <Label>NIK</Label>
          <Input value={form.nik} onChange={(e) => set('nik', e.target.value)} placeholder="16 digit" maxLength={16} />
          {errors.nik && <p className="text-xs text-red-400 mt-1">{errors.nik}</p>}
        </div>
        <div>
          <Label>No. KK</Label>
          <Input value={form.no_kk} onChange={(e) => set('no_kk', e.target.value)} placeholder="16 digit" maxLength={16} />
          {errors.no_kk && <p className="text-xs text-red-400 mt-1">{errors.no_kk}</p>}
        </div>
        <div>
          <Label>Asal Daerah</Label>
          <Input value={form.asal_daerah} onChange={(e) => set('asal_daerah', e.target.value)} placeholder="Kota/Desa asal" />
          {errors.asal_daerah && <p className="text-xs text-red-400 mt-1">{errors.asal_daerah}</p>}
        </div>
        <div>
          <Label>Tanggal Masuk</Label>
          <Input type="date" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
          {errors.tanggal && <p className="text-xs text-red-400 mt-1">{errors.tanggal}</p>}
        </div>
        <div>
          <Label>Jenis Kelamin</Label>
          <select className={selectClass} value={form.jenis_kelamin} onChange={(e) => set('jenis_kelamin', e.target.value)}>
            {JENIS_KELAMIN.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label>Tempat Lahir</Label>
          <Input value={form.tempat_lahir} onChange={(e) => set('tempat_lahir', e.target.value)} placeholder="Kota/Kabupaten" />
          {errors.tempat_lahir && <p className="text-xs text-red-400 mt-1">{errors.tempat_lahir}</p>}
        </div>
        <div>
          <Label>Tanggal Lahir</Label>
          <Input type="date" value={form.tanggal_lahir} onChange={(e) => set('tanggal_lahir', e.target.value)} />
          {errors.tanggal_lahir && <p className="text-xs text-red-400 mt-1">{errors.tanggal_lahir}</p>}
        </div>
        <div>
          <Label>Agama</Label>
          <select className={selectClass} value={form.agama} onChange={(e) => set('agama', e.target.value)}>
            {AGAMA.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label>Hubungan Keluarga</Label>
          <select className={selectClass} value={form.hubungan_keluarga} onChange={(e) => set('hubungan_keluarga', e.target.value)}>
            {HUBUNGAN_KELUARGA.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label>Status Perkawinan</Label>
          <select className={selectClass} value={form.status_perkawinan} onChange={(e) => set('status_perkawinan', e.target.value)}>
            {STATUS_PERKAWINAN.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label>Pendidikan</Label>
          <select className={selectClass} value={form.pendidikan} onChange={(e) => set('pendidikan', e.target.value)}>
            {PENDIDIKAN.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label>Pekerjaan</Label>
          <select className={selectClass} value={form.pekerjaan} onChange={(e) => set('pekerjaan', e.target.value)}>
            {PEKERJAAN.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label>Nama Ayah</Label>
          <Input value={form.nama_ayah} onChange={(e) => set('nama_ayah', e.target.value)} placeholder="Nama ayah kandung" />
        </div>
        <div>
          <Label>Nama Ibu</Label>
          <Input value={form.nama_ibu} onChange={(e) => set('nama_ibu', e.target.value)} placeholder="Nama ibu kandung" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>RT</Label>
            <select className={selectClass} value={form.rt} onChange={(e) => set('rt', e.target.value)}>
              {RT_LIST.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <Label>RW</Label>
            <select className={selectClass} value={form.rw} onChange={(e) => set('rw', e.target.value)}>
              {RW_LIST.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSubmit} disabled={isPending} size="sm">
          {isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>Batal</Button>
      </div>
    </div>
  )
}
