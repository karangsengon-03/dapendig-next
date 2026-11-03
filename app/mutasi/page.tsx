'use client'

import { Suspense, useMemo, useState } from 'react'
import { rt3 } from '@/lib/rt-rw'
import { useSearchParams } from 'next/navigation'
import {
  Check,
  ChevronRight,
  Info,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { PERISTIWA } from '@/lib/visual'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useIsDesktop } from '@/components/layout/useIsDesktop'
import { angka16 } from '@/lib/angka'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Modal, ConfirmModal } from '@/components/ui/dialog'
import { Field, InBox } from '@/components/ui/field'
import {
  RecTabs, RecToolbar, RecPager, NamaCell, KvList, DetailFoot,
  cocokCari, daftarBulan, kunciBulan, tglPanjang, tglPendek,
} from '@/components/ui/rec-parts'
import { UKURAN_HALAMAN, jumlahHalaman, klemHalaman, potongHalaman } from '@/lib/halaman'
import {
  MutasiKeluarForm, MutasiMasukForm, AnggotaFields, anggotaDariCatatan, toMutasiMasukData, type AnggotaForm,
} from '@/components/mutasi/MutasiForm'
import {
  useMutasiKeluar, useMutasiMasuk,
  useDeleteMutasiKeluar, useDeleteMutasiMasuk,
  useRollbackMutasiKeluar,
  useEditMutasiKeluar, useEditMutasiMasuk,
} from '@/hooks/useMutasi'
import { usePendudukDetail, usePendudukList } from '@/hooks/usePenduduk'
import { URUT_BAWAAN, buatPetaRt, cocokRt, urutkanCatatan, waktuBuat, type UrutCatatan } from '@/lib/saring-catatan'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { GalatTolak } from '@/lib/galat-tolak'
import { pesanHasilSinkron } from '@/lib/sinkron-catatan'
import { validasiPindahKeluar, validasiPindahMasuk } from '@/lib/validasi-catatan'
import type { MutasiKeluar, MutasiMasuk } from '@/types'

type Tab = 'keluar' | 'masuk'

// ── Modal detail Mutasi Keluar ────────────────────────────────────────────────
function DetailKeluarModal({
  row, onClose, canEdit, canDelete, onEdit, onRollback, onHapus,
}: {
  row: MutasiKeluar; onClose: () => void
  canEdit: boolean; canDelete: boolean
  onEdit: () => void; onRollback: () => void; onHapus: () => void
}) {
  // Hapus hanya menghapus catatan (status penduduk tidak dibalik): selama penduduknya masih 'mutasi-keluar'
  // yang boleh hanya Batalkan. Hapus tersedia untuk catatan yatim (penduduk sudah aktif lagi / tak ditemukan).
  const { data: penduduk, isLoading: memuat } = usePendudukDetail(row.nik_target ?? '')
  const hapusTerkunci = penduduk?.status === 'mutasi-keluar'
  return (
    <Modal
      onClose={onClose}
      icon={<PERISTIWA.pindah_keluar.Icon className="i" />}
      tone="bad"
      title="Detail pindah keluar"
      sub={row.nama ?? '—'}
      foot={<DetailFoot canEdit={canEdit} canDelete={canDelete} bisaBatal hapusNonaktif={memuat || hapusTerkunci} onClose={onClose} onEdit={onEdit} onRollback={onRollback} onHapus={onHapus} />}
    >
      <KvList
        items={[
          ['Nama', row.nama ?? '—'],
          ['NIK', row.nik_target ?? '—', { mono: true }],
          ['No. KK', row.no_kk ?? '—', { mono: true }],
          ['Tanggal pindah', tglPanjang(row.tanggal)],
          ['Tujuan', row.tujuan ?? '—', { lebar: true }],
          ['Alasan', row.alasan ?? '—', { lebar: true }],
        ]}
      />
      {canDelete && hapusTerkunci && (
        <div className="a-alert info" style={{ marginTop: 14 }}>
          <Info className="i" />
          <div>Penduduk ini masih berstatus <strong>Pindah keluar</strong>. Gunakan Batalkan untuk mengembalikan penduduk.</div>
        </div>
      )}
    </Modal>
  )
}

