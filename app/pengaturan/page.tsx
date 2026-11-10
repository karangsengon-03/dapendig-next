'use client'

import { Suspense, useEffect, useState } from 'react'
import { VersiAplikasi } from '@/components/layout/VersiAplikasi'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  BadgeCheck,
  Check,
  ChevronDown,
  FileSpreadsheet,
  Info,
  Landmark,
  MapPinned,
  Moon,
  Palette,
  Save,
  Sun,
  TriangleAlert,
  Upload,
  Wrench,
  Zap,
  DatabaseZap,
  UserCog,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AksesDitolakAdmin } from '@/components/ui/akses-ditolak'
import { PageHeader } from '@/components/layout/PageHeader'
import { ROLE_LABEL } from '@/components/layout/nav'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/dialog'
import { Field, InBox } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useUserList,
  useWilayahConfig,
  useSaveWilayah,
  useNormalisasiData,
} from '@/hooks/usePengaturan'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { EksporSection } from '@/components/pengaturan/EksporSection'
import { ImportSection } from '@/components/pengaturan/ImportSection'
import { DusunRtSection } from '@/components/pengaturan/DusunRtSection'
import type { ConfigWilayah, AppUser } from '@/types'

// ── Seksi (navigasi kiri; di HP jadi baris yang bisa digeser) ────────────────

type SecKey = 'wilayah' | 'kades' | 'dusun' | 'pengguna' | 'tampilan' | 'ekspor' | 'impor' | 'pemeliharaan'

const SECTIONS: { key: SecKey; ikon: React.ReactNode; label: string }[] = [
  { key: 'wilayah', ikon: <Landmark size={17} />, label: 'Informasi wilayah' },
  { key: 'dusun', ikon: <MapPinned size={17} />, label: 'Dusun, RT, dan RW' },
  { key: 'kades', ikon: <BadgeCheck size={17} />, label: 'Kepala desa' },
  { key: 'pengguna', ikon: <UserCog size={17} />, label: 'Pengguna' },
  { key: 'tampilan', ikon: <Palette size={17} />, label: 'Tampilan' },
  { key: 'ekspor', ikon: <FileSpreadsheet size={17} />, label: 'Ekspor data' },
  { key: 'impor', ikon: <Upload size={17} />, label: 'Impor data' },
  { key: 'pemeliharaan', ikon: <Wrench size={17} />, label: 'Pemeliharaan data' },
]

function adalahSeksi(v: string | null): v is SecKey {
  return SECTIONS.some((s) => s.key === v)
}

// ── Halaman utama ─────────────────────────────────────────────────────────────

export default function PengaturanPage() {
  const { isAdmin, user: currentUser } = useAuthStore()

  if (!isAdmin()) {
    return (
      <AppShell title="Pengaturan">
        <AksesDitolakAdmin />
      </AppShell>
    )
  }

  return (
    <AppShell title="Pengaturan">
      <Suspense fallback={null}>
        <PengaturanIsi currentUid={currentUser?.uid ?? ''} />
      </Suspense>
    </AppShell>
  )
}

