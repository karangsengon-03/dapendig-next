'use client'

import { useState } from 'react'
import {
  Check,
  IdCard,
  Info,
  MapPin,
  Plus,
  User,
  Users,
  X,
} from 'lucide-react'
import { PERISTIWA } from '@/lib/visual'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Field, InBox } from '@/components/ui/field'
import { FormBar, FormCard, SelectBox } from '@/components/ui/rec-parts'
import { useAddMutasiKeluar, useAddMutasiMasuk, useAddMutasiMasukBatch } from '@/hooks/useMutasi'
import { useCatatPindahKeluarKeluarga, usePendudukList } from '@/hooks/usePenduduk'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { hariIni } from '@/lib/tanggal-lokal'
import { GalatTolak } from '@/lib/galat-tolak'
import { angka16 } from '@/lib/angka'
import { opsiRt, rt3 } from '@/lib/rt-rw'
import { useDusunAktif } from '@/hooks/useDusunAktif'
import { validasiPindahKeluar, validasiPindahMasuk } from '@/lib/validasi-catatan'
import type { MutasiKeluar, MutasiMasuk } from '@/types'
import {
  AGAMA,
  HUBUNGAN_KELUARGA,
  JENIS_KELAMIN,
  PENDIDIKAN,
  PEKERJAAN,
  STATUS_PERKAWINAN,
  GOLONGAN_DARAH,
} from '@/lib/penduduk-constants'

// ── Pilihan "1 Orang / 1 Keluarga (KK)" (tombol radio gaya .a-opt, seperti dialog Pindah Keluar) ──
type Opsi = 'perorangan' | 'keluarga'

// Golongan darah: opsional (kosong = belum diisi); nilai sama dengan data penduduk yang ada

const PESAN_KK_TANPA_ANGGOTA = 'Tidak ada anggota aktif ditemukan untuk No. KK ini'

function PilihJenis({
  opsi, onPilih, subKeluarga,
}: { opsi: Opsi; onPilih: (o: Opsi) => void; subKeluarga: string }) {
  const daftar: { nilai: Opsi; Ikon: typeof User; judul: string; sub: string }[] = [
    { nilai: 'perorangan', Ikon: User, judul: '1 Orang', sub: 'Hanya yang bersangkutan' },
    { nilai: 'keluarga', Ikon: Users, judul: '1 Keluarga (KK)', sub: subKeluarga },
  ]
  return (
    <div role="radiogroup" aria-label="Pilih jenis pencatatan" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
      {daftar.map(({ nilai, Ikon, judul, sub }) => (
        <button
          key={nilai}
          type="button"
          role="radio"
          aria-checked={opsi === nilai}
          onClick={() => onPilih(nilai)}
          className={cn('a-opt', opsi === nilai && 'on')}
          style={{ textAlign: 'left', cursor: 'pointer' }}
        >
          <div className="oi" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
            <Ikon className="i" style={{ fontSize: 18 }} />
          </div>
          <div>
            <b>{judul}</b>
            <p>{sub}</p>
          </div>
          <span className="rd">{opsi === nilai && <Check className="i" />}</span>
        </button>
      ))}
    </div>
  )
}

// ── Form Pindah Keluar ───────────────────────────────────────────────────────
// Koleksi mutasi_keluar: nama, nik_target, no_kk, alasan, tujuan, tanggal