// ── Modal detail Mutasi Masuk ─────────────────────────────────────────────────
function DetailMasukModal({
  row, onClose, canEdit, canDelete, onEdit, onHapus,
}: {
  row: MutasiMasuk; onClose: () => void
  canEdit: boolean; canDelete: boolean
  onEdit: () => void; onHapus: () => void
}) {
  return (
    <Modal
      onClose={onClose}
      icon={<PERISTIWA.pindah_masuk.Icon className="i" />}
      tone="ok"
      title="Detail pindah masuk"
      sub={row.nama_lengkap ?? '—'}
      foot={<DetailFoot canEdit={canEdit} canDelete={canDelete} bisaBatal={false} onClose={onClose} onEdit={onEdit} onRollback={() => {}} onHapus={onHapus} />}
    >
      <KvList
        items={[
          ['Nama', row.nama_lengkap ?? '—'],
          ['NIK', row.nik ?? '—', { mono: true }],
          ['No. KK', row.no_kk ?? '—', { mono: true }],
          ['Tanggal masuk', tglPanjang(row.tanggal)],
          ['Asal daerah', row.asal_daerah ?? '—', { lebar: true }],
          ['Jenis kelamin', row.jenis_kelamin ?? '—'],
          ['Tempat lahir', row.tempat_lahir ?? '—'],
          ['Tanggal lahir', row.tanggal_lahir ? tglPanjang(row.tanggal_lahir) : '—'],
          ['Agama', row.agama ?? '—'],
          ['Hubungan keluarga', row.hubungan_keluarga ?? '—'],
          ['Status perkawinan', row.status_perkawinan ?? '—'],
          ['Pendidikan', row.pendidikan ?? '—'],
          ['Pekerjaan', row.pekerjaan ?? '—'],
          ['Nama ayah', row.nama_ayah || '—'],
          ['Nama ibu', row.nama_ibu || '—'],
          ['Golongan darah', row.golongan_darah || '—'],
          ['RT / RW', `RT ${rt3(row.rt)} / RW ${rt3(row.rw)}`],
          ['Alamat', row.alamat ?? '—', { lebar: true }],
        ]}
      />
    </Modal>
  )
}

