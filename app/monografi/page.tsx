'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CircleAlert,
  CircleDashed,
  Check,
  Layers,
  Plus,
  SlidersVertical,
  Trash2,
  Users,
} from 'lucide-react'
import { JK_VISUAL } from '@/lib/visual'
import { PENDIDIKAN, STATUS_PERKAWINAN } from '@/lib/penduduk-constants'
import { kunciRentang } from '@/lib/umur'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { BarRows, CountUp, useMasuk, type BarRow } from '@/components/dashboard/dashParts'
import {
  useMonografi, useSaveKelompokUmurConfig, DEFAULT_KELOMPOK_UMUR_CONFIG, formatKelompokLabel,
  type KelompokUmurConfig,
} from '@/hooks/useMonografi'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'

type DataKel = { kelompok: string; laki: number; perempuan: number }

const fmt = (n: number) => n.toLocaleString('id-ID')

// ── Piramida penduduk ─────────────────────────────────────────────────────────
function Piramida({ data }: { data: DataKel[] }) {
  const masuk = useMasuk()
  const mx = Math.max(...data.flatMap(d => [d.laki, d.perempuan]), 1)
  const lebar = (n: number) => (masuk ? `${((n / mx) * 100).toFixed(1)}%` : '0%')
  const minLebar = (n: number) => (masuk && n > 0 ? 26 : 0)
  return (
    <>
      <div className="pyrh">
        <span><i style={{ background: 'var(--lk)' }} />Laki-laki</span>
        <span><i style={{ background: 'var(--pr)' }} />Perempuan</span>
      </div>
      <div className="a-pyr big">
        {[...data].reverse().map(row => (
          <div className="r" key={row.kelompok}>
            <div className="bl"><i style={{ width: lebar(row.laki), minWidth: minLebar(row.laki) }}>{row.laki > 0 ? row.laki : ''}</i></div>
            <span className="lb">{row.kelompok}</span>
            <div className="br"><i style={{ width: lebar(row.perempuan), minWidth: minLebar(row.perempuan) }}>{row.perempuan > 0 ? row.perempuan : ''}</i></div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Klasifikasi umur (tetap, tidak dipengaruhi konfigurasi piramida) ──────────
const KLASIFIKASI_UMUR = [
  { label: 'Balita', min: 0, max: 5, tone: 'ok' },
  { label: 'Anak-anak', min: 6, max: 10, tone: 'info' },
  { label: 'Remaja', min: 11, max: 19, tone: 'pur' },
  { label: 'Dewasa', min: 20, max: 44, tone: 'warn' },
  { label: 'Lansia', min: 45, max: 999, tone: 'bad' },
]

function KlasifikasiUmur({ byKlasifikasi, total }: { byKlasifikasi: Record<string, number>; total: number }) {
  const tercatat = Object.values(byKlasifikasi).reduce((a, b) => a + b, 0)
  return (
    <div className="a-card p lift">
      <div className="ch2" style={{ marginBottom: 12 }}>
        <h3>Klasifikasi umur</h3>
        <span className="a-badge mute nd">Klik untuk melihat warga</span>
      </div>
      <div className="klas">
        {KLASIFIKASI_UMUR.map(k => {
          const n = byKlasifikasi[k.label] ?? 0
          return (
            <Link className="kt clk" key={k.label} href={`/penduduk?umur=${kunciRentang(k.min, k.max)}&status=aktif`}>
              <span className={`a-badge ${k.tone} sm nd`}>{k.label}</span>
              <b><CountUp value={n} /></b>
              <small>
                {k.max === 999 ? `${k.min}+ th` : `${k.min}–${k.max} th`} · {total ? Math.round((n / total) * 100) : 0}%
              </small>
            </Link>
          )
        })}
      </div>
      <div className="rtot">
        <span>Total tercatat dalam klasifikasi</span>
        <span>{fmt(tercatat)} jiwa</span>
      </div>
    </div>
  )
}

// ── Komposisi beban tanggungan (dihitung dari konfigurasi piramida yang aktif) ─
function BebanTanggungan({ data, config, total }: { data: DataKel[]; config: KelompokUmurConfig; total: number }) {
  const masuk = useMasuk()
  let muda = 0 // 0–14
  let produktif = 0 // 15–64
  let tua = 0 // 65+
  data.forEach((row, i) => {
    const cfg = config[i]
    if (!cfg) return
    const jumlah = row.laki + row.perempuan
    if (cfg.max <= 14) muda += jumlah
    else if (cfg.min >= 65) tua += jumlah
    else produktif += jumlah
  })
  const rasio = produktif > 0 ? Math.round(((muda + tua) / produktif) * 100) : 0
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const bagian = [
    { label: 'Tanggungan muda', ket: 'usia 0–14 tahun', n: muda, warna: 'var(--gold-500)' },
    { label: 'Usia produktif', ket: 'usia 15–64 tahun', n: produktif, warna: 'var(--navy-600)' },
    { label: 'Tanggungan tua', ket: 'usia 65+ tahun', n: tua, warna: 'var(--pr)' },
  ]
  const tingkat = rasio <= 50 ? { teks: 'Rendah ✓', tone: 'ok' } : rasio <= 80 ? { teks: 'Sedang', tone: 'warn' } : { teks: 'Tinggi', tone: 'bad' }

  return (
    <div className="a-card p lift">
      <div className="ch2">
        <h3>Rasio beban tanggungan</h3>
        <span className="a-badge mute nd">{fmt(total)} jiwa aktif</span>
      </div>
      <p className="sub2">Komposisi tanggungan muda (0–14), produktif (15–64), tanggungan tua (65+)</p>
      <div className="a-bar t" style={{ margin: '12px 0' }}>
        {bagian.map(b => (
          <i
            key={b.label}
            title={`${b.label}: ${b.n} jiwa (${pct(b.n)}%)`}
            style={{ width: masuk ? `${pct(b.n)}%` : '0%', background: b.warna }}
          />
        ))}
      </div>
      <div className="rs">
        {bagian.map(b => (
          <div key={b.label}>
            <span style={{ background: b.warna }} />
            {b.label}<b>{fmt(b.n)}</b>
            <small style={{ color: 'var(--ink-3)' }}>{b.ket} · {pct(b.n)}%</small>
          </div>
        ))}
      </div>
      <div className="rasio">
        <b>{rasio}</b>
        <span>tanggungan per 100 penduduk usia produktif</span>
        <span className={`a-badge ${tingkat.tone} sm nd`} style={{ marginLeft: 'auto' }}>{tingkat.teks}</span>
      </div>
    </div>
  )
}

// ── Kartu sebaran (Agama, Status perkawinan, Pendidikan, Pekerjaan) ───────────
// Urutan: bila `baku` diberikan (status perkawinan, pendidikan = urutan bertingkat) ikuti urutan itu, nilai lama di luar daftar di akhir;
// selain itu (agama, pekerjaan) dari yang terbanyak.
function barisSebaran(rec: Record<string, number>, kunci: string, baku?: readonly string[]): BarRow[] {
  const posisi = (k: string) => { const i = baku ? baku.indexOf(k) : -1; return i < 0 ? Number.MAX_SAFE_INTEGER : i }
  return Object.entries(rec)
    .filter(([, n]) => n > 0)
    .sort((a, b) => (baku ? posisi(a[0]) - posisi(b[0]) : 0) || b[1] - a[1])
    .map(([k, n]) => ({
      key: k,
      label: k,
      nilai: n,
      href: `/penduduk?${kunci}=${encodeURIComponent(k)}&status=aktif`,
    }))
}

function KartuSebaran({
  judul, sub, rec, kunci, total, warna, batas, baku,
}: {
  judul: string; sub: string; rec: Record<string, number>; kunci: string
  total: number; warna: string; batas?: number; baku?: readonly string[]
}) {
  const [semua, setSemua] = useState(false)
  const rows = barisSebaran(rec, kunci, baku)
  const tampil = batas && !semua ? rows.slice(0, batas) : rows
  const tercatat = Object.values(rec).reduce((a, b) => a + b, 0)
  return (
    <div className="a-card p lift">
      <div className="ch2">
        <h3>{judul}</h3>
        <span className="a-badge mute nd">Klik untuk melihat warga</span>
      </div>
      <p className="sub2">{sub}</p>
      {rows.length === 0 ? (
        <p className="a-hint" style={{ padding: '10px 0' }}>Belum ada data.</p>
      ) : (
        <BarRows rows={tampil} total={total} warna={warna} />
      )}
      {batas !== undefined && rows.length > batas && (
        <Button type="button" variant="ghost" size="sm" style={{ marginTop: 8 }} onClick={() => setSemua(v => !v)}>
          {semua ? `Tampilkan ${batas} teratas` : `Tampilkan semua (${rows.length})`}
        </Button>
      )}
      <div className="rtot">
        <span>Total tercatat</span>
        <span>{fmt(tercatat)} jiwa</span>
      </div>
    </div>
  )
}

// ── Modal kelompok umur piramida ──────────────────────────────────────────────
interface BarisKel { min: string; max: string }

const keBaris = (cfg: KelompokUmurConfig): BarisKel[] =>
  cfg.map(e => ({ min: String(e.min), max: e.max === 999 ? '' : String(e.max) }))

const PRESET: { label: string; kel: KelompokUmurConfig }[] = [
  { label: '5 tahunan (bawaan)', kel: DEFAULT_KELOMPOK_UMUR_CONFIG },
  { label: 'Sekolah', kel: [{ min: 0, max: 6 }, { min: 7, max: 12 }, { min: 13, max: 15 }, { min: 16, max: 18 }, { min: 19, max: 59 }, { min: 60, max: 999 }] },
  { label: 'Produktif', kel: [{ min: 0, max: 14 }, { min: 15, max: 64 }, { min: 65, max: 999 }] },
  { label: 'Dasawarsa', kel: [{ min: 0, max: 9 }, { min: 10, max: 19 }, { min: 20, max: 29 }, { min: 30, max: 39 }, { min: 40, max: 49 }, { min: 50, max: 59 }, { min: 60, max: 999 }] },
]

function KelompokUmurModal({
  config, menyimpan, onClose, onSave,
}: {
  config: KelompokUmurConfig
  menyimpan: boolean
  onClose: () => void
  onSave: (c: KelompokUmurConfig) => void
}) {
  const [rows, setRows] = useState<BarisKel[]>(() =>
    keBaris(config.length > 0 ? config : DEFAULT_KELOMPOK_UMUR_CONFIG)
  )
  const [galat, setGalat] = useState('')
  const [buruk, setBuruk] = useState(-1)
  const [contoh, setContoh] = useState(false)

  const gagal = (pesan: string, idx = -1) => { setGalat(pesan); setBuruk(idx) }

  function ubah(i: number, sisi: 'min' | 'max', nilai: string) {
    setRows(prev => prev.map((r, j) => (j === i ? { ...r, [sisi]: nilai } : r)))
    setGalat(''); setBuruk(-1)
  }

  function tambah() {
    if (rows.length >= 30) { gagal('Maksimal 30 kelompok umur'); return }
    const t = rows[rows.length - 1]
    const mxT = t ? (t.max.trim() === '' || t.max.trim() === '+' ? 999 : parseInt(t.max, 10)) : NaN
    const baru = !t || isNaN(mxT) || mxT === 999
      ? { min: '0', max: '4' }
      : { min: String(mxT + 1), max: String(mxT + 5) }
    setRows(prev => [...prev, baru])
    setGalat(''); setBuruk(-1)
  }

  function hapus(i: number) {
    setRows(prev => prev.filter((_, j) => j !== i))
    setGalat(''); setBuruk(-1)
  }

  function pakaiContoh(kel: KelompokUmurConfig) {
    setRows(keBaris(kel))
    setContoh(false)
    setGalat(''); setBuruk(-1)
  }

  function simpan() {
    setGalat(''); setBuruk(-1)
    if (rows.length === 0) { gagal('Minimal harus ada 1 kelompok umur'); return }
    if (rows.length > 30) { gagal('Maksimal 30 kelompok umur'); return }
    const hasil: KelompokUmurConfig = []
    for (let i = 0; i < rows.length; i++) {
      const mn = parseInt(rows[i].min, 10)
      const t = rows[i].max.trim()
      const mx = t === '+' || t === '' ? 999 : parseInt(t, 10)
      if (isNaN(mn) || mn < 0) { gagal('Umur min tidak valid', i); return }
      if (isNaN(mx) || (mx !== 999 && mx < mn)) { gagal('Umur maks tidak valid atau lebih kecil dari min', i); return }
      hasil.push({ min: mn, max: mx })
    }
    const urut = [...hasil].sort((a, b) => a.min - b.min)
    for (let i = 1; i < urut.length; i++) {
      if (urut[i].min <= urut[i - 1].max) { gagal('Ada kelompok umur yang overlap — harap perbaiki'); return }
    }
    onSave(urut)
  }

  return (
    <Modal
      onClose={onClose}
      width={560}
      icon={<SlidersVertical className="i" />}
      title="Kelompok umur piramida"
      sub="Atur rentang umur sesuai kebutuhan laporan"
      foot={
        <>
          <Button type="button" variant="ghost" style={{ marginRight: 'auto' }} onClick={() => setContoh(v => !v)} aria-expanded={contoh}>
            <Layers className="i" />Contoh format
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={menyimpan}>Batal</Button>
          <Button type="button" onClick={simpan} disabled={menyimpan}><Check className="i" />Simpan</Button>
        </>
      }
    >
      {galat && (
        <div className="a-alert bad" role="alert" style={{ marginBottom: 12 }}>
          <CircleAlert className="i" />
          <div>{galat}</div>
        </div>
      )}
      {contoh && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {PRESET.map(p => (
            <Button key={p.label} type="button" variant="outline" size="sm" onClick={() => pakaiContoh(p.kel)}>
              {p.label}
            </Button>
          ))}
        </div>
      )}
      <div className="krh">
        <span>Umur min</span><span /><span>Umur maks (kosong atau + = tak terbatas)</span><span />
      </div>
      {rows.map((r, i) => (
        <div className="kr" key={i}>
          <input
            type="number"
            min={0}
            max={120}
            aria-label={`Umur min kelompok ${i + 1}`}
            aria-invalid={buruk === i}
            value={r.min}
            onChange={e => ubah(i, 'min', e.target.value)}
          />
          <span>–</span>
          <input
            type="text"
            placeholder="+"
            aria-label={`Umur maks kelompok ${i + 1}`}
            aria-invalid={buruk === i}
            value={r.max}
            onChange={e => ubah(i, 'max', e.target.value)}
          />
          <button type="button" aria-label={`Hapus kelompok ${formatKelompokLabel({ min: parseInt(r.min, 10) || 0, max: r.max.trim() === '' || r.max.trim() === '+' ? 999 : parseInt(r.max, 10) || 0 })}`} onClick={() => hapus(i)}>
            <Trash2 className="i" style={{ fontSize: 15 }} />
          </button>
        </div>
      ))}
      {rows.length === 0 && <p className="a-hint" style={{ textAlign: 'center', padding: '10px 0' }}>Belum ada kelompok. Tambah di bawah.</p>}
      <Button type="button" variant="secondary" size="sm" style={{ marginTop: 8 }} onClick={tambah}>
        <Plus className="i" />Tambah kelompok
      </Button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <p className="a-hint" style={{ margin: 0, flex: 1 }}>{rows.length} dari maksimal 30 kelompok.</p>
        <Button type="button" variant="ghost" size="xs" onClick={() => pakaiContoh(DEFAULT_KELOMPOK_UMUR_CONFIG)}>
          Reset ke default
        </Button>
      </div>
      <p className="a-hint" style={{ marginTop: 6 }}>
        Contoh: min 0 maks 4 menjadi &ldquo;0–4&rdquo;; min 65 dengan maks kosong atau + menjadi &ldquo;65+&rdquo;.
      </p>
    </Modal>
  )
}

// ── Halaman ───────────────────────────────────────────────────────────────────
export default function MonografiPage() {
  const { data, isLoading } = useMonografi()
  const saveMutation = useSaveKelompokUmurConfig()
  const { toast } = useToast()
  const { wilayah } = useAppStore()
  const { isAdmin } = useAuthStore()
  const canAtur = isAdmin()   // rules: config write = admin
  const [bukaKel, setBukaKel] = useState(false)

  function handleSaveConfig(config: KelompokUmurConfig) {
    saveMutation.mutate(config, {
      onSuccess: () => {
        setBukaKel(false)
        toast('Kelompok umur disimpan', 'success')
      },
      // Modal tetap terbuka supaya isian tidak hilang
      onError: () => toast('Gagal menyimpan kelompok umur', 'error'),
    })
  }

  const total = data?.totalAktif ?? 0
  const persen = (n: number) => `${total ? Math.round((n / Math.max(total, 1)) * 100) : 0}% dari total`
  const tercatatPiramida = data ? data.piramidaUmur.reduce((s, r) => s + r.laki + r.perempuan, 0) : 0

  return (
    <AppShell title="Monografi">
      <PageHeader title="Monografi desa" description={`Statistik penduduk aktif Desa ${wilayah.desa}`} />

      <div className="g4">
        <StatCard label="Penduduk aktif" icon={Users} tone="navy" value={data?.totalAktif} loading={isLoading} subLabel="dihitung dari status Aktif" />
        <StatCard label="Laki-laki" icon={JK_VISUAL.L.Icon} tone="lk" value={data?.laki} loading={isLoading} subLabel={data ? persen(data.laki) : undefined} />
        <StatCard label="Perempuan" icon={JK_VISUAL.P.Icon} tone="pr" value={data?.perempuan} loading={isLoading} subLabel={data ? persen(data.perempuan) : undefined} />
        <StatCard label="Tidak aktif" icon={CircleDashed} tone="mute" value={data?.totalTidakAktif} loading={isLoading} subLabel="meninggal, pindah, dll." />
      </div>

      {isLoading ? (
        <>
          <div className="g2 eq" style={{ marginTop: 14 }}>
            {[0, 1].map(i => (
              <div className="a-card p" key={i}>
                <Skeleton style={{ height: 18, width: 140, marginBottom: 14 }} />
                {[...Array(5)].map((_, j) => <Skeleton key={j} style={{ height: 14, marginBottom: 14 }} />)}
              </div>
            ))}
          </div>
          <div className="a-card p" style={{ marginTop: 14 }}>
            <Skeleton style={{ height: 18, width: 180, marginBottom: 14 }} />
            {[...Array(6)].map((_, j) => <Skeleton key={j} style={{ height: 22, marginBottom: 10 }} />)}
          </div>
        </>
      ) : !data ? (
        <div className="a-card" style={{ marginTop: 14 }}>
          <div className="a-empty">
            <div className="em"><CircleDashed className="i" style={{ fontSize: 30 }} /></div>
            <h3>Data monografi tidak tersedia</h3>
            <p>Muat ulang halaman ini beberapa saat lagi.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="g2 eq" style={{ marginTop: 14 }}>
            <KartuSebaran judul="Agama" sub="Sebaran pemeluk agama" rec={data.byAgama} kunci="agama" total={total}
              warna="linear-gradient(90deg,var(--navy-700),var(--navy-500))" />
            <KartuSebaran judul="Status perkawinan" sub="Sebaran status kawin" rec={data.byStatusPerkawinan} kunci="statusPerkawinan" total={total} baku={STATUS_PERKAWINAN}
              warna="linear-gradient(90deg,var(--gold-600),var(--gold-400))" />
          </div>
          <div className="g2 eq" style={{ marginTop: 14 }}>
            <KartuSebaran judul="Tingkat pendidikan" sub="Pendidikan terakhir" rec={data.byPendidikan} kunci="pendidikan" total={total} baku={PENDIDIKAN}
              warna="linear-gradient(90deg,var(--navy-600),#6FA8F0)" />
            <KartuSebaran judul="Pekerjaan" sub="Pekerjaan terbanyak" rec={data.byPekerjaan} kunci="pekerjaan" total={total} batas={8}
              warna="linear-gradient(90deg,var(--gold-600),var(--gold-400))" />
          </div>

          <div className="a-card" style={{ marginTop: 14 }}>
            <div className="ch">
              <div>
                <h3>Piramida penduduk</h3>
                <p>{data.kelompokUmurConfig.length} kelompok umur · {fmt(total)} penduduk aktif</p>
              </div>
              {canAtur && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setBukaKel(true)}>
                  <SlidersVertical className="i" />Atur kelompok umur
                </Button>
              )}
            </div>
            <div style={{ padding: '18px 22px 22px' }}>
              <Piramida data={data.piramidaUmur} />
              <p className="a-hint" style={{ marginTop: 14 }}>
                Kelompok umur bisa disesuaikan untuk permintaan data dengan format berbeda (mis. data sekolah atau usia produktif).
              </p>
              <div className="rtot">
                <span>Total tercatat dalam piramida</span>
                <span>{fmt(tercatatPiramida)} jiwa</span>
              </div>
            </div>
          </div>

          <div className="g2 eq" style={{ marginTop: 14 }}>
            <KlasifikasiUmur byKlasifikasi={data.byKlasifikasiUmur} total={total} />
            <BebanTanggungan data={data.piramidaUmur} config={data.kelompokUmurConfig} total={total} />
          </div>
        </>
      )}

      {bukaKel && canAtur && (
        <KelompokUmurModal
          config={data?.kelompokUmurConfig ?? DEFAULT_KELOMPOK_UMUR_CONFIG}
          menyimpan={saveMutation.isPending}
          onClose={() => setBukaKel(false)}
          onSave={handleSaveConfig}
        />
      )}
    </AppShell>
  )
}
