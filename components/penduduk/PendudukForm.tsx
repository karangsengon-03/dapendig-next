'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, CircleX, IdCard, Loader2, MapPin, Save, User, Users, Check, type LucideIcon } from 'lucide-react'
import { JkIkon } from '@/components/ui/jk-ikon'
import { opsiRt } from '@/lib/rt-rw'
import { useDusunAktif } from '@/hooks/useDusunAktif'
import { useAppStore } from '@/store/appStore'
import { contohAlamat } from '@/lib/wilayah'
import {
  HUBUNGAN_KELUARGA,
  JENIS_KELAMIN,
  AGAMA,
  PENDIDIKAN,
  PEKERJAAN,
  STATUS_PERKAWINAN,
  GOLONGAN_DARAH,
} from '@/lib/penduduk-constants'
import { formatTanggalLahir } from '@/lib/dateUtils'
import { angka16 } from '@/lib/angka'
import { validasiIsianKK } from '@/lib/validasi-catatan'
import { checkNikExists } from '@/hooks/usePenduduk'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Field, InBox, SelectIn } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import type { PendudukFormData } from '@/types'

const EMPTY: PendudukFormData = {
  nik: '',
  nama_lengkap: '',
  no_kk: '',
  // Pilihan yang tercetak di KK dikosongkan bila data lama tidak punya: harus dipilih sadar, bukan bawaan yang diam-diam salah
  hubungan_keluarga: '' as PendudukFormData['hubungan_keluarga'],
  nama_ayah: '',
  nama_ibu: '',
  jenis_kelamin: '' as PendudukFormData['jenis_kelamin'],
  tempat_lahir: '',
  tanggal_lahir: '',
  agama: '' as PendudukFormData['agama'],
  pendidikan: '' as PendudukFormData['pendidikan'],
  pekerjaan: '' as PendudukFormData['pekerjaan'],
  status_perkawinan: '' as PendudukFormData['status_perkawinan'],
  golongan_darah: '',
  rt: '001',
  rw: '001',
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

// Daftar isian untuk panel "Perubahan": urutan = urutan form; nilai dibandingkan dari data yang sudah ada di form (tanpa query).
const FIELD_PERUBAHAN: { key: keyof PendudukFormData; label: string; fmt?: (v: string) => string }[] = [
  { key: 'nik', label: 'NIK' },
  { key: 'no_kk', label: 'No. KK' },
  { key: 'nama_lengkap', label: 'Nama lengkap' },
  { key: 'hubungan_keluarga', label: 'Hubungan keluarga' },
  { key: 'nama_ayah', label: 'Nama ayah' },
  { key: 'nama_ibu', label: 'Nama ibu' },
  { key: 'jenis_kelamin', label: 'Jenis kelamin' },
  { key: 'status_perkawinan', label: 'Status perkawinan' },
  { key: 'tempat_lahir', label: 'Tempat lahir' },
  { key: 'tanggal_lahir', label: 'Tanggal lahir', fmt: formatTanggalLahir },
  { key: 'agama', label: 'Agama' },
  { key: 'pendidikan', label: 'Pendidikan' },
  { key: 'pekerjaan', label: 'Pekerjaan' },
  { key: 'golongan_darah', label: 'Golongan darah' },
  { key: 'rt', label: 'RT' },
  { key: 'rw', label: 'RW' },
  { key: 'alamat', label: 'Alamat' },
  { key: 'status', label: 'Status', fmt: (s) => (s === 'aktif' ? 'Aktif' : s === 'tidak aktif' ? 'Tidak aktif' : s) },
]

const STATUS_BADGE: Record<string, { label: string; kelas: string }> = {
  'aktif': { label: 'Aktif', kelas: 'ok' },
  'tidak aktif': { label: 'Tidak aktif', kelas: 'mute' },
  'meninggal': { label: 'Meninggal', kelas: 'bad' },
  'mutasi-keluar': { label: 'Pindah keluar', kelas: 'warn' },
}

function tampilNilai(f: (typeof FIELD_PERUBAHAN)[number], v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v)
  if (!s) return '—'
  return f.fmt ? f.fmt(s) : s
}

