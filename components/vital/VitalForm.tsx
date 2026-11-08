'use client'

import { useState } from 'react'
import {
  Check,
  GraduationCap,
  MapPin,
  TriangleAlert,
} from 'lucide-react'
import { PERISTIWA } from '@/lib/visual'
import { Button } from '@/components/ui/button'
import { Field, InBox } from '@/components/ui/field'
import { FormBar, FormCard, SelectBox } from '@/components/ui/rec-parts'
import { useToast } from '@/components/ui/toast'
import { hariIni } from '@/lib/tanggal-lokal'
import { GalatTolak } from '@/lib/galat-tolak'
import { angka16 } from '@/lib/angka'
import { opsiRt, rt3 } from '@/lib/rt-rw'
import { useDusunAktif } from '@/hooks/useDusunAktif'
import { useDrafState } from '@/hooks/useDrafForm'
import { useAppStore } from '@/store/appStore'
import { alamatBawaan, contohAlamat } from '@/lib/wilayah'
import { validasiKelahiran, validasiKematian } from '@/lib/validasi-catatan'
import { useAddLahir, useAddMeninggal } from '@/hooks/useVital'
import type { Lahir, Meninggal, Penduduk } from '@/types'
import {
  AGAMA,
  HUBUNGAN_KELUARGA,
  JENIS_KELAMIN,
  STATUS_PERKAWINAN,
  PENDIDIKAN,
  PEKERJAAN,
} from '@/lib/penduduk-constants'

// ── Form Kelahiran ───────────────────────────────────────────────────────────
// Koleksi lahir — field aktual: nama_lengkap, nik, no_kk, jenis_kelamin,
// agama, hubungan_keluarga, nama_ayah, nama_ibu, rt, rw, status,
// status_perkawinan, tanggal_lahir, tempat_lahir

interface LahirFormProps {
  onSuccess: () => void
  onCancel: () => void
}

// ── Isian Kelahiran: satu sumber untuk form Tambah DAN modal Edit catatan (isiannya selalu sama) ──
export type LahirFormState = {
  nama_lengkap: string
  nik: string
  no_kk: string
  jenis_kelamin: typeof JENIS_KELAMIN[number] | ''
  agama: typeof AGAMA[number] | ''
  hubungan_keluarga: typeof HUBUNGAN_KELUARGA[number] | ''
  nama_ayah: string
  nama_ibu: string
  rt: string
  rw: string
  status: 'aktif'
  status_perkawinan: typeof STATUS_PERKAWINAN[number]
  tanggal_lahir: string
  tempat_lahir: string
  pendidikan: string
  pekerjaan: string
  alamat: string
}

function lahirAwal(): LahirFormState {
  return {
    nama_lengkap: '',
    nik: '',
    no_kk: '',
    // Jenis kelamin dan agama tercetak di KK: dikosongkan agar dipilih sadar, bukan bawaan yang bisa salah diam-diam
    jenis_kelamin: '',
    agama: '',
    hubungan_keluarga: 'Anak',
    nama_ayah: '',
    nama_ibu: '',
    rt: '001',
    rw: '001',
    status: 'aktif',
    status_perkawinan: 'Belum Kawin',
    tanggal_lahir: '',
    tempat_lahir: '',
    // Bayi baru lahir: bawaan yang terlihat dan tercetak di KK (bisa diubah, mis. balita PAUD)
    pendidikan: 'Tidak/Belum Sekolah',
    pekerjaan: 'Tidak/Belum Bekerja',
    alamat: alamatBawaan(useAppStore.getState().wilayah),
  }
}

export function toLahirData(form: LahirFormState): Omit<Lahir, 'id' | 'created_at' | 'created_by'> {
  return {
    nama_lengkap: form.nama_lengkap.trim(),
    nik: form.nik,
    no_kk: form.no_kk,
    jenis_kelamin: form.jenis_kelamin as Lahir['jenis_kelamin'], // sudah divalidasi (wajib dipilih)
    agama: form.agama as Lahir['agama'],
    hubungan_keluarga: form.hubungan_keluarga as Lahir['hubungan_keluarga'],
    nama_ayah: form.nama_ayah.trim(),
    nama_ibu: form.nama_ibu.trim(),
    rt: form.rt,
    rw: form.rw,
    status: form.status,
    status_perkawinan: form.status_perkawinan,
    tanggal_lahir: form.tanggal_lahir,
    tempat_lahir: form.tempat_lahir.trim().toUpperCase(),
    pendidikan: form.pendidikan,
    pekerjaan: form.pekerjaan,
    alamat: form.alamat.trim().toUpperCase(),
  }
}

