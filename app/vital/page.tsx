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
import { LahirForm, MeninggalForm, LahirFields, lahirDariCatatan, toLahirData, type LahirFormState } from '@/components/vital/VitalForm'
import {
  useLahir, useMeninggal,
  useDeleteLahir, useDeleteMeninggal,
  useRollbackMeninggal,
  useEditLahir, useEditMeninggal,
} from '@/hooks/useVital'
import { usePendudukDetail, usePendudukList } from '@/hooks/usePenduduk'
import { URUT_BAWAAN, buatPetaRt, cocokRt, urutkanCatatan, waktuBuat, type UrutCatatan } from '@/lib/saring-catatan'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toast'
import { GalatTolak } from '@/lib/galat-tolak'
import { pesanHasilSinkron } from '@/lib/sinkron-catatan'
import { validasiKelahiran, validasiKematian } from '@/lib/validasi-catatan'
import type { Lahir, Meninggal } from '@/types'

type Tab = 'lahir' | 'meninggal'

function JkBadge({ jk }: { jk: string }) {
  const laki = jk === 'Laki-laki'
  return <span className={`jkb ${laki ? 'lk' : 'pr'}`}>{laki ? 'L' : 'P'}</span>
}

// ── Detail Modal Kelahiran ────────────────────────────────────────────────────
function DetailLahirModal({
  row, onClose, canEdit, canDelete, onEdit, onHapus,
}: {
  row: Lahir; onClose: () => void; canEdit: boolean; canDelete: boolean
  onEdit: () => void; onHapus: () => void
}) {
  return (
    <Modal
      onClose={onClose}
      icon={<PERISTIWA.kelahiran.Icon className="i" />}
      tone="ok"
      title="Detail kelahiran"
      sub={row.nama_lengkap ?? '—'}
      foot={<DetailFoot canEdit={canEdit} canDelete={canDelete} bisaBatal={false} onClose={onClose} onEdit={onEdit} onRollback={() => {}} onHapus={onHapus} />}
    >
      <KvList
        items={[
          ['Nama bayi', row.nama_lengkap ?? '—'],
          ['NIK', row.nik ?? '—', { mono: true }],
          ['No. KK', row.no_kk ?? '—', { mono: true }],
          ['Jenis kelamin', row.jenis_kelamin ?? '—'],
          ['Tanggal lahir', tglPanjang(row.tanggal_lahir)],
          ['Tempat lahir', row.tempat_lahir ?? '—'],
          ['Agama', row.agama ?? '—'],
          ['Hubungan keluarga', row.hubungan_keluarga ?? '—'],
          ['Nama ayah', row.nama_ayah ?? '—'],
          ['Nama ibu', row.nama_ibu ?? '—'],
          ['RT / RW', `RT ${rt3(row.rt)} / RW ${rt3(row.rw)}`],
          ['Alamat', row.alamat ?? '—', { lebar: true }],
          ['Pendidikan', row.pendidikan ?? '—'],
          ['Pekerjaan', row.pekerjaan ?? '—'],
        ]}
      />
    </Modal>
  )
}

// ── Detail Modal Kematian ─────────────────────────────────────────────────────
function DetailMeninggalModal({
  row, onClose, canEdit, canDelete, onEdit, onRollback, onHapus,
}: {
  row: Meninggal; onClose: () => void; canEdit: boolean; canDelete: boolean
  onEdit: () => void; onRollback: () => void; onHapus: () => void
}) {
  // Hapus hanya menghapus catatan (status penduduk dan suksesi KK tidak dibalik): selama penduduknya masih
  // 'meninggal' yang boleh hanya Batalkan. Hapus tersedia untuk catatan yatim (penduduk aktif lagi / tak ditemukan).
  const { data: penduduk, isLoading: memuat } = usePendudukDetail(row.nik_target ?? '')
  const hapusTerkunci = penduduk?.status === 'meninggal'
  return (
    <Modal
      onClose={onClose}
      icon={<PERISTIWA.kematian.Icon className="i" />}
      tone="mute"
      title="Detail kematian"
      sub={row.nama ?? '—'}
      foot={<DetailFoot canEdit={canEdit} canDelete={canDelete} bisaBatal hapusNonaktif={memuat || hapusTerkunci} onClose={onClose} onEdit={onEdit} onRollback={onRollback} onHapus={onHapus} />}
    >
      <KvList
        items={[
          ['Nama', row.nama ?? '—'],
          ['NIK', row.nik_target ?? '—', { mono: true }],
          ['No. KK', row.no_kk ?? '—', { mono: true }],
          ['Tanggal meninggal', tglPanjang(row.tanggal)],
          ['Hub. keluarga', row.hub_asli ?? '—'],
          ['Sebab kematian', row.sebab ?? '—', { lebar: true }],
        ]}
      />
      {canDelete && hapusTerkunci && (
        <div className="a-alert info" style={{ marginTop: 14 }}>
          <Info className="i" />
          <div>Penduduk ini masih berstatus <strong>Meninggal</strong>. Gunakan Batalkan untuk mengembalikan penduduk.</div>
        </div>
      )}
    </Modal>
  )
}