function PengaturanIsi({ currentUid }: { currentUid: string }) {
  const params = useSearchParams()
  const bagianParam = params.get('bagian')
  // Seksi awal dari param URL (?bagian=ekspor); pilihan manual menimpa. Diturunkan, bukan disalin ke state.
  const [manual, setManual] = useState<SecKey | null>(null)
  const sec: SecKey = manual ?? (adalahSeksi(bagianParam) ? bagianParam : 'wilayah')

  function pilih(k: SecKey, el: HTMLElement) {
    setManual(k)
    // geser baris navigasi (HP) agar seksi terpilih ada di tengah
    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }

  return (
    <>
      <PageHeader title="Pengaturan" description="Konfigurasi aplikasi dan data desa" />
      <div className="a-set">
        <nav className="a-setnav" aria-label="Seksi pengaturan">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`i${sec === s.key ? ' on' : ''}`}
              aria-current={sec === s.key ? 'page' : undefined}
              onClick={(e) => pilih(s.key, e.currentTarget)}
            >
              {s.ikon}
              {s.label}
              {s.key === 'pemeliharaan' && <span className="cn">{MIGRASI_ITEMS.length + 1}</span>}
            </button>
          ))}
        </nav>

        <div className="a-card p setc">
          {/* Wilayah + Kepala desa = satu form, satu tombol Simpan; selalu terpasang agar isian tidak hilang saat ganti seksi */}
          <WilayahKadesForm tampil={sec === 'wilayah' || sec === 'kades' ? sec : null} />
          {sec === 'dusun' && <DusunRtSection />}
          {sec === 'pengguna' && <UserManagement currentUid={currentUid} />}
          {sec === 'tampilan' && <TampilanSection />}
          {sec === 'ekspor' && <EksporSection />}
          {sec === 'impor' && <ImportSection />}
          {sec === 'pemeliharaan' && <PemeliharaanSection />}
        </div>
        <VersiAplikasi className="mt-4" />
      </div>
    </>
  )
}

// ── Pemeliharaan: utilitas migrasi + Normalisasi ─────────────────────────────

const MIGRASI_ITEMS = [
  {
    label: 'Migrasi alamat penduduk',
    desc: 'Isi alamat bawaan (nama desa) untuk semua penduduk yang belum punya alamat',
    href: '/pengaturan/migrate-alamat',
    tone: 'warn' as const,
  },
  {
    label: 'Migrasi pendidikan',
    desc: 'Ganti SLTP → SMP dan SLTA → SMA untuk semua data penduduk',
    href: '/pengaturan/migrate-pendidikan',
    tone: 'warn' as const,
  },
  {
    label: 'Migrasi format tanggal',
    desc: 'Konversi DD/MM/YYYY → YYYY-MM-DD di semua koleksi Firestore',
    href: '/pengaturan/migrate-tanggal',
    tone: 'warn' as const,
  },
  {
    label: 'Standarisasi pendidikan & pekerjaan',
    desc: 'Sesuai Permendagri 6/2026 — PNS→ASN (PNS), Ibu RT→Mengurus RT, dll',
    href: '/pengaturan/migrate-standarisasi',
    tone: 'warn' as const,
  },
  {
    label: 'Fix duplikat dokumen',
    desc: 'Hapus dokumen lama yang ID-nya masih random jika NIK sudah ada',
    href: '/pengaturan/fix-duplikat',
    tone: 'bad' as const,
  },
  {
    label: 'Standarisasi ID dokumen',
    desc: 'Seragamkan semua ID dokumen penduduk menggunakan NIK',
    href: '/pengaturan/migrate-docid',
    tone: 'warn' as const,
  },
  {
    label: 'Fix Tanggal Lahir (Timezone Bug)',
    desc: 'Koreksi tanggal yang bergeser -1/-2/-3 hari akibat bug konversi UTC',
    href: '/pengaturan/fix-tanggal-lahir',
    tone: 'warn' as const,
  },
  {
    label: 'Sinkronisasi Tanggal Lahir dari Excel',
    desc: 'Update tanggal_lahir dari file Semua.xls Dispenduk — field lain tidak disentuh',
    href: '/pengaturan/fix-tanggal-excel',
    tone: 'warn' as const,
  },
]

function IkonUtil({ tone }: { tone: 'warn' | 'bad' }) {
  return (
    <div
      className="a-avatar"
      style={{ width: 42, height: 42, borderRadius: 12, background: `var(--${tone}-bg)`, color: `var(--${tone})` }}
    >
      <DatabaseZap className="i" style={{ fontSize: 19 }} />
    </div>
  )
}