interface MutasiKeluarFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function MutasiKeluarForm({ onSuccess, onCancel }: MutasiKeluarFormProps) {
  const { mutate, isPending: isPendingSatu } = useAddMutasiKeluar()
  const mutasiKeluarga = useCatatPindahKeluarKeluarga()
  const { data: allPenduduk = [], isLoading: memuatPenduduk } = usePendudukList()
  const { toast } = useToast()
  const [opsi, setOpsi] = useState<Opsi>('perorangan')
  const [form, setForm] = useState({
    nama: '',
    nik_target: '',
    no_kk: '',
    tujuan: '',
    alasan: '',
    tanggal: hariIni(),
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
    // Aturan dan pesan bersama dengan modal Edit (lib/validasi-catatan.ts)
    const e = validasiPindahKeluar(form, opsi === 'perorangan')
    if (opsi === 'keluarga' && anggotaKK.length === 0 && form.no_kk.length === 16) e.no_kk = PESAN_KK_TANPA_ANGGOTA
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
      mutate(data, {
        onSuccess: () => { toast('Pindah keluar berhasil dicatat', 'success'); onSuccess() },
        onError: () => toast('Gagal mencatat pindah keluar', 'error'),
      })
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
  const keluargaKosong = opsi === 'keluarga' && form.no_kk.length === 16 && anggotaKK.length === 0
  // Tampil langsung sebagai galat isian No. KK (bukan pratinjau netral) begitu daftar penduduk selesai dimuat
  const galatKK = errors.no_kk || (keluargaKosong && !memuatPenduduk ? PESAN_KK_TANPA_ANGGOTA : '')

  return (
    <form
      className="fwrap"
      noValidate
      onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}
    >
      <FormCard
        icon={<PERISTIWA.pindah_keluar.Icon className="i" style={{ fontSize: 18 }} />}
        title="Penduduk yang pindah"
        sub={opsi === 'perorangan' ? 'Ketik nama, NIK, dan No. KK penduduk' : 'Ketik No. KK; seluruh anggota aktif ikut dicatat'}
      >
        <PilihJenis opsi={opsi} onPilih={setOpsi} subKeluarga="Seluruh anggota KK aktif" />

        <div className="a-fg6" style={{ marginTop: 16 }}>
          {opsi === 'perorangan' && (
            <>
              <Field label="Nama Lengkap" htmlFor="mk-nama" req error={errors.nama} className="s6 nikkk">
                <InBox error={!!errors.nama}>
                  <input id="mk-nama" value={form.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Nama penduduk" autoComplete="off" />
                </InBox>
              </Field>
              <Field label="NIK" htmlFor="mk-nik" req error={errors.nik_target} className="s3 nikkk">
                <InBox error={!!errors.nik_target}>
                  <input placeholder="16 digit" id="mk-nik" className="mono" inputMode="numeric" value={form.nik_target} onChange={(e) => set('nik_target', angka16(e.target.value))} autoComplete="off" />
                </InBox>
              </Field>
            </>
          )}
          <Field label="No. KK" htmlFor="mk-kk" req error={galatKK} className={(opsi === 'perorangan' ? 's3' : 's6') + ' nikkk'}>
            <InBox error={!!galatKK}>
              <input placeholder="16 digit" id="mk-kk" className="mono" inputMode="numeric" value={form.no_kk} onChange={(e) => set('no_kk', angka16(e.target.value))} autoComplete="off" />
            </InBox>
          </Field>
        </div>

        {/* Preview anggota KK (opsi keluarga) */}
        {opsi === 'keluarga' && form.no_kk.length === 16 && anggotaKK.length > 0 && (
          <div className="a-alert info" style={{ marginTop: 14 }}>
            <Users className="i" />
            <div>
              <b>{anggotaKK.length} anggota KK aktif akan dicatat pindah</b>
              {anggotaKK.map((p) => (
                <div key={p.id}>
                  {p.nama_lengkap}
                  <span style={{ color: 'var(--ink-3)', marginLeft: 4 }}>({p.hubungan_keluarga})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </FormCard>

      <FormCard
        icon={<MapPin className="i" style={{ fontSize: 18 }} />}
        title="Rincian kepindahan"
        sub="Tanggal, tujuan, dan alasan pindah"
      >
        <div className="a-fg6">
          <Field label="Tanggal Pindah" htmlFor="mk-tanggal" req error={errors.tanggal} className="s2">
            <InBox error={!!errors.tanggal}>
              <input id="mk-tanggal" type="date" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
            </InBox>
          </Field>
          <Field label="Tujuan Pindah" htmlFor="mk-tujuan" req error={errors.tujuan} className="s4">
            <InBox error={!!errors.tujuan} icon={<MapPin className="i" />}>
              <input id="mk-tujuan" value={form.tujuan} onChange={(e) => set('tujuan', e.target.value)} placeholder="Kota/Desa tujuan" autoComplete="off" />
            </InBox>
          </Field>
          <Field label="Alasan Pindah" htmlFor="mk-alasan" opt className="s6">
            <InBox>
              <input id="mk-alasan" value={form.alasan} onChange={(e) => set('alasan', e.target.value)} placeholder="Menikah, Pekerjaan, dll" autoComplete="off" />
            </InBox>
          </Field>
        </div>
      </FormCard>

      <FormBar>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Batal</Button>
        <Button type="submit" disabled={isPending || keluargaKosong}>
          <Check className="i" />
          {isPending ? 'Menyimpan...' : 'Simpan pindah keluar'}
        </Button>
      </FormBar>
    </form>
  )
}

// ── Form Pindah Masuk ────────────────────────────────────────────────────────
// Koleksi mutasi_masuk: data lengkap seperti penduduk + asal_daerah + tanggal
// Opsi: 1 Orang (langsung submit) | 1 Keluarga (kumpul anggota dulu, submit batch)

interface MutasiMasukFormProps {
  onSuccess: () => void
  onCancel: () => void
}

// Form data untuk satu anggota
export type AnggotaForm = {
  nama_lengkap: string
  nik: string
  no_kk: string
  jenis_kelamin: typeof JENIS_KELAMIN[number] | ''
  agama: typeof AGAMA[number] | ''
  asal_daerah: string
  hubungan_keluarga: typeof HUBUNGAN_KELUARGA[number] | ''
  nama_ayah: string
  nama_ibu: string
  pekerjaan: string
  pendidikan: string
  rt: string
  rw: string
  status: 'aktif'
  status_perkawinan: typeof STATUS_PERKAWINAN[number] | ''
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
    // Pilihan yang tercetak di KK dikosongkan: harus dipilih sadar, bukan bawaan yang bisa salah diam-diam
    jenis_kelamin: '',
    agama: '',
    asal_daerah: '',
    hubungan_keluarga: '',
    nama_ayah: '',
    nama_ibu: '',
    pekerjaan: '',
    pendidikan: '',
    rt: '001',
    rw: '001',
    status: 'aktif',
    status_perkawinan: '',
    tanggal,
    tanggal_lahir: '',
    tempat_lahir: '',
    golongan_darah: '',
    alamat: 'KARANG SENGON',
  }
}

function validateAnggota(form: AnggotaForm): Record<string, string> {
  return validasiPindahMasuk(form)
}

const PESAN_NIK_KEMBAR = 'NIK ini sudah ada di daftar anggota'
const PESAN_KEPALA_GANDA = 'KK ini sudah punya Kepala Keluarga di daftar'

/** Aturan form Tambah + NIK tidak boleh kembar dengan anggota yang sudah ada di daftar (opsi keluarga). */
function periksaAnggota(form: AnggotaForm, daftar: AnggotaForm[]): Record<string, string> {
  const e = validateAnggota(form)
  if (!e.nik && daftar.some((a) => a.nik === form.nik)) e.nik = PESAN_NIK_KEMBAR
  // KK hanya boleh punya satu Kepala Keluarga (KK mencetak satu nama kepala keluarga)
  if (!e.hubungan_keluarga && form.hubungan_keluarga === 'Kepala Keluarga' && daftar.some((a) => a.hubungan_keluarga === 'Kepala Keluarga')) {
    e.hubungan_keluarga = PESAN_KEPALA_GANDA
  }
  return e
}

/**
 * Apakah ada anggota yang sedang diisi di formulir? Hanya isian identitas yang dihitung; isian yang terbawa
 * dari anggota sebelumnya (No. KK, asal daerah, tanggal masuk, RT/RW, alamat) dan pilihan bawaan tidak dihitung.
 */
function anggotaSedangDiisi(f: AnggotaForm): boolean {
  return [f.nama_lengkap, f.nik, f.tempat_lahir, f.tanggal_lahir, f.nama_ayah, f.nama_ibu].some((v) => v.trim() !== '')
}

export function toMutasiMasukData(form: AnggotaForm): Omit<MutasiMasuk, 'id' | 'created_at' | 'updated_at' | 'created_by'> {
  return {
    nama_lengkap: form.nama_lengkap.trim(),
    nik: form.nik,
    no_kk: form.no_kk,
    jenis_kelamin: form.jenis_kelamin as MutasiMasuk['jenis_kelamin'], // sudah divalidasi (wajib dipilih)
    agama: form.agama as MutasiMasuk['agama'],
    asal_daerah: form.asal_daerah.trim(),
    hubungan_keluarga: form.hubungan_keluarga as MutasiMasuk['hubungan_keluarga'],
    nama_ayah: form.nama_ayah.trim(),
    nama_ibu: form.nama_ibu.trim(),
    pekerjaan: form.pekerjaan,
    pendidikan: form.pendidikan,
    rt: form.rt,
    rw: form.rw,
    status: form.status,
    status_perkawinan: form.status_perkawinan as MutasiMasuk['status_perkawinan'],
    tanggal: form.tanggal,
    tanggal_lahir: form.tanggal_lahir,
    tempat_lahir: form.tempat_lahir.trim().toUpperCase(),
    golongan_darah: form.golongan_darah,
    alamat: form.alamat.trim().toUpperCase(),
  }
}

/** Catatan pindah masuk -> isian form (modal Edit). Isian yang kosong di catatan lama memakai bawaan form Tambah. */
export function anggotaDariCatatan(row: MutasiMasuk): AnggotaForm {
  const dasar = emptyAnggotaForm(row.tanggal ?? '')
  return {
    ...dasar,
    nama_lengkap: row.nama_lengkap ?? '',
    nik: row.nik ?? '',
    no_kk: row.no_kk ?? '',
    jenis_kelamin: row.jenis_kelamin ?? '',
    agama: row.agama ?? '',
    asal_daerah: row.asal_daerah ?? '',
    hubungan_keluarga: row.hubungan_keluarga ?? '',
    nama_ayah: row.nama_ayah ?? '',
    nama_ibu: row.nama_ibu ?? '',
    pekerjaan: row.pekerjaan ?? '',
    pendidikan: row.pendidikan ?? '',
    rt: (rt3(row.rt) || dasar.rt) as AnggotaForm['rt'],
    rw: (rt3(row.rw) || dasar.rw) as AnggotaForm['rw'],
    status_perkawinan: row.status_perkawinan ?? '',
    tanggal: row.tanggal ?? '',
    tanggal_lahir: row.tanggal_lahir ?? '',
    tempat_lahir: row.tempat_lahir ?? '',
    golongan_darah: row.golongan_darah ?? '',
    alamat: row.alamat ?? '',
  }
}

// ── Isian satu anggota (dipakai di kedua opsi Tambah DAN modal Edit catatan, supaya isiannya selalu sama) ──
export function AnggotaFields({
  form,
  errors,
  onChange,
}: {
  form: AnggotaForm
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
}) {
  const { rtList, rwList, dusunDariRt } = useDusunAktif()
  return (
    <>
      <FormCard
        icon={<IdCard className="i" style={{ fontSize: 18 }} />}
        title="Identitas & keluarga"
        sub="Sesuai KTP dan Kartu Keluarga"
      >
        <div className="a-fg6">
          <Field label="Nama Lengkap" htmlFor="pm-nama" req error={errors.nama_lengkap} className="s2 nikkk">
            <InBox error={!!errors.nama_lengkap}>
              <input id="pm-nama" value={form.nama_lengkap} onChange={(e) => onChange('nama_lengkap', e.target.value)} placeholder="Nama lengkap" autoComplete="off" />
            </InBox>
          </Field>
          <Field label="NIK" htmlFor="pm-nik" req error={errors.nik} className="s2 nikkk">
            <InBox error={!!errors.nik}>
              <input placeholder="16 digit" id="pm-nik" className="mono" inputMode="numeric" value={form.nik} onChange={(e) => onChange('nik', angka16(e.target.value))} autoComplete="off" />
            </InBox>
          </Field>
          <Field label="No. KK" htmlFor="pm-kk" req error={errors.no_kk} className="s2 nikkk">
            <InBox error={!!errors.no_kk}>
              <input placeholder="16 digit" id="pm-kk" className="mono" inputMode="numeric" value={form.no_kk} onChange={(e) => onChange('no_kk', angka16(e.target.value))} autoComplete="off" />
            </InBox>
          </Field>
          <Field label="Asal Daerah" htmlFor="pm-asal" req error={errors.asal_daerah} className="s2">
            <InBox error={!!errors.asal_daerah}>
              <input id="pm-asal" value={form.asal_daerah} onChange={(e) => onChange('asal_daerah', e.target.value)} placeholder="Kota/Desa asal" autoComplete="off" />
            </InBox>
          </Field>
          <Field label="Tanggal Masuk" htmlFor="pm-tanggal" req error={errors.tanggal} className="s2">
            <InBox error={!!errors.tanggal}>
              <input id="pm-tanggal" type="date" value={form.tanggal} onChange={(e) => onChange('tanggal', e.target.value)} />
            </InBox>
          </Field>
          <Field label="Jenis Kelamin" htmlFor="pm-jk" req error={errors.jenis_kelamin} className="s2">
            <SelectBox id="pm-jk" value={form.jenis_kelamin} onChange={(v) => onChange('jenis_kelamin', v)} options={JENIS_KELAMIN} kosong="Pilih jenis kelamin" error={!!errors.jenis_kelamin} />
          </Field>
        </div>
      </FormCard>

      <FormCard
        icon={<User className="i" style={{ fontSize: 18 }} />}
        title="Data diri"
        sub="Kelahiran dan status"
      >
        <div className="a-fg6">
          <Field label="Tempat Lahir" htmlFor="pm-tempat" req error={errors.tempat_lahir} className="s2">
            <InBox error={!!errors.tempat_lahir}>
              <input id="pm-tempat" value={form.tempat_lahir} onChange={(e) => onChange('tempat_lahir', e.target.value)} placeholder="Kota/Kabupaten" autoComplete="off" />
            </InBox>
          </Field>
          <Field label="Tanggal Lahir" htmlFor="pm-tgllahir" req error={errors.tanggal_lahir} className="s2">
            <InBox error={!!errors.tanggal_lahir}>
              <input id="pm-tgllahir" type="date" value={form.tanggal_lahir} onChange={(e) => onChange('tanggal_lahir', e.target.value)} />
            </InBox>
          </Field>
          <Field label="Agama" htmlFor="pm-agama" req error={errors.agama} className="s2">
            <SelectBox id="pm-agama" value={form.agama} onChange={(v) => onChange('agama', v)} options={AGAMA} kosong="Pilih agama" error={!!errors.agama} />
          </Field>
          <Field label="Hubungan Keluarga" htmlFor="pm-hub" req error={errors.hubungan_keluarga} className="s2">
            <SelectBox id="pm-hub" value={form.hubungan_keluarga} onChange={(v) => onChange('hubungan_keluarga', v)} options={HUBUNGAN_KELUARGA} kosong="Pilih hubungan" error={!!errors.hubungan_keluarga} />
          </Field>
          <Field label="Status Perkawinan" htmlFor="pm-kawin" req error={errors.status_perkawinan} className="s2">
            <SelectBox id="pm-kawin" value={form.status_perkawinan} onChange={(v) => onChange('status_perkawinan', v)} options={STATUS_PERKAWINAN} kosong="Pilih status" error={!!errors.status_perkawinan} />
          </Field>
          <Field label="Pendidikan" htmlFor="pm-pend" req error={errors.pendidikan} className="s2">
            <SelectBox id="pm-pend" value={form.pendidikan} onChange={(v) => onChange('pendidikan', v)} options={PENDIDIKAN} kosong="Pilih pendidikan" error={!!errors.pendidikan} />
          </Field>
          <Field label="Pekerjaan" htmlFor="pm-pek" req error={errors.pekerjaan} className="s2">
            <SelectBox id="pm-pek" value={form.pekerjaan} onChange={(v) => onChange('pekerjaan', v)} options={PEKERJAAN} kosong="Pilih pekerjaan" error={!!errors.pekerjaan} />
          </Field>
          <Field label="Nama Ayah" htmlFor="pm-ayah" opt className="s2">
            <InBox>
              <input id="pm-ayah" value={form.nama_ayah} onChange={(e) => onChange('nama_ayah', e.target.value)} placeholder="Nama ayah kandung" autoComplete="off" />
            </InBox>
          </Field>
          <Field label="Nama Ibu" htmlFor="pm-ibu" opt className="s2">
            <InBox>
              <input id="pm-ibu" value={form.nama_ibu} onChange={(e) => onChange('nama_ibu', e.target.value)} placeholder="Nama ibu kandung" autoComplete="off" />
            </InBox>
          </Field>
          <Field label="Golongan Darah" htmlFor="pm-goldarah" opt className="s2">
            <SelectBox id="pm-goldarah" value={form.golongan_darah} onChange={(v) => onChange('golongan_darah', v)} options={GOLONGAN_DARAH} kosong="Belum diisi" />
          </Field>
        </div>
      </FormCard>

      <FormCard
        icon={<MapPin className="i" style={{ fontSize: 18 }} />}
        title="Domisili"
        sub="Lokasi tempat tinggal di desa"
      >
        <div className="a-fg6">
          <Field label="RT" htmlFor="pm-rt" className="s1">
            <SelectBox id="pm-rt" value={form.rt} onChange={(v) => onChange('rt', v)} options={opsiRt(rtList, form.rt)} />
          </Field>
          <Field label="RW" htmlFor="pm-rw" className="s1">
            <SelectBox id="pm-rw" value={form.rw} onChange={(v) => onChange('rw', v)} options={opsiRt(rwList, form.rw)} />
          </Field>
          <Field label="Dusun" htmlFor="pm-dusun" className="s4" hint="Otomatis dari RT. Diatur di Pengaturan → Dusun dan RT.">
            <InBox>
              <input id="pm-dusun" value={dusunDariRt(form.rt) || '—'} readOnly tabIndex={-1} aria-readonly="true" />
            </InBox>
          </Field>
          <Field label="Alamat" htmlFor="pm-alamat" req={form.hubungan_keluarga === 'Kepala Keluarga'} opt={form.hubungan_keluarga !== 'Kepala Keluarga'} error={errors.alamat} className="s6">
            <InBox>
              <input id="pm-alamat" value={form.alamat} onChange={(e) => onChange('alamat', e.target.value)} placeholder="Contoh: KARANG SENGON" autoComplete="off" />
            </InBox>
          </Field>
        </div>
      </FormCard>
    </>
  )
}

export function MutasiMasukForm({ onSuccess, onCancel }: MutasiMasukFormProps) {
  const { mutate, isPending: isPendingSatu } = useAddMutasiMasuk()
  const batchMutation = useAddMutasiMasukBatch()
  const { toast } = useToast()
  const today = hariIni()

  const [opsi, setOpsi] = useState<Opsi>('perorangan')

  // State untuk form anggota aktif (dipakai di kedua opsi)
  const [form, setFormState] = useState<AnggotaForm>(emptyAnggotaForm(today))
  const [errors, setErrors] = useState<Record<string, string>>({})

  // State untuk daftar anggota yang sudah ditambahkan (opsi keluarga)
  const [daftarAnggota, setDaftarAnggota] = useState<AnggotaForm[]>([])

  function handleChange(field: string, value: string) {
    setFormState((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '', ...(field === 'hubungan_keluarga' ? { alamat: '' } : {}) }))
  }

  function handleGantiOpsi(o: Opsi) {
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
    mutate(toMutasiMasukData(form), {
      onSuccess: () => { toast('Pindah masuk berhasil dicatat', 'success'); onSuccess() },
      onError: () => toast('Gagal mencatat pindah masuk', 'error'),
    })
  }

  // Opsi keluarga: tambah anggota ke daftar
  function handleTambahAnggota() {
    const errs = periksaAnggota(form, daftarAnggota)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setDaftarAnggota((prev) => [...prev, { ...form }])
    // Reset form tapi pertahankan no_kk, asal_daerah, tanggal, rt, rw, alamat, agama (satu KK umumnya seagama)
    setFormState((prev) => ({
      ...emptyAnggotaForm(prev.tanggal),
      no_kk: prev.no_kk,
      asal_daerah: prev.asal_daerah,
      rt: prev.rt,
      rw: prev.rw,
      alamat: prev.alamat,
      agama: prev.agama,
      tanggal: prev.tanggal,
    }))
    setErrors({})
  }

  function handleHapusAnggota(idx: number) {
    setDaftarAnggota((prev) => prev.filter((_, i) => i !== idx))
  }

  // Anggota yang sedang diisi di formulir (belum diklik "Tambah Anggota") ikut dihitung dan disimpan:
  // dulu hanya isi daftar yang tersimpan sehingga anggota terakhir hilang tanpa pesan apa pun.
  const sedangDiisi = opsi === 'keluarga' && anggotaSedangDiisi(form)
  const jumlahSimpan = daftarAnggota.length + (sedangDiisi ? 1 : 0)

  // Opsi keluarga: simpan semua (daftar + anggota yang sedang diisi) dalam satu commit atomik
  async function handleSubmitKeluarga() {
    let daftar = daftarAnggota
    if (sedangDiisi) {
      const errs = periksaAnggota(form, daftarAnggota)
      if (Object.keys(errs).length > 0) {
        setErrors(errs)
        toast('Data anggota yang sedang diisi belum lengkap. Lengkapi, atau kosongkan isiannya.', 'error')
        return
      }
      daftar = [...daftarAnggota, { ...form }]
    }
    setErrors({})
    if (daftar.length === 0) {
      setErrors({ _global: 'Minimal 1 anggota harus ditambahkan' })
      return
    }
    try {
      await batchMutation.mutateAsync(daftar.map(toMutasiMasukData))
      toast(`${daftar.length} anggota KK berhasil dicatat pindah masuk`, 'success')
      onSuccess()
    } catch (e) {
      // Form tetap terbuka dengan daftar anggota utuh; simpan bersifat atomik, jadi mencoba lagi tidak menggandakan data
      toast(e instanceof GalatTolak ? `Gagal mencatat pindah masuk: ${e.message}` : 'Gagal mencatat pindah masuk', 'error')
    }
  }

  const isPending = isPendingSatu || batchMutation.isPending

  return (
    <form
      className="fwrap"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        // Enter di opsi keluarga menambah anggota; di opsi perorangan menyimpan.
        if (opsi === 'perorangan') handleSubmitPerorangan()
        else handleTambahAnggota()
      }}
    >
      <PilihJenis opsi={opsi} onPilih={handleGantiOpsi} subKeluarga="Kumpulkan anggota, simpan sekaligus" />

      {/* Daftar anggota yang sudah ditambahkan (opsi keluarga) */}
      {opsi === 'keluarga' && daftarAnggota.length > 0 && (
        <div className="a-card">
          <div className="ch">
            <div>
              <h3>{daftarAnggota.length} anggota siap disimpan</h3>
              <p>Klik &ldquo;Simpan Semua&rdquo; jika sudah selesai</p>
            </div>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {daftarAnggota.map((a, i) => (
              <div key={i} className="a-lc" style={{ cursor: 'default' }}>
                <Avatar nama={a.nama_lengkap} jk={a.jenis_kelamin} size={40} />
                <div className="m">
                  <b>{a.nama_lengkap}</b>
                  <span>{a.hubungan_keluarga}</span>
                  <span className="mn">{a.nik}</span>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Hapus ${a.nama_lengkap} dari daftar`}
                  onClick={() => handleHapusAnggota(i)}
                >
                  <X className="i" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {opsi === 'keluarga' && (
        <div className="a-alert info">
          <Info className="i" />
          <div>
            Isi data setiap anggota lalu klik &ldquo;Tambah Anggota&rdquo; untuk anggota berikutnya. Saat klik &ldquo;Simpan Semua&rdquo;, anggota yang sedang diisi di formulir ikut tersimpan.
          </div>
        </div>
      )}

      <AnggotaFields form={form} errors={errors} onChange={handleChange} />

      {errors._global && <p className="a-err" role="alert">{errors._global}</p>}

      <FormBar>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Batal</Button>
        {opsi === 'perorangan' ? (
          <Button type="submit" disabled={isPending}>
            <Check className="i" />
            {isPending ? 'Menyimpan...' : 'Simpan pindah masuk'}
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={handleTambahAnggota} disabled={isPending}>
              <Plus className="i" />Tambah Anggota
            </Button>
            <Button
              type="button"
              onClick={() => { void handleSubmitKeluarga() }}
              disabled={isPending || jumlahSimpan === 0}
            >
              <Check className="i" />
              {isPending ? 'Menyimpan...' : `Simpan Semua (${jumlahSimpan})`}
            </Button>
          </>
        )}
      </FormBar>
    </form>
  )
}