// ── Edit Modals ───────────────────────────────────────────────────────────────
function EditLahirModal({ row, onClose }: { row: Lahir; onClose: () => void }) {
  const { mutateAsync, isPending } = useEditLahir()
  const { toast } = useToast()
  // Isian, urutan, pilihan, dan validasi SAMA PERSIS dengan form Tambah (LahirFields + validasiKelahiran)
  const [form, setForm] = useState<LahirFormState>(() => lahirDariCatatan(row))
  const [errors, setErrors] = useState<Record<string, string>>({})
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '', ...(k === 'hubungan_keluarga' ? { alamat: '' } : {}) })) }
  async function handleSave() {
    const e = validasiKelahiran(form)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    try {
      const hasil = await mutateAsync({ id: row.id, data: toLahirData(form) })
      const { pesan, jenis } = pesanHasilSinkron('Data kelahiran diperbarui', hasil)
      toast(pesan, jenis); onClose()
    } catch (err) { toast(err instanceof GalatTolak ? `Gagal menyimpan: ${err.message}` : 'Gagal menyimpan', 'error') }
  }
  return (
    <Modal
      onClose={onClose}
      icon={<Pencil className="i" />}
      title="Edit kelahiran"
      sub={row.nama_lengkap}
      width={820}
      foot={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" form="edit-lahir" disabled={isPending}>
            <Check className="i" />{isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="edit-lahir" noValidate onSubmit={e => { e.preventDefault(); void handleSave() }} className="fwrap">
        <div className="a-alert info">
          <Info className="i" />
          <div>Isian sama dengan form Tambah. Perubahan juga memperbarui data penduduk yang berasal dari catatan ini di menu Penduduk (hanya kolom yang Anda ubah).</div>
        </div>
        <LahirFields form={form} errors={errors} onChange={set} />
      </form>
    </Modal>
  )
}

function EditMeninggalModal({ row, onClose }: { row: Meninggal; onClose: () => void }) {
  const { mutateAsync, isPending } = useEditMeninggal()
  const { toast } = useToast()
  const [form, setForm] = useState({ nama: row.nama ?? '', nik_target: row.nik_target ?? '', no_kk: row.no_kk ?? '', tanggal: row.tanggal ?? '', sebab: row.sebab ?? '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })) }
  async function handleSave() {
    // Validasi sama dengan form Tambah (lib/validasi-catatan.ts)
    const e = validasiKematian(form)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    try { await mutateAsync({ id: row.id, data: form }); toast('Data kematian diperbarui', 'success'); onClose() }
    catch { toast('Gagal menyimpan', 'error') }
  }
  return (
    <Modal
      onClose={onClose}
      icon={<Pencil className="i" />}
      title="Edit kematian"
      sub={row.nama}
      foot={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" form="edit-meninggal" disabled={isPending}>
            <Check className="i" />{isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="edit-meninggal" noValidate onSubmit={e => { e.preventDefault(); void handleSave() }} className="a-fg6">
        <Field label="Nama" htmlFor="emn-nama" req error={errors.nama} className="s6">
          <InBox error={!!errors.nama}><input id="emn-nama" value={form.nama} onChange={e => set('nama', e.target.value)} autoComplete="off" /></InBox>
        </Field>
        <Field label="NIK" htmlFor="emn-nik" req error={errors.nik_target} className="s3 nikkk">
          <InBox error={!!errors.nik_target}><input id="emn-nik" className="mono" inputMode="numeric" value={form.nik_target} onChange={e => set('nik_target', angka16(e.target.value))} autoComplete="off" /></InBox>
        </Field>
        <Field label="No. KK" htmlFor="emn-kk" req error={errors.no_kk} className="s3 nikkk">
          <InBox error={!!errors.no_kk}><input id="emn-kk" className="mono" inputMode="numeric" value={form.no_kk} onChange={e => set('no_kk', angka16(e.target.value))} autoComplete="off" /></InBox>
        </Field>
        <Field label="Tanggal Meninggal" htmlFor="emn-tgl" req error={errors.tanggal} className="s3">
          <InBox error={!!errors.tanggal}><input id="emn-tgl" type="date" value={form.tanggal} onChange={e => set('tanggal', e.target.value)} /></InBox>
        </Field>
        <Field label="Sebab" htmlFor="emn-sebab" req error={errors.sebab} className="s3">
          <InBox error={!!errors.sebab}><input id="emn-sebab" value={form.sebab} onChange={e => set('sebab', e.target.value)} autoComplete="off" /></InBox>
        </Field>
      </form>
    </Modal>
  )
}

// ── Keadaan kosong ────────────────────────────────────────────────────────────
function Kosong({ tab, adaSaringan, onTambah }: { tab: Tab; adaSaringan: boolean; onTambah?: () => void }) {
  const Ikon = tab === 'lahir' ? PERISTIWA.kelahiran.Icon : PERISTIWA.kematian.Icon
  return (
    <div className="a-empty">
      <div className="em"><Ikon className="i" style={{ fontSize: 30 }} /></div>
      <h3>{adaSaringan ? 'Tidak ada data yang cocok' : `Belum ada data ${tab === 'lahir' ? 'kelahiran' : 'kematian'}`}</h3>
      <p>{adaSaringan ? 'Tidak ada data yang cocok dengan pencarian, bulan, atau RT yang dipilih. Ubah pilihan atau tekan Reset.' : 'Catatan yang Anda tambahkan akan muncul di sini.'}</p>
      {onTambah && !adaSaringan && (
        <Button type="button" onClick={onTambah}><Plus className="i" />Tambah data</Button>
      )}
    </div>
  )
}

function VitalIsi() {
  const sp = useSearchParams()
  // Param aksi cepat dari Beranda: /vital?tab=<lahir|meninggal>&tambah=1
  const tabParam: Tab = sp.get('tab') === 'meninggal' ? 'meninggal' : 'lahir'
  const tambahParam = sp.get('tambah') === '1'

  const [tabManual, setTabManual] = useState<Tab | null>(null)
  const [formManual, setFormManual] = useState<boolean | null>(null)
  const [q, setQ] = useState('')
  const [bulan, setBulan] = useState('')
  const [rt, setRt] = useState('')
  const [urut, setUrut] = useState<UrutCatatan>(URUT_BAWAAN)
  const [halaman, setHalaman] = useState(1)
  const [detailLahir, setDetailLahir] = useState<Lahir | null>(null)
  const [detailMeninggal, setDetailMeninggal] = useState<Meninggal | null>(null)
  const [editLahir, setEditLahir] = useState<Lahir | null>(null)
  const [editMeninggal, setEditMeninggal] = useState<Meninggal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string; type: Tab; nik_target?: string } | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; nik_target: string; nama: string; hub_asli: string; no_kk: string } | null>(null)

  const { isAdmin, isOperator } = useAuthStore()
  const { toast } = useToast()
  const isDesktop = useIsDesktop()
  const canAdd = isOperator()
  const canDelete = isAdmin()
  // Rules: ubah catatan (update) = admin; tambah (create) = operator
  const canEdit = isAdmin()

  const tab: Tab = tabManual ?? tabParam
  const showForm = canAdd && (formManual ?? tambahParam)

  const { data: dataLahir, isLoading: loadingLahir } = useLahir()
  const { data: dataMeninggal, isLoading: loadingMeninggal } = useMeninggal()
  const { data: dataPenduduk, isLoading: loadingPenduduk } = usePendudukList()
  const { mutate: hapusLahir, isPending: pendingHapusLahir } = useDeleteLahir()
  const { mutate: hapusMeninggal, isPending: pendingHapusMeninggal } = useDeleteMeninggal()
  const { mutate: rollback, isPending: pendingRollback } = useRollbackMeninggal()

  // Catatan Kematian tidak menyimpan RT: RT diambil dari data penduduk (NIK). Daftar penduduk sudah dimuat halaman ini.
  const petaRt = useMemo(() => buatPetaRt(dataPenduduk), [dataPenduduk])
  const perluRtPenduduk = tab === 'meninggal' && (rt !== '' || urut === 'rt')
  const isLoading = (tab === 'lahir' ? loadingLahir : loadingMeninggal) || (perluRtPenduduk && loadingPenduduk)
  const isPendingDelete = tab === 'lahir' ? pendingHapusLahir : pendingHapusMeninggal

  // Saring + urutkan di klien dari data yang sudah dimuat (tanpa query tambahan).
  const listLahir = useMemo(() => {
    const hasil = (dataLahir ?? []).filter(r =>
      cocokCari(q, r.nama_lengkap, r.nik, r.no_kk) && (!bulan || kunciBulan(r.tanggal_lahir) === bulan) && cocokRt(rt, r.rt))
    return urutkanCatatan(hasil, urut, r => ({
      nama: r.nama_lengkap ?? '', nik: r.nik ?? '', kk: r.no_kk ?? '', tanggal: r.tanggal_lahir ?? '', rt: r.rt ?? '', dibuat: waktuBuat(r.created_at),
    }))
  }, [dataLahir, q, bulan, rt, urut])
  const listMeninggal = useMemo(() => {
    const rtDari = (r: Meninggal) => petaRt.get(r.nik_target) ?? ''
    const hasil = (dataMeninggal ?? []).filter(r =>
      cocokCari(q, r.nama, r.nik_target, r.no_kk) && (!bulan || kunciBulan(r.tanggal) === bulan) && cocokRt(rt, rtDari(r)))
    return urutkanCatatan(hasil, urut, r => ({
      nama: r.nama ?? '', nik: r.nik_target ?? '', kk: r.no_kk ?? '', tanggal: r.tanggal ?? '', rt: rtDari(r), dibuat: waktuBuat(r.created_at),
    }))
  }, [dataMeninggal, q, bulan, rt, urut, petaRt])
  const bulanOpsi = useMemo(
    () => daftarBulan(tab === 'lahir' ? (dataLahir ?? []).map(r => r.tanggal_lahir) : (dataMeninggal ?? []).map(r => r.tanggal)),
    [tab, dataLahir, dataMeninggal]
  )
  const jumlah = tab === 'lahir' ? listLahir.length : listMeninggal.length
  const adaSaringan = q.trim() !== '' || bulan !== '' || rt !== ''
  const adaUbahan = adaSaringan || urut !== URUT_BAWAAN
  // Halaman 25 baris; halaman dikoreksi bila daftar memendek (mis. setelah hapus/saring)
  const totalHal = jumlahHalaman(jumlah)
  const hal = klemHalaman(halaman, jumlah)
  const awalNo = (hal - 1) * UKURAN_HALAMAN
  const lahirHal = potongHalaman(listLahir, hal)
  const meninggalHal = potongHalaman(listMeninggal, hal)

  // Form Tambah atau Edit terbuka → pindah tab dikunci (dulu form tertutup sendiri dan isiannya hilang tanpa pemberitahuan)
  const formTerbuka = showForm || !!editLahir || !!editMeninggal
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

  function bukaTambah(untuk: Tab) {
    if (untuk !== tab) { setTabManual(untuk); setHalaman(1); setQ(''); setBulan('') }
    setFormManual(true)
  }
  function tutupForm() { setFormManual(false) }

  function handleDelete() {
    if (!deleteTarget) return
    const { id, nama, type, nik_target } = deleteTarget
    const opts = {
      onSuccess: () => { setDeleteTarget(null); setDetailLahir(null); setDetailMeninggal(null); toast(`Data ${nama} dihapus`, 'success') },
      onError: (e: unknown) => toast(e instanceof GalatTolak ? `Gagal menghapus: ${e.message}` : 'Gagal menghapus', 'error'),
    }
    if (type === 'lahir') hapusLahir({ id, nama }, opts)
    else hapusMeninggal({ id, nama, nik_target }, opts)
  }

  function handleRollback() {
    if (!rollbackTarget) return
    rollback({ meninggalId: rollbackTarget.id, nik_target: rollbackTarget.nik_target, nama: rollbackTarget.nama, hub_asli: rollbackTarget.hub_asli, no_kk: rollbackTarget.no_kk }, {
      onSuccess: () => { setRollbackTarget(null); setDetailMeninggal(null); toast(`Kematian ${rollbackTarget.nama} dibatalkan`, 'success') },
      onError: () => toast('Gagal membatalkan', 'error'),
    })
  }

  function mintaRollback(row: Meninggal) {
    setDetailMeninggal(null)
    setRollbackTarget({ id: row.id, nik_target: row.nik_target, nama: row.nama, hub_asli: row.hub_asli, no_kk: row.no_kk })
  }

  const kosong = <Kosong tab={tab} adaSaringan={adaSaringan} onTambah={canAdd ? () => bukaTambah(tab) : undefined} />

  function bukaDenganEnter(e: React.KeyboardEvent, aksi: () => void) {
    if (e.key === 'Enter' && e.target === e.currentTarget) aksi()
  }

  return (
    <>
      <PageHeader
        className="ph-dua"
        title="Kelahiran & kematian"
        description="Peristiwa kelahiran dan kematian warga"
        action={canAdd ? (
          showForm ? (
            <Button type="button" variant="outline" onClick={tutupForm}>
              <X className="i" />Tutup form
            </Button>
          ) : (
            <>
              <Button type="button" variant={tab === 'lahir' ? 'default' : 'outline'} onClick={() => bukaTambah('lahir')}>
                <PERISTIWA.kelahiran.Icon className="i" />Catat kelahiran
              </Button>
              <Button type="button" variant={tab === 'meninggal' ? 'default' : 'outline'} onClick={() => bukaTambah('meninggal')}>
                <PERISTIWA.kematian.Icon className="i" />Catat kematian
              </Button>
            </>
          )
        ) : undefined}
      />

      <RecTabs
        tabs={[
          { key: 'lahir', label: 'Kelahiran', icon: <PERISTIWA.kelahiran.Icon className="i" />, count: dataLahir?.length },
          { key: 'meninggal', label: 'Kematian', icon: <PERISTIWA.kematian.Icon className="i" />, count: dataMeninggal?.length },
        ]}
        aktif={tab}
        tone={tab === 'lahir' ? 'ok' : 'mute'}
        onPilih={pilihTab}
        terkunci={formTerbuka}
        onTerkunci={tabTerkunci}
      />

      {showForm ? (
        tab === 'lahir'
          ? <LahirForm onSuccess={tutupForm} onCancel={tutupForm} />
          : <MeninggalForm onSuccess={tutupForm} onCancel={tutupForm} allPenduduk={dataPenduduk ?? []} />
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
          ) : tab === 'lahir' ? (
            isDesktop ? (
              <div className="a-tw">
                <div style={{ overflow: 'auto' }}>
                  {listLahir.length === 0 ? kosong : (
                    <table className="a-t" style={{ minWidth: 980 }}>
                      <thead>
                        <tr>
                          <th className="frz frz-no">No</th>
                          <th className="frz frz-nm">Nama Bayi</th>
                          <th>NIK</th>
                          <th>JK</th>
                          <th>Tgl Lahir</th>
                          <th>Ayah</th>
                          <th>Ibu</th>
                          <th>RT/RW</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {lahirHal.map((row: Lahir, i: number) => (
                          <tr
                            key={row.id}
                            className="row"
                            tabIndex={0}
                            onClick={() => setDetailLahir(row)}
                            onKeyDown={e => bukaDenganEnter(e, () => setDetailLahir(row))}
                          >
                            <td className="frz frz-no">{awalNo + i + 1}</td>
                            <td className="frz frz-nm nm2"><NamaCell nama={row.nama_lengkap} jk={row.jenis_kelamin} /></td>
                            <td className="mn">{row.nik || '—'}</td>
                            <td><JkBadge jk={row.jenis_kelamin} /></td>
                            <td className="num">{tglPendek(row.tanggal_lahir)}</td>
                            <td>{row.nama_ayah}</td>
                            <td>{row.nama_ibu}</td>
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
            ) : listLahir.length === 0 ? kosong : (
              <>
              <div className="a-card-list">
                {lahirHal.map((row: Lahir) => (
                  <div
                    key={row.id}
                    className="a-lc"
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailLahir(row)}
                    onKeyDown={e => bukaDenganEnter(e, () => setDetailLahir(row))}
                  >
                    <Avatar nama={row.nama_lengkap} jk={row.jenis_kelamin} size={44} />
                    <div className="m">
                      <b>{row.nama_lengkap}</b>
                      <span>{tglPendek(row.tanggal_lahir)} · {row.tempat_lahir}</span>
                      <span className="mn">{row.nik || '—'}</span>
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
                  {listMeninggal.length === 0 ? kosong : (
                    <table className="a-t" style={{ minWidth: 980 }}>
                      <thead>
                        <tr>
                          <th className="frz frz-no">No</th>
                          <th className="frz frz-nm">Nama</th>
                          <th>NIK</th>
                          <th>No. KK</th>
                          <th>Tgl Meninggal</th>
                          <th>Hub. Keluarga</th>
                          <th>Sebab</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {meninggalHal.map((row: Meninggal, i: number) => (
                          <tr
                            key={row.id}
                            className="row"
                            tabIndex={0}
                            onClick={() => setDetailMeninggal(row)}
                            onKeyDown={e => bukaDenganEnter(e, () => setDetailMeninggal(row))}
                          >
                            <td className="frz frz-no">{awalNo + i + 1}</td>
                            <td className="frz frz-nm nm2"><NamaCell nama={row.nama} /></td>
                            <td className="mn">{row.nik_target || '—'}</td>
                            <td className="mn">{row.no_kk || '—'}</td>
                            <td className="num">{tglPendek(row.tanggal)}</td>
                            <td>{row.hub_asli || '—'}</td>
                            <td>{row.sebab || '—'}</td>
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
            ) : listMeninggal.length === 0 ? kosong : (
              <>
              <div className="a-card-list">
                {meninggalHal.map((row: Meninggal) => (
                  <div
                    key={row.id}
                    className="a-lc"
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailMeninggal(row)}
                    onKeyDown={e => bukaDenganEnter(e, () => setDetailMeninggal(row))}
                  >
                    <Avatar nama={row.nama} size={44} />
                    <div className="m">
                      <b>{row.nama}</b>
                      <span>{tglPendek(row.tanggal)} · {row.sebab || '—'}</span>
                      <span className="mn">{row.nik_target || '—'}</span>
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

      {detailLahir && (
        <DetailLahirModal
          row={detailLahir} onClose={() => setDetailLahir(null)}
          canEdit={canEdit} canDelete={canDelete}
          onEdit={() => { setEditLahir(detailLahir); setDetailLahir(null) }}
          onHapus={() => { setDeleteTarget({ id: detailLahir.id, nama: detailLahir.nama_lengkap, type: 'lahir' }); setDetailLahir(null) }}
        />
      )}
      {detailMeninggal && (
        <DetailMeninggalModal
          row={detailMeninggal} onClose={() => setDetailMeninggal(null)}
          canEdit={canEdit} canDelete={canDelete}
          onEdit={() => { setEditMeninggal(detailMeninggal); setDetailMeninggal(null) }}
          onRollback={() => mintaRollback(detailMeninggal)}
          onHapus={() => { setDeleteTarget({ id: detailMeninggal.id, nama: detailMeninggal.nama, type: 'meninggal', nik_target: detailMeninggal.nik_target }); setDetailMeninggal(null) }}
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
          Catatan {deleteTarget.type === 'lahir' ? 'kelahiran' : 'kematian'} <b>{deleteTarget.nama}</b> akan dihapus.
          {' '}Data penduduknya tidak ikut berubah. Aksi ini tidak bisa dibatalkan.
        </ConfirmModal>
      )}

      {/* Konfirmasi Rollback Kematian */}
      {rollbackTarget && (
        <ConfirmModal
          icon={<Undo2 className="i" style={{ fontSize: 24 }} />}
          tone="warn"
          title="Batalkan Kematian?"
          okLabel="Ya, Batalkan"
          okVariant="default"
          loading={pendingRollback}
          onCancel={() => setRollbackTarget(null)}
          onConfirm={handleRollback}
        >
          <b>{rollbackTarget.nama}</b> akan kembali berstatus aktif dan catatan kematian dihapus.
          {' '}Jika ia Kepala Keluarga, pengganti sementara dikembalikan ke posisi semula.
        </ConfirmModal>
      )}

      {editLahir && <EditLahirModal row={editLahir} onClose={() => setEditLahir(null)} />}
      {editMeninggal && <EditMeninggalModal row={editMeninggal} onClose={() => setEditMeninggal(null)} />}
    </>
  )
}

export default function VitalPage() {
  return (
    <AppShell title="Vital">
      <Suspense fallback={<div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Memuat...</div>}>
        <VitalIsi />
      </Suspense>
    </AppShell>
  )
}
