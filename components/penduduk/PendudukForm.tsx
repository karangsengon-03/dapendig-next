'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'
import {
  HUBUNGAN_KELUARGA,
  JENIS_KELAMIN,
  AGAMA,
  PENDIDIKAN,
  PEKERJAAN,
  STATUS_PERKAWINAN,
  RT_LIST,
  RW_LIST,
} from '@/lib/penduduk-constants'
import { checkNikExists } from '@/hooks/usePenduduk'
import type { PendudukFormData } from '@/types'

const EMPTY: PendudukFormData = {
  nik: '',
  nama_lengkap: '',
  no_kk: '',
  hubungan_keluarga: 'Kepala Keluarga',
  jenis_kelamin: 'Laki-laki',
  tempat_lahir: '',
  tanggal_lahir: '',
  agama: 'Islam',
  pendidikan: 'Tamat SD/Sederajat',
  pekerjaan: 'Tidak/Belum Bekerja',
  status_perkawinan: 'Belum Kawin',
  rt: '1',
  rw: '1',
  alamat: '',
  status: 'aktif',
}

interface PendudukFormProps {
  mode: 'edit'
  initial?: Partial<PendudukFormData>
  editId?: string
  onSubmit: (data: PendudukFormData) => Promise<void>
}

interface FieldErrors {
  [key: string]: string
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  error?: string
  maxLength?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`bg-[#0a0f1e] border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-1 transition-colors ${
          error
            ? 'border-rose-500/50 focus:border-rose-500/70 focus:ring-rose-500/20'
            : 'border-white/[0.08] focus:border-sky-500/50 focus:ring-sky-500/20'
        }`}
      />
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
  error,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-[#0a0f1e] border rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 transition-colors cursor-pointer ${
          error
            ? 'border-rose-500/50 focus:border-rose-500/70 focus:ring-rose-500/20'
            : 'border-white/[0.08] focus:border-sky-500/50 focus:ring-sky-500/20'
        }`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  )
}

export function PendudukForm({
  mode,
  initial,
  editId,
  onSubmit,
}: PendudukFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<PendudukFormData>({
    ...EMPTY,
    ...initial,
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  function set(patch: Partial<PendudukFormData>) {
    setForm((prev) => ({ ...prev, ...patch }))
    // Clear errors for changed fields
    const keys = Object.keys(patch)
    if (keys.some((k) => errors[k])) {
      setErrors((prev) => {
        const next = { ...prev }
        keys.forEach((k) => delete next[k])
        return next
      })
    }
  }

  async function validate(): Promise<boolean> {
    const errs: FieldErrors = {}
    if (!form.nik.trim()) errs.nik = 'NIK wajib diisi'
    else if (!/^\d{16}$/.test(form.nik.trim())) errs.nik = 'NIK harus 16 digit angka'
    if (!form.nama_lengkap.trim()) errs.nama_lengkap = 'Nama lengkap wajib diisi'
    if (!form.no_kk.trim()) errs.no_kk = 'No. KK wajib diisi'
    else if (!/^\d{16}$/.test(form.no_kk.trim())) errs.no_kk = 'No. KK harus 16 digit angka'
    if (!form.tempat_lahir.trim()) errs.tempat_lahir = 'Tempat lahir wajib diisi'
    if (!form.tanggal_lahir) errs.tanggal_lahir = 'Tanggal lahir wajib diisi'

    // NIK uniqueness check
    if (!errs.nik) {
      const exists = await checkNikExists(form.nik.trim(), editId)
      if (exists) errs.nik = 'NIK sudah terdaftar'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const valid = await validate()
      if (!valid) return
      await onSubmit({ ...form, nik: form.nik.trim(), nama_lengkap: form.nama_lengkap.trim(), no_kk: form.no_kk.trim() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Identitas */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400/80 border-b border-white/[0.06] pb-2">
          Identitas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label>NIK *</Label>
            <Input
              value={form.nik}
              onChange={(v) => set({ nik: v })}
              placeholder="16 digit NIK"
              maxLength={16}
              error={errors.nik}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>No. KK *</Label>
            <Input
              value={form.no_kk}
              onChange={(v) => set({ no_kk: v })}
              placeholder="16 digit No. KK"
              maxLength={16}
              error={errors.no_kk}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Nama Lengkap *</Label>
          <Input
            value={form.nama_lengkap}
            onChange={(v) => set({ nama_lengkap: v })}
            placeholder="Nama lengkap sesuai KTP"
            error={errors.nama_lengkap}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Hubungan Keluarga</Label>
          <Select
            value={form.hubungan_keluarga}
            onChange={(v) => set({ hubungan_keluarga: v as typeof form.hubungan_keluarga })}
            options={HUBUNGAN_KELUARGA}
          />
        </div>
      </section>

      {/* Data Diri */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400/80 border-b border-white/[0.06] pb-2">
          Data Diri
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label>Jenis Kelamin</Label>
            <Select
              value={form.jenis_kelamin}
              onChange={(v) => set({ jenis_kelamin: v as typeof form.jenis_kelamin })}
              options={JENIS_KELAMIN}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Status Perkawinan</Label>
            <Select
              value={form.status_perkawinan}
              onChange={(v) => set({ status_perkawinan: v as typeof form.status_perkawinan })}
              options={STATUS_PERKAWINAN}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Tempat Lahir *</Label>
            <Input
              value={form.tempat_lahir}
              onChange={(v) => set({ tempat_lahir: v })}
              placeholder="Kota/kabupaten"
              error={errors.tempat_lahir}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Tanggal Lahir *</Label>
            <Input
              type="date"
              value={form.tanggal_lahir}
              onChange={(v) => set({ tanggal_lahir: v })}
              error={errors.tanggal_lahir}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Agama</Label>
            <Select
              value={form.agama}
              onChange={(v) => set({ agama: v as typeof form.agama })}
              options={AGAMA}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Pendidikan</Label>
            <Select
              value={form.pendidikan}
              onChange={(v) => set({ pendidikan: v as typeof form.pendidikan })}
              options={PENDIDIKAN}
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <Label>Pekerjaan</Label>
            <Select
              value={form.pekerjaan}
              onChange={(v) => set({ pekerjaan: v as typeof form.pekerjaan })}
              options={PEKERJAAN}
            />
          </div>
        </div>
      </section>

      {/* Domisili */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400/80 border-b border-white/[0.06] pb-2">
          Domisili
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <Label>RT</Label>
            <Select
              value={form.rt}
              onChange={(v) => set({ rt: v })}
              options={RT_LIST}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>RW</Label>
            <Select
              value={form.rw}
              onChange={(v) => set({ rw: v })}
              options={RW_LIST}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Alamat</Label>
          <Input
            value={form.alamat ?? ''}
            onChange={(v) => set({ alamat: v })}
            placeholder="Contoh: KARANG SENGON"
            error={errors.alamat}
          />
        </div>
      </section>

      {/* Status */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400/80 border-b border-white/[0.06] pb-2">
          Status
        </h2>
        <div className="flex gap-3">
          {(['aktif', 'tidak aktif'] as const).map((s) => (
            <button
              key={s}
              onClick={() => set({ status: s })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                form.status === s
                  ? s === 'aktif'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300'
              }`}
            >
              {s === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
            </button>
          ))}
        </div>
      </section>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-slate-300 hover:bg-white/[0.08] transition-colors"
        >
          Batal
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-sky-500/90 hover:bg-sky-500 text-sm text-white font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {mode === 'edit' ? 'Simpan Perubahan' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}