// ── Modal Edit ────────────────────────────────────────────────────────────────
function EditKeluarModal({ row, onClose }: { row: MutasiKeluar; onClose: () => void }) {
  const { mutateAsync, isPending } = useEditMutasiKeluar()
  const { toast } = useToast()
  const [form, setForm] = useState({ nama: row.nama ?? '', nik_target: row.nik_target ?? '', no_kk: row.no_kk ?? '', tujuan: row.tujuan ?? '', alasan: row.alasan ?? '', tanggal: row.tanggal ?? '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })) }
  async function save() {
    // Validasi sama dengan form Tambah (lib/validasi-catatan.ts)
    const e = validasiPindahKeluar(form)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    try { await mutateAsync({ id: row.id, data: form }); toast('Data diperbarui', 'success'); onClose() }
    catch { toast('Gagal menyimpan', 'error') }
  }
  return (
    <Modal
      onClose={onClose}
      icon={<Pencil className="i" />}
      title="Edit pindah keluar"
      sub={row.nama}
      foot={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" form="edit-keluar" disabled={isPending}>
            <Check className="i" />{isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="edit-keluar" noValidate onSubmit={e => { e.preventDefault(); void save() }} className="a-fg6">
        <Field label="Nama" htmlFor="ek-nama" req error={errors.nama} className="s6">
          <InBox error={!!errors.nama}><input id="ek-nama" value={form.nama} onChange={e => set('nama', e.target.value)} autoComplete="off" /></InBox>
        </Field>
        <Field label="NIK" htmlFor="ek-nik" req error={errors.nik_target} className="s3 nikkk">
          <InBox error={!!errors.nik_target}><input id="ek-nik" className="mono" inputMode="numeric" value={form.nik_target} onChange={e => set('nik_target', angka16(e.target.value))} autoComplete="off" /></InBox>
        </Field>
        <Field label="No. KK" htmlFor="ek-kk" req error={errors.no_kk} className="s3 nikkk">
          <InBox error={!!errors.no_kk}><input id="ek-kk" className="mono" inputMode="numeric" value={form.no_kk} onChange={e => set('no_kk', angka16(e.target.value))} autoComplete="off" /></InBox>
        </Field>
        <Field label="Tujuan" htmlFor="ek-tujuan" req error={errors.tujuan} className="s6">
          <InBox error={!!errors.tujuan}><input id="ek-tujuan" value={form.tujuan} onChange={e => set('tujuan', e.target.value)} autoComplete="off" /></InBox>
        </Field>
        <Field label="Alasan" htmlFor="ek-alasan" className="s3">
          <InBox><input id="ek-alasan" value={form.alasan} onChange={e => set('alasan', e.target.value)} autoComplete="off" /></InBox>
        </Field>
        <Field label="Tanggal" htmlFor="ek-tanggal" req error={errors.tanggal} className="s3">
          <InBox error={!!errors.tanggal}><input id="ek-tanggal" type="date" value={form.tanggal} onChange={e => set('tanggal', e.target.value)} /></InBox>
        </Field>
      </form>
    </Modal>
  )
}

function EditMasukModal({ row, onClose }: { row: MutasiMasuk; onClose: () => void }) {
  const { mutateAsync, isPending } = useEditMutasiMasuk()
  const { toast } = useToast()
  // Isian, urutan, pilihan, dan validasi SAMA PERSIS dengan form Tambah (AnggotaFields + validasiPindahMasuk)
  const [form, setForm] = useState<AnggotaForm>(() => anggotaDariCatatan(row))
  const [errors, setErrors] = useState<Record<string, string>>({})
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '', ...(k === 'hubungan_keluarga' ? { alamat: '' } : {}) })) }
  async function save() {
    const e = validasiPindahMasuk(form)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    try {
      const hasil = await mutateAsync({ id: row.id, data: toMutasiMasukData(form) })
      const { pesan, jenis } = pesanHasilSinkron('Data diperbarui', hasil)
      toast(pesan, jenis); onClose()
    } catch (err) { toast(err instanceof GalatTolak ? `Gagal menyimpan: ${err.message}` : 'Gagal menyimpan', 'error') }
  }
  return (
    <Modal
      onClose={onClose}
      icon={<Pencil className="i" />}
      title="Edit pindah masuk"
      sub={row.nama_lengkap}
      width={820}
      foot={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" form="edit-masuk" disabled={isPending}>
            <Check className="i" />{isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="edit-masuk" noValidate onSubmit={e => { e.preventDefault(); void save() }} className="fwrap">
        <div className="a-alert info">
          <Info className="i" />
          <div>Isian sama dengan form Tambah. Perubahan juga memperbarui data penduduk yang berasal dari catatan ini di menu Penduduk (hanya kolom yang Anda ubah).</div>
        </div>
        <AnggotaFields form={form} errors={errors} onChange={set} />
      </form>
    </Modal>
  )
}

// ── Keadaan kosong ────────────────────────────────────────────────────────────
function Kosong({ tab, adaSaringan, onTambah }: { tab: Tab; adaSaringan: boolean; onTambah?: () => void }) {
  const Ikon = tab === 'keluar' ? PERISTIWA.pindah_keluar.Icon : PERISTIWA.pindah_masuk.Icon
  return (
    <div className="a-empty">
      <div className="em"><Ikon className="i" style={{ fontSize: 30 }} /></div>
      <h3>{adaSaringan ? 'Tidak ada data yang cocok' : `Belum ada data ${tab === 'keluar' ? 'pindah keluar' : 'pindah masuk'}`}</h3>
      <p>{adaSaringan ? 'Tidak ada data yang cocok dengan pencarian, bulan, atau RT yang dipilih. Ubah pilihan atau tekan Reset.' : 'Catatan yang Anda tambahkan akan muncul di sini.'}</p>
      {onTambah && !adaSaringan && (
        <Button type="button" onClick={onTambah}><Plus className="i" />Tambah data</Button>
      )}
    </div>
  )
}

function MutasiIsi() {
  const sp = useSearchParams()
  // Param aksi cepat dari Beranda: /mutasi?tab=<keluar|masuk>&tambah=1
  const tabParam: Tab = sp.get('tab') === 'masuk' ? 'masuk' : 'keluar'
  const tambahParam = sp.get('tambah') === '1'

  const [tabManual, setTabManual] = useState<Tab | null>(null)
  const [formManual, setFormManual] = useState<boolean | null>(null)
  const [q, setQ] = useState('')
  const [bulan, setBulan] = useState('')
  const [rt, setRt] = useState('')
  const [urut, setUrut] = useState<UrutCatatan>(URUT_BAWAAN)
  const [halaman, setHalaman] = useState(1)
  const [detailKeluar, setDetailKeluar] = useState<MutasiKeluar | null>(null)
  const [detailMasuk, setDetailMasuk] = useState<MutasiMasuk | null>(null)
  const [editKeluar, setEditKeluar] = useState<MutasiKeluar | null>(null)
  const [editMasuk, setEditMasuk] = useState<MutasiMasuk | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string; type: Tab; nik_target?: string } | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; nik_target: string; nama: string } | null>(null)

  const { isAdmin, isOperator } = useAuthStore()
  const { toast } = useToast()
  const isDesktop = useIsDesktop()
  const canAdd = isOperator()
  const canDelete = isAdmin()
  // Rules: ubah catatan (update) = admin; tambah (create) = operator
  const canEdit = isAdmin()

  const tab: Tab = tabManual ?? tabParam
  const showForm = canAdd && (formManual ?? tambahParam)

  const { data: dataKeluar, isLoading: loadingKeluar } = useMutasiKeluar()
  const { data: dataMasuk, isLoading: loadingMasuk } = useMutasiMasuk()
  const { mutate: hapusKeluar, isPending: pendingHapusKeluar } = useDeleteMutasiKeluar()
  const { mutate: hapusMasuk, isPending: pendingHapusMasuk } = useDeleteMutasiMasuk()
  const { mutate: rollback, isPending: pendingRollback } = useRollbackMutasiKeluar()

  // Catatan Pindah Keluar tidak menyimpan RT: RT diambil dari data penduduk (NIK), dimuat hanya saat RT dipakai.
  const perluRtPenduduk = tab === 'keluar' && (rt !== '' || urut === 'rt')
  const { data: dataPenduduk, isLoading: loadingPenduduk } = usePendudukList({ enabled: perluRtPenduduk })
  const petaRt = useMemo(() => buatPetaRt(dataPenduduk), [dataPenduduk])

  const isLoading = (tab === 'keluar' ? loadingKeluar : loadingMasuk) || (perluRtPenduduk && loadingPenduduk)
  const isPendingDelete = tab === 'keluar' ? pendingHapusKeluar : pendingHapusMasuk

  // Saring + urutkan di klien dari data yang sudah dimuat (tanpa query tambahan).
  const listKeluar = useMemo(() => {
    const rtDari = (r: MutasiKeluar) => petaRt.get(r.nik_target) ?? ''
    const hasil = (dataKeluar ?? []).filter(r =>
      cocokCari(q, r.nama, r.nik_target, r.no_kk) && (!bulan || kunciBulan(r.tanggal) === bulan) && cocokRt(rt, rtDari(r)))
    return urutkanCatatan(hasil, urut, r => ({
      nama: r.nama ?? '', nik: r.nik_target ?? '', kk: r.no_kk ?? '', tanggal: r.tanggal ?? '', rt: rtDari(r), dibuat: waktuBuat(r.created_at),
    }))
  }, [dataKeluar, q, bulan, rt, urut, petaRt])
  const listMasuk = useMemo(() => {
    const hasil = (dataMasuk ?? []).filter(r =>
      cocokCari(q, r.nama_lengkap, r.nik, r.no_kk) && (!bulan || kunciBulan(r.tanggal) === bulan) && cocokRt(rt, r.rt))
    return urutkanCatatan(hasil, urut, r => ({
      nama: r.nama_lengkap ?? '', nik: r.nik ?? '', kk: r.no_kk ?? '', tanggal: r.tanggal ?? '', rt: r.rt ?? '', dibuat: waktuBuat(r.created_at),
    }))
  }, [dataMasuk, q, bulan, rt, urut])
  const bulanOpsi = useMemo(
    () => daftarBulan((tab === 'keluar' ? dataKeluar : dataMasuk)?.map(r => r.tanggal) ?? []),
    [tab, dataKeluar, dataMasuk]
  )
  const jumlah = tab === 'keluar' ? listKeluar.length : listMasuk.length
  const adaSaringan = q.trim() !== '' || bulan !== '' || rt !== ''
  const adaUbahan = adaSaringan || urut !== URUT_BAWAAN
  // Halaman 25 baris; halaman dikoreksi bila daftar memendek (mis. setelah hapus/saring)
  const totalHal = jumlahHalaman(jumlah)
  const hal = klemHalaman(halaman, jumlah)
  const awalNo = (hal - 1) * UKURAN_HALAMAN
  const keluarHal = potongHalaman(listKeluar, hal)
  const masukHal = potongHalaman(listMasuk, hal)

  // Form Tambah atau Edit terbuka → pindah tab dikunci (dulu form tertutup sendiri dan isiannya hilang tanpa pemberitahuan)
  const formTerbuka = showForm || !!editKeluar || !!editMasuk
  function tabTerkunci() { toast('Tutup form terlebih dahulu untuk pindah tab.', 'info') }

  function pilihTab(k: string) {
    if (formTerbuka) { if (k !== tab) tabTerkunci(); return }
    setTabManual(k as Tab)
    setFormManual(false)
    setHalaman(1)
    setQ('')
    setBulan('')
    setRt('')
    setUrut(URUT_BAWAAN)
  }

  function resetSaringan() {
    setQ('')
    setBulan('')
    setRt('')
    setUrut(URUT_BAWAAN)
    setHalaman(1)
  }

  function handleDelete() {
    if (!deleteTarget) return
    const { id, nama, type, nik_target } = deleteTarget
    const opts = {
      onSuccess: () => { setDeleteTarget(null); setDetailKeluar(null); setDetailMasuk(null); toast(`Data ${nama} dihapus`, 'success') },
      onError: (e: unknown) => toast(e instanceof GalatTolak ? `Gagal menghapus: ${e.message}` : 'Gagal menghapus', 'error'),
    }
    if (type === 'keluar') hapusKeluar({ id, nama, nik_target }, opts)
    else hapusMasuk({ id, nama }, opts)
  }

  function handleRollback() {
    if (!rollbackTarget) return
    rollback({ mutasiId: rollbackTarget.id, nik_target: rollbackTarget.nik_target, nama: rollbackTarget.nama }, {
      onSuccess: () => { setRollbackTarget(null); setDetailKeluar(null); toast(`Mutasi ${rollbackTarget.nama} dibatalkan`, 'success') },
      onError: () => toast('Gagal membatalkan', 'error'),
    })
  }

  function mintaRollback(row: MutasiKeluar) {
    setDetailKeluar(null)
    setRollbackTarget({ id: row.id, nik_target: row.nik_target, nama: row.nama })
  }

  function bukaTambah() { setFormManual(true) }
  function tutupForm() { setFormManual(false) }

  const kosong = <Kosong tab={tab} adaSaringan={adaSaringan} onTambah={canAdd ? bukaTambah : undefined} />

  function bukaDenganEnter(e: React.KeyboardEvent, aksi: () => void) {
    if (e.key === 'Enter' && e.target === e.currentTarget) aksi()
  }

  return (
    <>
      <PageHeader
        title="Mutasi"
        description="Pindah keluar dan pindah masuk penduduk"
        action={canAdd ? (
          <Button type="button" variant={showForm ? 'outline' : 'default'} onClick={() => setFormManual(!showForm)}>
            {showForm ? <X className="i" /> : <Plus className="i" />}
            {showForm ? 'Tutup form' : 'Tambah data'}
          </Button>
        ) : undefined}
      />

      <RecTabs
        tabs={[
          { key: 'keluar', label: 'Pindah Keluar', icon: <PERISTIWA.pindah_keluar.Icon className="i" />, count: dataKeluar?.length },
          { key: 'masuk', label: 'Pindah Masuk', icon: <PERISTIWA.pindah_masuk.Icon className="i" />, count: dataMasuk?.length },
        ]}
        aktif={tab}
        tone={tab === 'keluar' ? 'bad' : 'ok'}
        onPilih={pilihTab}
        terkunci={formTerbuka}
        onTerkunci={tabTerkunci}
      />

      {showForm ? (
        tab === 'keluar'
          ? <MutasiKeluarForm onSuccess={tutupForm} onCancel={tutupForm} />
          : <MutasiMasukForm onSuccess={tutupForm} onCancel={tutupForm} />
      ) : (
        <>
          <RecToolbar
            q={q} onQ={v => { setQ(v); setHalaman(1) }}
            bulan={bulan} bulanOpsi={bulanOpsi} onBulan={v => { setBulan(v); setHalaman(1) }}
            rt={rt} onRt={v => { setRt(v); setHalaman(1) }}
            urut={urut} onUrut={v => { setUrut(v); setHalaman(1) }}
            adaUbahan={adaUbahan} onReset={resetSaringan}
            jumlah={isLoading ? 0 : jumlah}
          />

          {isLoading ? (
            <div className="a-card-list">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} style={{ height: 56, borderRadius: 14 }} />)}
            </div>
          ) : tab === 'keluar' ? (
            isDesktop ? (
              <div className="a-tw">
                <div style={{ overflow: 'auto' }}>
                  {listKeluar.length === 0 ? kosong : (
                    <table className="a-t" style={{ minWidth: 980 }}>
                      <thead>
                        <tr>
                          <th className="frz frz-no">No</th>
                          <th className="frz frz-nm">Nama</th>
                          <th>NIK</th>
                          <th>No. KK</th>
                          <th>Tanggal</th>
                          <th>Tujuan</th>
                          <th>Alasan</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {keluarHal.map((row: MutasiKeluar, i: number) => (
                          <tr
                            key={row.id}
                            className="row"
                            tabIndex={0}
                            onClick={() => setDetailKeluar(row)}
                            onKeyDown={e => bukaDenganEnter(e, () => setDetailKeluar(row))}
                          >
                            <td className="frz frz-no">{awalNo + i + 1}</td>
                            <td className="frz frz-nm nm2"><NamaCell nama={row.nama} /></td>
                            <td className="mn">{row.nik_target || '—'}</td>
                            <td className="mn">{row.no_kk || '—'}</td>
                            <td className="num">{tglPendek(row.tanggal)}</td>
                            <td>{row.tujuan}</td>
                            <td>{row.alasan || '—'}</td>
                            <td style={{ textAlign: 'right', color: 'var(--ink-4)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                {canDelete && (
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    onClick={e => { e.stopPropagation(); mintaRollback(row) }}
                                  >
                                    <Undo2 className="i" />Batalkan
                                  </Button>
                                )}
                                <ChevronRight className="i" style={{ fontSize: 17 }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <RecPager halaman={hal} totalHalaman={totalHal} total={jumlah} onGanti={setHalaman} />
              </div>
            ) : listKeluar.length === 0 ? kosong : (
              <>
              <div className="a-card-list">
                {keluarHal.map((row: MutasiKeluar) => (
                  <div
                    key={row.id}
                    className="a-lc"
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailKeluar(row)}
                    onKeyDown={e => bukaDenganEnter(e, () => setDetailKeluar(row))}
                  >
                    <Avatar nama={row.nama} size={44} />
                    <div className="m">
                      <b>{row.nama}</b>
                      <span>{tglPendek(row.tanggal)} · {row.tujuan}</span>
                      <span className="mn">{row.nik_target || '—'}</span>
                    </div>
                    <ChevronRight className="i" style={{ fontSize: 18, color: 'var(--ink-4)' }} />
                  </div>
                ))}
              </div>
              <RecPager mobile halaman={hal} totalHalaman={totalHal} total={jumlah} onGanti={setHalaman} />
              </>
            )
          ) : (
            isDesktop ? (
              <div className="a-tw">
                <div style={{ overflow: 'auto' }}>
                  {listMasuk.length === 0 ? kosong : (
                    <table className="a-t" style={{ minWidth: 980 }}>
                      <thead>
                        <tr>
                          <th className="frz frz-no">No</th>
                          <th className="frz frz-nm">Nama</th>
                          <th>NIK</th>
                          <th>No. KK</th>
                          <th>Tanggal</th>
                          <th>Asal Daerah</th>
                          <th>RT/RW</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {masukHal.map((row: MutasiMasuk, i: number) => (
                          <tr
                            key={row.id}
                            className="row"
                            tabIndex={0}
                            onClick={() => setDetailMasuk(row)}
                            onKeyDown={e => bukaDenganEnter(e, () => setDetailMasuk(row))}
                          >
                            <td className="frz frz-no">{awalNo + i + 1}</td>
                            <td className="frz frz-nm nm2"><NamaCell nama={row.nama_lengkap} jk={row.jenis_kelamin} /></td>
                            <td className="mn">{row.nik || '—'}</td>
                            <td className="mn">{row.no_kk || '—'}</td>
                            <td className="num">{tglPendek(row.tanggal)}</td>
                            <td>{row.asal_daerah}</td>
                            <td className="num">RT {rt3(row.rt)}/RW {rt3(row.rw)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--ink-4)' }}><ChevronRight className="i" style={{ fontSize: 17 }} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <RecPager halaman={hal} totalHalaman={totalHal} total={jumlah} onGanti={setHalaman} />
              </div>
            ) : listMasuk.length === 0 ? kosong : (
              <>
              <div className="a-card-list">
                {masukHal.map((row: MutasiMasuk) => (
                  <div
                    key={row.id}
                    className="a-lc"
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailMasuk(row)}
                    onKeyDown={e => bukaDenganEnter(e, () => setDetailMasuk(row))}
                  >
                    <Avatar nama={row.nama_lengkap} jk={row.jenis_kelamin} size={44} />
                    <div className="m">
                      <b>{row.nama_lengkap}</b>
                      <span>{tglPendek(row.tanggal)} · {row.asal_daerah}</span>
                      <span className="mn">{row.nik || '—'}</span>
                    </div>
                    <ChevronRight className="i" style={{ fontSize: 18, color: 'var(--ink-4)' }} />
                  </div>
                ))}
              </div>
              <RecPager mobile halaman={hal} totalHalaman={totalHal} total={jumlah} onGanti={setHalaman} />
              </>
            )
          )}
        </>
      )}

      {/* Detail Keluar */}
      {detailKeluar && (
        <DetailKeluarModal
          row={detailKeluar} onClose={() => setDetailKeluar(null)}
          canEdit={canEdit} canDelete={canDelete}
          onEdit={() => { setEditKeluar(detailKeluar); setDetailKeluar(null) }}
          onRollback={() => mintaRollback(detailKeluar)}
          onHapus={() => { setDeleteTarget({ id: detailKeluar.id, nama: detailKeluar.nama, type: 'keluar', nik_target: detailKeluar.nik_target }); setDetailKeluar(null) }}
        />
      )}

      {/* Detail Masuk */}
      {detailMasuk && (
        <DetailMasukModal
          row={detailMasuk} onClose={() => setDetailMasuk(null)}
          canEdit={canEdit} canDelete={canDelete}
          onEdit={() => { setEditMasuk(detailMasuk); setDetailMasuk(null) }}
          onHapus={() => { setDeleteTarget({ id: detailMasuk.id, nama: detailMasuk.nama_lengkap, type: 'masuk' }); setDetailMasuk(null) }}
        />
      )}

      {/* Konfirmasi Hapus */}
      {deleteTarget && (
        <ConfirmModal
          icon={<Trash2 className="i" style={{ fontSize: 24 }} />}
          tone="bad"
          title="Hapus catatan ini?"
          okLabel="Hapus catatan"
          loading={isPendingDelete}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        >
          Catatan {deleteTarget.type === 'keluar' ? 'pindah keluar' : 'pindah masuk'} <b>{deleteTarget.nama}</b> akan dihapus.
          {' '}Data penduduknya tidak ikut berubah. Aksi ini tidak bisa dibatalkan.
        </ConfirmModal>
      )}

      {/* Konfirmasi Rollback */}
      {rollbackTarget && (
        <ConfirmModal
          icon={<Undo2 className="i" style={{ fontSize: 24 }} />}
          tone="warn"
          title="Batalkan Mutasi Keluar?"
          okLabel="Ya, Batalkan"
          okVariant="default"
          loading={pendingRollback}
          onCancel={() => setRollbackTarget(null)}
          onConfirm={handleRollback}
        >
          <b>{rollbackTarget.nama}</b> akan kembali berstatus aktif dan catatan pindah keluar dihapus.
        </ConfirmModal>
      )}

      {editKeluar && <EditKeluarModal row={editKeluar} onClose={() => setEditKeluar(null)} />}
      {editMasuk && <EditMasukModal row={editMasuk} onClose={() => setEditMasuk(null)} />}
    </>
  )
}

export default function MutasiPage() {
  return (
    <AppShell title="Mutasi">
      <Suspense fallback={<div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Memuat...</div>}>
        <MutasiIsi />
      </Suspense>
    </AppShell>
  )
}