/** Catatan kelahiran -> isian form (modal Edit). Isian yang kosong di catatan lama memakai bawaan form Tambah. */
export function lahirDariCatatan(row: Lahir): LahirFormState {
  const dasar = lahirAwal()
  return {
    ...dasar,
    nama_lengkap: row.nama_lengkap ?? '',
    nik: row.nik ?? '',
    no_kk: row.no_kk ?? '',
    jenis_kelamin: row.jenis_kelamin ?? '',
    agama: row.agama ?? '',
    hubungan_keluarga: row.hubungan_keluarga ?? '',
    nama_ayah: row.nama_ayah ?? '',
    nama_ibu: row.nama_ibu ?? '',
    rt: (rt3(row.rt) || dasar.rt) as LahirFormState['rt'],
    rw: (rt3(row.rw) || dasar.rw) as LahirFormState['rw'],
    status_perkawinan: row.status_perkawinan ?? dasar.status_perkawinan,
    tanggal_lahir: row.tanggal_lahir ?? '',
    tempat_lahir: row.tempat_lahir ?? '',
    pendidikan: row.pendidikan ?? '',
    pekerjaan: row.pekerjaan ?? '',
    alamat: row.alamat ?? '',
  }
}

export function LahirFields({
  form,
  errors,
  onChange,
}: {
  form: LahirFormState
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
}) {
  const wilayah = useAppStore((s) => s.wilayah)
  const { rtList, rwList, dusunDariRt } = useDusunAktif()
  return (
    <>
    <FormCard
      icon={<PERISTIWA.kelahiran.Icon className="i" style={{ fontSize: 18 }} />}
      title="Data bayi"
      sub="Identitas bayi dan orang tua"
    >
      <div className="a-fg6">
        <Field label="Nama lengkap bayi" htmlFor="lh-nama" req error={errors.nama_lengkap} className="s2 nikkk">
          <InBox error={!!errors.nama_lengkap}>
            <input id="lh-nama" value={form.nama_lengkap} onChange={(e) => onChange('nama_lengkap', e.target.value)} placeholder="Nama lengkap bayi" autoComplete="off" />
          </InBox>
        </Field>
        <Field label="NIK Bayi" htmlFor="lh-nik" req error={errors.nik} className="s2 nikkk">
          <InBox error={!!errors.nik}>
            <input placeholder="16 digit" id="lh-nik" className="mono" inputMode="numeric" value={form.nik} onChange={(e) => onChange('nik', angka16(e.target.value))} autoComplete="off" />
          </InBox>
        </Field>
        <Field label="No. KK" htmlFor="lh-kk" req error={errors.no_kk} className="s2 nikkk">
          <InBox error={!!errors.no_kk}>
            <input placeholder="16 digit" id="lh-kk" className="mono" inputMode="numeric" value={form.no_kk} onChange={(e) => onChange('no_kk', angka16(e.target.value))} autoComplete="off" />
          </InBox>
        </Field>
        <Field label="Jenis kelamin" htmlFor="lh-jk" req error={errors.jenis_kelamin} className="s2">
          <SelectBox id="lh-jk" value={form.jenis_kelamin} onChange={(v) => onChange('jenis_kelamin', v)} options={JENIS_KELAMIN} kosong="Pilih jenis kelamin" error={!!errors.jenis_kelamin} />
        </Field>
        <Field label="Tempat lahir" htmlFor="lh-tempat" req error={errors.tempat_lahir} className="s2">
          <InBox error={!!errors.tempat_lahir}>
            <input id="lh-tempat" value={form.tempat_lahir} onChange={(e) => onChange('tempat_lahir', e.target.value)} placeholder="Kota/Kabupaten" autoComplete="off" />
          </InBox>
        </Field>
        <Field label="Tanggal lahir" htmlFor="lh-tgl" req error={errors.tanggal_lahir} className="s2">
          <InBox error={!!errors.tanggal_lahir}>
            <input id="lh-tgl" type="date" value={form.tanggal_lahir} onChange={(e) => onChange('tanggal_lahir', e.target.value)} />
          </InBox>
        </Field>
        <Field label="Agama" htmlFor="lh-agama" req error={errors.agama} className="s3">
          <SelectBox id="lh-agama" value={form.agama} onChange={(v) => onChange('agama', v)} options={AGAMA} kosong="Pilih agama" error={!!errors.agama} />
        </Field>
        <Field label="Hubungan keluarga" htmlFor="lh-hub" req error={errors.hubungan_keluarga} className="s3">
          <SelectBox id="lh-hub" value={form.hubungan_keluarga} onChange={(v) => onChange('hubungan_keluarga', v)} options={HUBUNGAN_KELUARGA} kosong="Pilih hubungan" error={!!errors.hubungan_keluarga} />
        </Field>
        <Field label="Nama ayah" htmlFor="lh-ayah" req error={errors.nama_ayah} className="s3">
          <InBox error={!!errors.nama_ayah}>
            <input id="lh-ayah" value={form.nama_ayah} onChange={(e) => onChange('nama_ayah', e.target.value)} placeholder="Nama ayah kandung" autoComplete="off" />
          </InBox>
        </Field>
        <Field label="Nama ibu" htmlFor="lh-ibu" req error={errors.nama_ibu} className="s3">
          <InBox error={!!errors.nama_ibu}>
            <input id="lh-ibu" value={form.nama_ibu} onChange={(e) => onChange('nama_ibu', e.target.value)} placeholder="Nama ibu kandung" autoComplete="off" />
          </InBox>
        </Field>
      </div>
    </FormCard>

    <FormCard
      icon={<MapPin className="i" style={{ fontSize: 18 }} />}
      title="Domisili"
      sub="Lokasi tempat tinggal di desa"
    >
      <div className="a-fg6">
        <Field label="RT" htmlFor="lh-rt" className="s1">
          <SelectBox id="lh-rt" value={form.rt} onChange={(v) => onChange('rt', v)} options={opsiRt(rtList, form.rt)} />
        </Field>
        <Field label="RW" htmlFor="lh-rw" className="s1">
          <SelectBox id="lh-rw" value={form.rw} onChange={(v) => onChange('rw', v)} options={opsiRt(rwList, form.rw)} />
        </Field>
        <Field label="Dusun" htmlFor="lh-dusun" className="s4" hint="Otomatis dari RT. Diatur di Pengaturan → Dusun dan RT.">
            <InBox>
              <input id="lh-dusun" value={dusunDariRt(form.rt) || '—'} readOnly tabIndex={-1} aria-readonly="true" />
            </InBox>
          </Field>
          <Field label="Alamat" htmlFor="lh-alamat" req={form.hubungan_keluarga === 'Kepala Keluarga'} opt={form.hubungan_keluarga !== 'Kepala Keluarga'} error={errors.alamat} className="s6">
          <InBox>
            <input id="lh-alamat" value={form.alamat} onChange={(e) => onChange('alamat', e.target.value)} placeholder={contohAlamat(wilayah)} autoComplete="off" />
          </InBox>
        </Field>
      </div>
    </FormCard>

    <FormCard
      icon={<GraduationCap className="i" style={{ fontSize: 18 }} />}
      title="Pendidikan & pekerjaan"
      sub="Boleh dikosongkan untuk bayi baru lahir"
    >
      <div className="a-fg6">
        <Field label="Pendidikan" htmlFor="lh-pend" req error={errors.pendidikan} className="s3">
          <SelectBox id="lh-pend" value={form.pendidikan} onChange={(v) => onChange('pendidikan', v)} options={PENDIDIKAN} kosong="-- Pilih Pendidikan --" error={!!errors.pendidikan} />
        </Field>
        <Field label="Pekerjaan" htmlFor="lh-pek" req error={errors.pekerjaan} className="s3">
          <SelectBox id="lh-pek" value={form.pekerjaan} onChange={(v) => onChange('pekerjaan', v)} options={PEKERJAAN} kosong="-- Pilih Pekerjaan --" error={!!errors.pekerjaan} />
        </Field>
      </div>
    </FormCard>
    </>
  )
}

