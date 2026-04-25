'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAddLahir, useAddMeninggal } from '@/hooks/useVital'
import type { Lahir, Meninggal } from '@/types'
import {
  AGAMA,
  HUBUNGAN_KELUARGA,
  JENIS_KELAMIN,
  STATUS_PERKAWINAN,
  RT_LIST,
  RW_LIST,
} from '@/lib/penduduk-constants'

// ── Form Kelahiran ───────────────────────────────────────────────────────────
// Koleksi lahir — field aktual: nama_lengkap, nik, no_kk, jenis_kelamin,
// agama, hubungan_keluarga, nama_ayah, nama_ibu, rt, rw, status,
// status_perkawinan, tanggal_lahir, tempat_lahir

interface LahirFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function LahirForm({ onSuccess, onCancel }: LahirFormProps) {
  const { mutate, isPending } = useAddLahir()
  const [form, setForm] = useState({
    nama_lengkap: '',
    nik: '',
    no_kk: '',
    jenis_kelamin: 'Laki-laki' as typeof JENIS_KELAMIN[number],
    agama: 'Islam' as typeof AGAMA[number],
    hubungan_keluarga: 'Anak' as typeof HUBUNGAN_KELUARGA[number],
    nama_ayah: '',
    nama_ibu: '',
    rt: '001' as typeof RT_LIST[number],
    rw: '001' as typeof RW_LIST[number],
    status: 'aktif' as const,
    status_perkawinan: 'Belum Kawin' as typeof STATUS_PERKAWINAN[number],
    tanggal_lahir: '',
    tempat_lahir: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.nama_lengkap.trim()) e.nama_lengkap = 'Nama bayi wajib diisi'
    if (!/^\d{16}$/.test(form.nik)) e.nik = 'NIK harus 16 digit angka'
    if (!/^\d{16}$/.test(form.no_kk)) e.no_kk = 'No. KK harus 16 digit angka'
    if (!form.tanggal_lahir) e.tanggal_lahir = 'Tanggal lahir wajib diisi'
    if (!form.tempat_lahir.trim()) e.tempat_lahir = 'Tempat lahir wajib diisi'
    if (!form.nama_ayah.trim()) e.nama_ayah = 'Nama ayah wajib diisi'
    if (!form.nama_ibu.trim()) e.nama_ibu = 'Nama ibu wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const data: Omit<Lahir, 'id' | 'created_at' | 'created_by'> = {
      nama_lengkap: form.nama_lengkap.trim(),
      nik: form.nik,
      no_kk: form.no_kk,
      jenis_kelamin: form.jenis_kelamin,
      agama: form.agama,
      hubungan_keluarga: form.hubungan_keluarga,
      nama_ayah: form.nama_ayah.trim(),
      nama_ibu: form.nama_ibu.trim(),
      rt: form.rt,
      rw: form.rw,
      status: form.status,
      status_perkawinan: form.status_perkawinan,
      tanggal_lahir: form.tanggal_lahir,
      tempat_lahir: form.tempat_lahir.trim().toUpperCase(),
    }
    mutate(data, { onSuccess })
  }

  const selectClass = "w-full bg-slate-900 border border-white/[0.06] text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-4 mb-4 space-y-3">
      <h3 className="text-sm font-semibold text-sky-400">Catat Kelahiran</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Nama Lengkap Bayi</Label>
          <Input value={form.nama_lengkap} onChange={(e) => set('nama_lengkap', e.target.value)} placeholder="Nama lengkap bayi" />
          {errors.nama_lengkap && <p className="text-xs text-red-400 mt-1">{errors.nama_lengkap}</p>}
        </div>
        <div>
          <Label>NIK Bayi</Label>
          <Input value={form.nik} onChange={(e) => set('nik', e.target.value)} placeholder="16 digit" maxLength={16} />
          {errors.nik && <p className="text-xs text-red-400 mt-1">{errors.nik}</p>}
        </div>
        <div>
          <Label>No. KK</Label>
          <Input value={form.no_kk} onChange={(e) => set('no_kk', e.target.value)} placeholder="16 digit" maxLength={16} />
          {errors.no_kk && <p className="text-xs text-red-400 mt-1">{errors.no_kk}</p>}
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
          <Label>Nama Ayah</Label>
          <Input value={form.nama_ayah} onChange={(e) => set('nama_ayah', e.target.value)} placeholder="Nama ayah kandung" />
          {errors.nama_ayah && <p className="text-xs text-red-400 mt-1">{errors.nama_ayah}</p>}
        </div>
        <div>
          <Label>Nama Ibu</Label>
          <Input value={form.nama_ibu} onChange={(e) => set('nama_ibu', e.target.value)} placeholder="Nama ibu kandung" />
          {errors.nama_ibu && <p className="text-xs text-red-400 mt-1">{errors.nama_ibu}</p>}
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

// ── Form Kematian ────────────────────────────────────────────────────────────
// Koleksi meninggal — field aktual: nama, nik_target, no_kk, hub_asli, sebab, tanggal

interface MeninggalFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function MeninggalForm({ onSuccess, onCancel }: MeninggalFormProps) {
  const { mutate, isPending } = useAddMeninggal()
  const [form, setForm] = useState({
    nama: '',
    nik_target: '',
    no_kk: '',
    hub_asli: 'Kepala Keluarga' as typeof HUBUNGAN_KELUARGA[number],
    sebab: '',
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
    if (!form.sebab.trim()) e.sebab = 'Sebab kematian wajib diisi'
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const data: Omit<Meninggal, 'id' | 'created_at' | 'created_by'> = {
      nama: form.nama.trim(),
      nik_target: form.nik_target,
      no_kk: form.no_kk,
      hub_asli: form.hub_asli,
      sebab: form.sebab.trim(),
      tanggal: form.tanggal,
    }
    mutate(data, { onSuccess })
  }

  const selectClass = "w-full bg-slate-900 border border-white/[0.06] text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"

  return (
    <div className="bg-[#0d1424] border border-white/[0.06] rounded-lg p-4 mb-4 space-y-3">
      <h3 className="text-sm font-semibold text-sky-400">Catat Kematian</h3>
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
          <Label>Tanggal Meninggal</Label>
          <Input type="date" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
          {errors.tanggal && <p className="text-xs text-red-400 mt-1">{errors.tanggal}</p>}
        </div>
        <div>
          <Label>Hubungan Keluarga</Label>
          <select className={selectClass} value={form.hub_asli} onChange={(e) => set('hub_asli', e.target.value)}>
            {HUBUNGAN_KELUARGA.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label>Sebab Kematian</Label>
          <Input value={form.sebab} onChange={(e) => set('sebab', e.target.value)} placeholder="Sakit, Kecelakaan, dll" />
          {errors.sebab && <p className="text-xs text-red-400 mt-1">{errors.sebab}</p>}
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