function PemeliharaanSection() {
  return (
    <div className="a-fs">
      <div className="fh">
        <h4>Pemeliharaan data</h4>
        <p>Utilitas migrasi dan perbaikan data. Jalankan hanya bila diperlukan.</p>
      </div>
      <div className="a-alert warn" style={{ marginBottom: 8 }}>
        <TriangleAlert className="i" />
        <div>
          <b>Khusus admin</b>
          Tindakan ini mengubah banyak data sekaligus. Buat cadangan lebih dulu.
        </div>
      </div>
      {MIGRASI_ITEMS.map((item) => (
        <div className="a-mig" key={item.href}>
          <IkonUtil tone={item.tone} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{item.label}</b>
            <span className="mt">{item.desc}</span>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href={item.href}><Zap className="i" />Jalankan</Link>
          </Button>
        </div>
      ))}
      <NormalisasiRow />
    </div>
  )
}

// ── Normalisasi Data (hook & alur tetap dari kode asli) ──────────────────────

function NormalisasiRow() {
  const { toast } = useToast()
  const mutation = useNormalisasiData()
  const [confirm, setConfirm] = useState(false)

  async function handleNormalisasi() {
    setConfirm(false)
    try {
      const result = await mutation.mutateAsync()
      toast(
        `Normalisasi selesai: ${result.diperbarui} data diperbarui${result.gagal ? `, ${result.gagal} gagal` : ''}`,
        'success'
      )
    } catch {
      toast('Gagal menjalankan normalisasi', 'error')
    }
  }

  return (
    <>
      <div className="a-mig">
        <IkonUtil tone="warn" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>Normalisasi Pekerjaan &amp; Hub. Keluarga</b>
          <span className="mt">
            Perbaiki inkonsistensi penulisan nilai di kolom Pekerjaan dan Hubungan Keluarga agar sesuai dengan standar sistem.
          </span>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setConfirm(true)} disabled={mutation.isPending}>
          <Zap className="i" />
          {mutation.isPending ? 'Memproses...' : 'Jalankan'}
        </Button>
      </div>

      {mutation.isPending && (
        <div className="a-alert info" role="status" aria-live="polite" style={{ marginTop: 10 }}>
          <Info className="i" />
          <div>Memproses… jangan tutup halaman ini</div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          icon={<Zap className="i" style={{ fontSize: 24 }} />}
          tone="warn"
          title="Jalankan normalisasi?"
          okLabel="Ya, Jalankan"
          okVariant="default"
          loading={mutation.isPending}
          onConfirm={handleNormalisasi}
          onCancel={() => setConfirm(false)}
        >
          Yakin menjalankan normalisasi? Pekerjaan &amp; Hubungan Keluarga semua penduduk akan dirapikan. Pastikan sudah ada cadangan.
        </ConfirmModal>
      )}
    </>
  )
}

// ── Pengguna ──────────────────────────────────────────────────────────────────

function UserManagement({ currentUid }: { currentUid: string }) {
  const { data: users, isLoading } = useUserList()

  return (
    <div className="a-fs">
      <div className="fh">
        <h4>Manajemen pengguna</h4>
        <p>Akun dan peran yang dapat mengakses aplikasi</p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : !users?.length ? (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)' }}>Belum ada pengguna terdaftar</p>
      ) : (
        users.map((u: AppUser) => {
          const isSelf = u.uid === currentUid
          const judul = u.nama || u.email
          return (
            <div className="a-mig" key={u.uid}>
              <Avatar nama={judul} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{judul}</span>
                  {isSelf && <Badge variant="gold">Anda</Badge>}
                </b>
                {u.nama && <span className="mt" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>}
              </div>
              <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
            </div>
          )
        })
      )}

      <div className="a-alert info" style={{ marginTop: 14 }}>
        <Info className="i" />
        <div>Tambah atau ubah pengguna melalui Firebase Console.</div>
      </div>
    </div>
  )
}

// ── Tampilan (tema; pilihan tersimpan di perangkat lewat next-themes) ────────