export function LahirForm({ onSuccess, onCancel }: LahirFormProps) {
  const { mutate, isPending } = useAddLahir()
  const { toast } = useToast()
  const [form, setForm] = useDrafState<LahirFormState>('vital.lahir', 'form', lahirAwal)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '', ...(field === 'hubungan_keluarga' ? { alamat: '' } : {}) }))
  }

  function validate() {
    const e = validasiKelahiran(form)   // aturan dan pesan bersama dengan modal Edit
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const data = toLahirData(form)
    mutate(data, {
      onSuccess: () => { toast('Kelahiran berhasil dicatat', 'success'); onSuccess() },
      onError: (e) => toast(e instanceof GalatTolak ? `Gagal mencatat kelahiran: ${e.message}` : 'Gagal mencatat kelahiran', 'error'),
    })
  }

  return (
    <form
      className="fwrap"
      noValidate
      onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
    >
      <LahirFields form={form} errors={errors} onChange={set} />

      <FormBar>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Batal</Button>
        <Button type="submit" disabled={isPending}>
          <Check className="i" />
          {isPending ? 'Menyimpan...' : 'Simpan kelahiran'}
        </Button>
      </FormBar>
    </form>
  )
}

// ── Form Kematian ────────────────────────────────────────────────────────────
// Koleksi meninggal — field aktual: nama, nik_target, no_kk, hub_asli, sebab, tanggal