function FormCard({ Icon, title, sub, children }: { Icon: LucideIcon; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="a-card">
      <div className="ch">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            className="a-avatar"
            style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--navy-100)', color: 'var(--navy-700)' }}
          >
            <Icon className="i" style={{ fontSize: 18 }} />
          </div>
          <div>
            <h3>{title}</h3>
            <p>{sub}</p>
          </div>
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

export function PendudukForm({
  mode,
  initial,
  editId,
  onSubmit,
}: PendudukFormProps) {
  const { rtList, rwList, dusunDariRt } = useDusunAktif()
  const wilayah = useAppStore((s) => s.wilayah)
  const router = useRouter()
  // Nilai awal (untuk panel Perubahan dan kartu identitas) dibekukan saat form dibuka
  const [awal] = useState<PendudukFormData>(() => ({ ...EMPTY, ...initial }))
  const [form, setForm] = useState<PendudukFormData>(awal)
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
    // Pilihan yang tercetak di KK wajib terisi; alamat wajib untuk Kepala Keluarga
    Object.assign(errs, validasiIsianKK(form))

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
      await onSubmit({
        ...form,
        status: statusTerkunci ? awal.status : form.status,
        nik: form.nik.trim(),
        nama_lengkap: form.nama_lengkap.trim(),
        no_kk: form.no_kk.trim(),
      })
    } finally {
      setLoading(false)
    }
  }

  const perubahan = FIELD_PERUBAHAN.filter(
    (f) => String(form[f.key] ?? '') !== String(awal[f.key] ?? '')
  )
  const badgeAwal = STATUS_BADGE[awal.status]
  // Status yang dicatat lewat Mutasi/Kematian tidak boleh diubah dari form ini (catatannya tidak ikut berubah)
  const statusTerkunci = awal.status === 'meninggal' || awal.status === 'mutasi-keluar'

  return (
    <div className="editgrid">
      <div className="col" style={{ gap: 16 }}>
        {/* Identitas & keluarga */}
        <FormCard Icon={IdCard} title="Identitas & keluarga" sub="Sesuai KTP dan Kartu Keluarga">
          <div className="a-fg6">
            <Field label="NIK" htmlFor="f-nik" req error={errors.nik} className="s3 nikkk">
              <InBox error={!!errors.nik} icon={<IdCard className="i" />}>
                <input
                  id="f-nik"
                  className="mono"
                  inputMode="numeric"
                  value={form.nik}
                  onChange={(e) => set({ nik: angka16(e.target.value) })}
                  placeholder="16 digit NIK"
                  autoComplete="off"
                />
                <span className="sfx">{form.nik.length}/16</span>
              </InBox>
            </Field>
            <Field label="No. KK" htmlFor="f-kk" req error={errors.no_kk} className="s3 nikkk">
              <InBox error={!!errors.no_kk} icon={<Users className="i" />}>
                <input
                  id="f-kk"
                  className="mono"
                  inputMode="numeric"
                  value={form.no_kk}
                  onChange={(e) => set({ no_kk: angka16(e.target.value) })}
                  placeholder="16 digit No. KK"
                  autoComplete="off"
                />
                <span className="sfx">{form.no_kk.length}/16</span>
              </InBox>
            </Field>
            <Field label="Nama lengkap" htmlFor="f-nama" req error={errors.nama_lengkap} className="s6">
              <InBox error={!!errors.nama_lengkap}>
                <input
                  id="f-nama"
                  value={form.nama_lengkap}
                  onChange={(e) => set({ nama_lengkap: e.target.value })}
                  placeholder="Nama lengkap sesuai KTP"
                  autoComplete="off"
                />
              </InBox>
            </Field>
            <Field label="Hubungan keluarga" htmlFor="f-hub" req error={errors.hubungan_keluarga} className="s2">
              <SelectIn
                id="f-hub"
                value={form.hubungan_keluarga}
                onChange={(v) => set({ hubungan_keluarga: v as typeof form.hubungan_keluarga })}
                options={HUBUNGAN_KELUARGA}
                  kosong="Pilih hubungan"
                  error={!!errors.hubungan_keluarga}
              />
            </Field>
            <Field label="Nama ayah" htmlFor="f-ayah" opt className="s2">
              <InBox>
                <input
                  id="f-ayah"
                  value={form.nama_ayah ?? ''}
                  onChange={(e) => set({ nama_ayah: e.target.value })}
                  placeholder="Nama ayah kandung"
                  autoComplete="off"
                />
              </InBox>
            </Field>
            <Field label="Nama ibu" htmlFor="f-ibu" opt className="s2">
              <InBox>
                <input
                  id="f-ibu"
                  value={form.nama_ibu ?? ''}
                  onChange={(e) => set({ nama_ibu: e.target.value })}
                  placeholder="Nama ibu kandung"
                  autoComplete="off"
                />
              </InBox>
            </Field>
          </div>
        </FormCard>

        {/* Data diri */}
        <FormCard Icon={User} title="Data diri" sub="Kelahiran, pendidikan, dan pekerjaan">
          <div className="a-fg6">
            <Field label="Jenis kelamin" req error={errors.jenis_kelamin} className="s3">
              <div className="a-seg full sgr" style={{ height: 44, padding: 3 }} role="radiogroup" aria-label="Jenis kelamin">
                {JENIS_KELAMIN.map((j) => (
                  <label key={j}>
                    <input
                      type="radio"
                      name="jenis_kelamin"
                      value={j}
                      checked={form.jenis_kelamin === j}
                      onChange={() => set({ jenis_kelamin: j })}
                    />
                    <span><JkIkon jk={j} size={15} />{j}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Status perkawinan" htmlFor="f-kawin" req error={errors.status_perkawinan} className="s3">
              <SelectIn
                id="f-kawin"
                value={form.status_perkawinan}
                onChange={(v) => set({ status_perkawinan: v as typeof form.status_perkawinan })}
                options={STATUS_PERKAWINAN}
                  kosong="Pilih status"
                  error={!!errors.status_perkawinan}
              />
            </Field>
            <Field label="Tempat lahir" htmlFor="f-tempat" req error={errors.tempat_lahir} className="s3">
              <InBox error={!!errors.tempat_lahir}>
                <input
                  id="f-tempat"
                  value={form.tempat_lahir}
                  onChange={(e) => set({ tempat_lahir: e.target.value })}
                  placeholder="Kota/kabupaten"
                  autoComplete="off"
                />
              </InBox>
            </Field>
            <Field label="Tanggal lahir" htmlFor="f-tgl" req error={errors.tanggal_lahir} className="s3">
              <InBox error={!!errors.tanggal_lahir}>
                <input
                  id="f-tgl"
                  type="date"
                  value={form.tanggal_lahir}
                  onChange={(e) => set({ tanggal_lahir: e.target.value })}
                />
              </InBox>
            </Field>
            <Field label="Agama" htmlFor="f-agama" req error={errors.agama} className="s2">
              <SelectIn
                id="f-agama"
                value={form.agama}
                onChange={(v) => set({ agama: v as typeof form.agama })}
                options={AGAMA}
                  kosong="Pilih agama"
                  error={!!errors.agama}
              />
            </Field>
            <Field label="Pendidikan" htmlFor="f-pend" req error={errors.pendidikan} className="s4">
              <SelectIn
                id="f-pend"
                value={form.pendidikan}
                onChange={(v) => set({ pendidikan: v as typeof form.pendidikan })}
                options={PENDIDIKAN}
                  kosong="Pilih pendidikan"
                  error={!!errors.pendidikan}
              />
            </Field>
            <Field label="Pekerjaan" htmlFor="f-pek" req error={errors.pekerjaan} className="s4" hint={`${PEKERJAAN.length} pilihan`}>
              <SelectIn
                id="f-pek"
                value={form.pekerjaan}
                onChange={(v) => set({ pekerjaan: v as typeof form.pekerjaan })}
                options={PEKERJAAN}
                  kosong="Pilih pekerjaan"
                  error={!!errors.pekerjaan}
              />
            </Field>
              <Field label="Golongan darah" htmlFor="f-gol" opt className="s2">
                <SelectIn
                  id="f-gol"
                  value={form.golongan_darah ?? ''}
                  onChange={(v) => set({ golongan_darah: v })}
                  options={GOLONGAN_DARAH}
                  kosong="Belum diisi"
                />
              </Field>
          </div>
        </FormCard>

        {/* Domisili */}
        <FormCard Icon={MapPin} title="Domisili" sub="Lokasi tempat tinggal di desa">
          <div className="a-fg6">
            <Field label="RT" htmlFor="f-rt" className="s1">
              <SelectIn id="f-rt" value={form.rt} onChange={(v) => set({ rt: v })} options={opsiRt(rtList, form.rt)} />
            </Field>
            <Field label="RW" htmlFor="f-rw" className="s1">
              <SelectIn id="f-rw" value={form.rw} onChange={(v) => set({ rw: v })} options={opsiRt(rwList, form.rw)} />
            </Field>
            <Field label="Dusun" htmlFor="f-dusun" className="s4" hint="Otomatis dari RT. Diatur di Pengaturan → Dusun dan RT.">
              <InBox>
                <input id="f-dusun" value={dusunDariRt(form.rt) || '—'} readOnly tabIndex={-1} aria-readonly="true" />
              </InBox>
            </Field>
            <Field label="Alamat" htmlFor="f-alamat" req={form.hubungan_keluarga === 'Kepala Keluarga'} opt={form.hubungan_keluarga !== 'Kepala Keluarga'} error={errors.alamat} className="s6">
              <InBox error={!!errors.alamat}>
                <input
                  id="f-alamat"
                  value={form.alamat ?? ''}
                  onChange={(e) => set({ alamat: e.target.value })}
                  placeholder={contohAlamat(wilayah)}
                  autoComplete="off"
                />
              </InBox>
            </Field>
          </div>
        </FormCard>

        {/* Status */}
        <FormCard Icon={CircleCheck} title="Status penduduk" sub="Menentukan tampil atau tidaknya di daftar aktif">
          {statusTerkunci && badgeAwal ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={`a-badge ${badgeAwal.kelas}`}>{badgeAwal.label}</span>
              <p className="a-hint" style={{ margin: 0 }}>Status ini diubah lewat Batalkan di halaman Mutasi/Kematian.</p>
            </div>
          ) : (
            <>
              <div className="stg" role="radiogroup" aria-label="Status penduduk">
                {([
                  { nilai: 'aktif', judul: 'Aktif', sub: 'Tampil di daftar dan dihitung dalam statistik', Ikon: CircleCheck, tone: 'ok' },
                  { nilai: 'tidak aktif', judul: 'Tidak aktif', sub: 'Disembunyikan dari daftar aktif', Ikon: CircleX, tone: 'bad' },
                ] as const).map(({ nilai, judul, sub, Ikon, tone }) => (
                  <button
                    key={nilai}
                    type="button"
                    role="radio"
                    aria-checked={form.status === nilai}
                    onClick={() => set({ status: nilai })}
                    className={cn('a-opt', form.status === nilai && 'on')}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div className="oi" style={{ background: `var(--${tone}-bg)`, color: `var(--${tone})` }}>
                      <Ikon className="i" style={{ fontSize: 18 }} />
                    </div>
                    <div>
                      <b>{judul}</b>
                      <p>{sub}</p>
                    </div>
                    <span className="rd">{form.status === nilai && <Check className="i" />}</span>
                  </button>
                ))}
              </div>
              <p className="a-hint" style={{ marginTop: 12 }}>
                Pencatatan <b>Meninggal</b> dan <b>Pindah</b> dilakukan lewat tombol di halaman detail penduduk.
              </p>
            </>
          )}
        </FormCard>

        {/* Bilah simpan */}
        <div className="a-sticky sbar">
          <span style={{ fontSize: 14, color: 'var(--ink-3)' }} aria-live="polite">
            {perubahan.length ? (
              <><b style={{ color: 'var(--ink)' }}>{perubahan.length} isian diubah</b> · belum disimpan</>
            ) : (
              'Belum ada perubahan'
            )}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Batal
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="i" style={{ animation: 'spin 1s linear infinite' }} /> : <Save className="i" />}
              {mode === 'edit' ? 'Simpan Perubahan' : 'Simpan'}
            </Button>
          </div>
        </div>
      </div>

      {/* Samping: ringkasan penduduk + panel Perubahan */}
      <aside className="col side" style={{ gap: 14 }}>
        <div className="a-card p" style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
            <Avatar nama={awal.nama_lengkap} jk={awal.jenis_kelamin} size={52} />
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 16, fontFamily: 'var(--f-display)', display: 'block', letterSpacing: '-.01em' }}>
                {awal.nama_lengkap}
              </b>
              {badgeAwal && <span className={`a-badge ${badgeAwal.kelas}`}>{badgeAwal.label}</span>}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="a-kv" style={{ padding: '9px 0' }}>
              <p className="k">NIK</p>
              <p className="v mn">{awal.nik || '—'}</p>
            </div>
            <div className="a-kv" style={{ padding: '9px 0' }}>
              <p className="k">No. KK</p>
              <p className="v mn">{awal.no_kk || '—'}</p>
            </div>
          </div>
        </div>

        <div className="a-card" style={{ padding: '16px 18px' }} aria-live="polite">
          {perubahan.length ? (
            <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 15 }}>Perubahan</h3>
                  <span className="a-badge nd gold sm">{perubahan.length} isian</span>
                </div>
                {perubahan.map((f) => (
                  <div key={f.key} className="a-diff">
                    <span className="f">{f.label}</span>
                    <span className="o">{tampilNilai(f, awal[f.key])}</span>
                    <span className="n">{tampilNilai(f, form[f.key])}</span>
                  </div>
                ))}
            </>
          ) : (
            <>
                <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>Perubahan</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  Belum ada isian yang diubah. Perubahan akan tercantum di sini sebelum disimpan.
                </p>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