function TampilanSection() {
  const { resolvedTheme, setTheme } = useTheme()
  const pilihan: { v: 'light' | 'dark'; ikon: React.ReactNode; t: string; d: string }[] = [
    { v: 'light', ikon: <Sun className="i" style={{ fontSize: 16 }} />, t: 'Terang', d: 'Bawaan · nyaman dibaca siang hari di kantor desa' },
    { v: 'dark', ikon: <Moon className="i" style={{ fontSize: 16 }} />, t: 'Gelap', d: 'Redup dan hemat baterai untuk malam hari' },
  ]
  return (
    <div className="a-fs">
      <div className="fh">
        <h4>Tampilan</h4>
        <p>Pilih tema yang nyaman di mata. Pilihan tersimpan di perangkat ini.</p>
      </div>
      <div className="themes">
        {pilihan.map((p) => {
          const aktif = (resolvedTheme === 'dark' ? 'dark' : 'light') === p.v
          return (
            <button
              key={p.v}
              type="button"
              className={`thc ${p.v}${aktif ? ' on' : ''}`}
              style={{ textAlign: 'left', font: 'inherit', color: 'inherit' }}
              aria-pressed={aktif}
              onClick={() => setTheme(p.v)}
            >
              <div className="pv"><i /><i /><i /></div>
              <div className="tx">
                <b>{p.ikon}{p.t}</b>
                <span>{p.d}</span>
              </div>
              <span className="rd"><Check className="i" style={{ fontSize: 11 }} /></span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Informasi Wilayah + Data Kepala Desa (satu form, satu Simpan) ────────────

const JABATAN_OPSI: { value: NonNullable<ConfigWilayah['jabatan_kades']>; label: string }[] = [
  { value: 'Kepala Desa', label: 'Kepala Desa — Definitif (tidak perlu NIP)' },
  { value: 'Pj. Kepala Desa', label: 'Pj. Kepala Desa — Penjabat (PNS/ASN, wajib NIP)' },
  { value: 'Plt. Kepala Desa', label: 'Plt. Kepala Desa — Pelaksana Tugas (PNS/ASN, wajib NIP)' },
]

function WilayahKadesForm({ tampil }: { tampil: 'wilayah' | 'kades' | null }) {
  const { data, isLoading } = useWilayahConfig()
  const { mutate: save, isPending } = useSaveWilayah()
  const { toast } = useToast()
  const [form, setForm] = useState<Omit<ConfigWilayah, 'updated_at' | 'updated_by'>>({
    desa: '',
    kecamatan: '',
    kabupaten: '',
    provinsi: '',
    kode_pos: '',
    tahun: '',
    nama_kades: '',
    jabatan_kades: 'Kepala Desa',
    nip_kades: '',
  })

  useEffect(() => {
    if (data) {
      const d = data
      setTimeout(() => {
        setForm({
          desa: d.desa ?? '',
          kecamatan: d.kecamatan ?? '',
          kabupaten: d.kabupaten ?? '',
          provinsi: d.provinsi ?? '',
          kode_pos: d.kode_pos ?? '',
          tahun: d.tahun ?? new Date().getFullYear().toString(),
          nama_kades: d.nama_kades ?? '',
          jabatan_kades: d.jabatan_kades ?? 'Kepala Desa',
          nip_kades: d.nip_kades ?? '',
        })
      }, 0)
    }
  }, [data])

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function handleSave() {
    if (!form.desa.trim()) {
      toast('Nama desa wajib diisi', 'error')
      return
    }
    save(form, {
      onSuccess: () => toast('Informasi wilayah berhasil disimpan', 'success'),
      onError: () => toast('Gagal menyimpan informasi wilayah', 'error'),
    })
  }

  if (!tampil) return null

  const penjabat = form.jabatan_kades === 'Pj. Kepala Desa' || form.jabatan_kades === 'Plt. Kepala Desa'

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
    >
      {isLoading ? (
        <div className="a-fs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        </div>
      ) : (
        <>
          {tampil === 'wilayah' && (
            <div className="a-fs">
              <div className="fh">
                <h4>Informasi wilayah</h4>
                <p>Nama desa, kecamatan, kabupaten, dan provinsi. Nama desa tampil di seluruh aplikasi (menu samping, layar masuk, alamat bawaan form, kop dokumen, dan Cetak KK); ganti di sini bila aplikasi dipakai desa lain. Struktur dusun, RT, dan RW diatur di <b>Dusun, RT, dan RW</b>.</p>
              </div>
              <div className="a-fg6">
                <Field label="Desa" htmlFor="w-desa" className="s3">
                  <InBox><input placeholder="Nama desa" id="w-desa" value={form.desa} onChange={(e) => set('desa', e.target.value)} /></InBox>
                </Field>
                <Field label="Kecamatan" htmlFor="w-kec" className="s3">
                  <InBox><input placeholder="Nama kecamatan" id="w-kec" value={form.kecamatan} onChange={(e) => set('kecamatan', e.target.value)} /></InBox>
                </Field>
                <Field label="Kabupaten" htmlFor="w-kab" className="s3">
                  <InBox><input placeholder="Nama kabupaten" id="w-kab" value={form.kabupaten} onChange={(e) => set('kabupaten', e.target.value)} /></InBox>
                </Field>
                <Field label="Provinsi" htmlFor="w-prov" className="s3">
                  <InBox><input placeholder="Nama provinsi" id="w-prov" value={form.provinsi} onChange={(e) => set('provinsi', e.target.value)} /></InBox>
                </Field>
                <Field label="Kode pos" htmlFor="w-pos" className="s3">
                  <InBox>
                    <input
                      placeholder="5 digit"
                      id="w-pos"
                      value={form.kode_pos ?? ''}
                      onChange={(e) => set('kode_pos', e.target.value)}
                      maxLength={5}
                      inputMode="numeric"
                    />
                  </InBox>
                </Field>
                <Field label="Tahun" htmlFor="w-thn" className="s3">
                  <InBox><input placeholder="2026" id="w-thn" value={form.tahun} onChange={(e) => set('tahun', e.target.value)} /></InBox>
                </Field>
              </div>
            </div>
          )}

          {tampil === 'kades' && (
            <div className="a-fs">
              <div className="fh">
                <h4>Data kepala desa</h4>
                <p>Digunakan untuk dokumen cetak resmi desa (KK Sementara, surat, dll).</p>
              </div>
              <div className="a-fg6">
                <Field label="Jabatan" htmlFor="w-jab" className="s3 nikkk">
                  <InBox>
                    <select
                      id="w-jab"
                      value={form.jabatan_kades ?? 'Kepala Desa'}
                      onChange={(e) => set('jabatan_kades', e.target.value)}
                    >
                      {JABATAN_OPSI.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="i chev" />
                  </InBox>
                </Field>
                <Field label="Nama kepala desa" htmlFor="w-kades" className="s3 nikkk">
                  <InBox>
                    <input
                      placeholder="Nama lengkap kepala desa"
                      id="w-kades"
                      value={form.nama_kades ?? ''}
                      onChange={(e) => set('nama_kades', e.target.value)}
                    />
                  </InBox>
                </Field>
                {penjabat && (
                  <Field
                    label="NIP"
                    htmlFor="w-nip"
                    className="s6"
                    hint={<span className="warn">Wajib diisi — {form.jabatan_kades} adalah jabatan PNS/ASN</span>}
                  >
                    <InBox>
                      <input
                        placeholder="Nomor Induk Pegawai (18 digit)"
                        id="w-nip"
                        className="mono"
                        value={form.nip_kades ?? ''}
                        onChange={(e) => set('nip_kades', e.target.value)}
                      />
                    </InBox>
                  </Field>
                )}
              </div>
            </div>
          )}

          <div className="set-ft act-c">
            <Button type="submit" disabled={isPending}>
              <Save className="i" />
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <small>Informasi wilayah dan data kepala desa disimpan bersama.</small>
          </div>
        </>
      )}
    </form>
  )
}