interface MeninggalFormProps {
  onSuccess: () => void
  onCancel: () => void
  allPenduduk: Penduduk[]
}

export function MeninggalForm({ onSuccess, onCancel, allPenduduk }: MeninggalFormProps) {
  const { mutate, isPending } = useAddMeninggal()
  const { toast } = useToast()
  const [form, setForm] = useDrafState('vital.meninggal', 'form', () => ({
    nama: '',
    nik_target: '',
    no_kk: '',
    hub_asli: 'Kepala Keluarga' as typeof HUBUNGAN_KELUARGA[number],
    sebab: '',
    tanggal: hariIni(),
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  function validate() {
    const e = validasiKematian(form)   // aturan dan pesan bersama dengan modal Edit
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
    mutate({ data, allPenduduk }, {
      onSuccess: () => { toast('Kematian berhasil dicatat', 'success'); onSuccess() },
      onError: () => toast('Gagal mencatat kematian', 'error'),
    })
  }

  return (
    <form
      className="fwrap"
      noValidate
      onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
    >
      <FormCard
        icon={<PERISTIWA.kematian.Icon className="i" style={{ fontSize: 18 }} />}
        title="Data penduduk yang meninggal"
        sub="Ketik nama, NIK, dan No. KK penduduk"
      >
        {form.hub_asli === 'Kepala Keluarga' && (
          <div className="a-alert warn" style={{ marginBottom: 16 }}>
            <TriangleAlert className="i" />
            <div>
              <b>Penduduk ini akan dicatat sebagai Kepala Keluarga.</b>{' '}
              Sistem akan otomatis menentukan penggantinya (Istri/Anak tertua).
            </div>
          </div>
        )}
        <div className="a-fg6">
          <Field label="Nama lengkap" htmlFor="mn-nama" req error={errors.nama} className="s2 nikkk">
            <InBox error={!!errors.nama}>
              <input id="mn-nama" value={form.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Nama penduduk" autoComplete="off" />
            </InBox>
          </Field>
          <Field label="NIK" htmlFor="mn-nik" req error={errors.nik_target} className="s2 nikkk">
            <InBox error={!!errors.nik_target}>
              <input placeholder="16 digit" id="mn-nik" className="mono" inputMode="numeric" value={form.nik_target} onChange={(e) => set('nik_target', angka16(e.target.value))} autoComplete="off" />
            </InBox>
          </Field>
          <Field label="No. KK" htmlFor="mn-kk" req error={errors.no_kk} className="s2 nikkk">
            <InBox error={!!errors.no_kk}>
              <input placeholder="16 digit" id="mn-kk" className="mono" inputMode="numeric" value={form.no_kk} onChange={(e) => set('no_kk', angka16(e.target.value))} autoComplete="off" />
            </InBox>
          </Field>
          <Field label="Tanggal meninggal" htmlFor="mn-tgl" req error={errors.tanggal} className="s2">
            <InBox error={!!errors.tanggal}>
              <input id="mn-tgl" type="date" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
            </InBox>
          </Field>
          <Field label="Hubungan keluarga" htmlFor="mn-hub" className="s2">
            <SelectBox id="mn-hub" value={form.hub_asli} onChange={(v) => set('hub_asli', v)} options={HUBUNGAN_KELUARGA} />
          </Field>
          <Field label="Sebab kematian" htmlFor="mn-sebab" req error={errors.sebab} className="s2">
            <InBox error={!!errors.sebab}>
              <input id="mn-sebab" value={form.sebab} onChange={(e) => set('sebab', e.target.value)} placeholder="Sakit, Kecelakaan, dll" autoComplete="off" />
            </InBox>
          </Field>
        </div>
      </FormCard>

      <FormBar>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Batal</Button>
        <Button type="submit" disabled={isPending}>
          <Check className="i" />
          {isPending ? 'Menyimpan...' : 'Simpan kematian'}
        </Button>
      </FormBar>
    </form>
  )
}
