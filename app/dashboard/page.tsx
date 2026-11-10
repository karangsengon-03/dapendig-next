'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { PERISTIWA } from '@/lib/visual'
import { JkIkon } from '@/components/ui/jk-ikon'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/dashboard/StatCard'
import { GenderChart } from '@/components/dashboard/GenderChart'
import { WilayahBadge } from '@/components/dashboard/WilayahBadge'
import { UmurChart } from '@/components/dashboard/UmurChart'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { BarRows, CountUp, useMasuk } from '@/components/dashboard/dashParts'
import {
  usePendudukStats,
  usePendudukBaruBulanIni,
  useUmurStats,
  useRecentLog,
} from '@/hooks/useDashboard'
import { useLahir } from '@/hooks/useVital'
import { useMeninggal } from '@/hooks/useVital'
import { useMutasiKeluar, useMutasiMasuk } from '@/hooks/useMutasi'
import { useAuthStore } from '@/store/authStore'
import { cocokBulan } from '@/lib/tanggal-lokal'

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

// Tanggal berupa string 'YYYY-MM-DD' dipotong (bukan new Date(str)) agar tidak bergeser di zona barat UTC
const filterBulan = cocokBulan

function geser(bulan: number, tahun: number, n: number) {
  const t = tahun * 12 + bulan + n
  return { b: ((t % 12) + 12) % 12, y: Math.floor(t / 12) }
}

// Jumlah bulan terpilih, selisih dari bulan sebelumnya, dan 9 titik sparkline: semua dari data yang sudah dimuat Beranda (tanpa query baru).
function hitungKartu<T>(rows: T[] | undefined, ambil: (r: T) => unknown, bulan: number, tahun: number) {
  if (!rows) return null
  const seri = Array.from({ length: 9 }, (_, i) => {
    const m = geser(bulan, tahun, i - 8)
    return rows.filter(r => filterBulan(ambil(r), m.b, m.y)).length
  })
  const lalu = geser(bulan, tahun, -1)
  return { n: seri[8], selisih: seri[8] - seri[7], banding: NAMA_BULAN[lalu.b], seri }
}

// Tombol pencatatan cepat; param URL dibaca halaman Mutasi/Vital di Tahap 4: ?tab=<tab>&tambah=1
const AKSI_CEPAT = [
  { href: '/vital?tab=lahir&tambah=1', label: 'Kelahiran', ikon: PERISTIWA.kelahiran.Icon },
  { href: '/vital?tab=meninggal&tambah=1', label: 'Kematian', ikon: PERISTIWA.kematian.Icon },
  { href: '/mutasi?tab=masuk&tambah=1', label: 'Pindah masuk', ikon: PERISTIWA.pindah_masuk.Icon },
  { href: '/mutasi?tab=keluar&tambah=1', label: 'Pindah keluar', ikon: PERISTIWA.pindah_keluar.Icon },
]

function AksiCepat() {
  return (
    <div className="qa">
      <span>Catat cepat</span>
      {AKSI_CEPAT.map(({ href, label, ikon: Ikon }) => (
        <Button key={href} asChild variant="secondary" size="sm">
          <Link href={href}><Ikon className="i" />{label}</Link>
        </Button>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth())
  const [tahun, setTahun] = useState(now.getFullYear())
  const masuk = useMasuk()
  const { isOperator } = useAuthStore()

  const { data: stats, isLoading: loadingStats } = usePendudukStats()
  const { data: pendudukBaru = 0 } = usePendudukBaruBulanIni()
  const { data: umur = [], isLoading: loadingUmur } = useUmurStats()
  const { data: logs = [], isLoading: loadingLog } = useRecentLog()
  const { data: allLahir, isLoading: loadLahir } = useLahir()
  const { data: allMeninggal, isLoading: loadMeninggal } = useMeninggal()
  const { data: allKeluar, isLoading: loadKeluar } = useMutasiKeluar()
  const { data: allMasuk, isLoading: loadMasuk } = useMutasiMasuk()

  const kLahir = hitungKartu(allLahir, r => r.tanggal_lahir, bulan, tahun)
  const kMati = hitungKartu(allMeninggal, r => r.tanggal, bulan, tahun)
  const kKeluar = hitungKartu(allKeluar, r => r.tanggal, bulan, tahun)
  const kMasuk = hitungKartu(allMasuk, r => r.tanggal, bulan, tahun)

  function prevBulan() {
    if (bulan === 0) { setBulan(11); setTahun(t => t - 1) }
    else setBulan(b => b - 1)
  }
  function nextBulan() {
    const isThisMonth = bulan === now.getMonth() && tahun === now.getFullYear()
    if (isThisMonth) return
    if (bulan === 11) { setBulan(0); setTahun(t => t + 1) }
    else setBulan(b => b + 1)
  }

  const isCurrentMonth = bulan === now.getMonth() && tahun === now.getFullYear()

  const laki = stats?.lakiLaki ?? 0
  const perempuan = stats?.perempuan ?? 0
  const totalPenduduk = stats?.totalPenduduk ?? 0
  const persenLaki = laki + perempuan > 0 ? (laki / (laki + perempuan)) * 100 : 50

  const rtRows = (stats?.rtData ?? []).map(row => ({
    key: row.rt,
    label: row.rt === 'Lain-lain' ? row.rt : `RT ${row.rt}`,
    nilai: row.jumlah,
    laki: row.laki,
    perempuan: row.perempuan,
    // Klik RT → daftar penduduk RT itu (param rt dibaca app/penduduk/page.tsx); "Lain-lain" bukan satu RT.
    href: row.rt === 'Lain-lain' ? undefined : `/penduduk?rt=${row.rt}`,
  }))
  const dusunRows = (stats?.dusunData ?? []).map(row => ({
    key: row.dusun,
    label: row.dusun,
    nilai: row.jumlah,
    laki: row.laki,
    perempuan: row.perempuan,
    // Klik dusun → daftar penduduk aktif di dusun itu (param dusun dibaca app/penduduk/page.tsx); "Lain-lain" bukan satu dusun.
    href: row.dusun === 'Lain-lain' ? undefined : `/penduduk?dusun=${encodeURIComponent(row.dusun)}&status=aktif`,
  }))

  return (
    <AppShell title="Beranda">
      <PageHeader
        title="Beranda"
        description={`Ringkasan kependudukan per ${NAMA_BULAN[bulan]} ${tahun}`}
        action={
          <>
            <div className="a-seg mn">
              <button type="button" onClick={prevBulan} aria-label="Bulan sebelumnya" style={{ padding: '0 12px' }}>
                <ChevronLeft className="i" />
              </button>
              <select
                aria-label="Bulan"
                value={bulan}
                onChange={e => setBulan(Number(e.target.value))}
              >
                {NAMA_BULAN.map((nm, i) => <option key={i} value={i}>{nm}</option>)}
              </select>
              <select
                aria-label="Tahun"
                value={tahun}
                onChange={e => setTahun(Number(e.target.value))}
              >
                {Array.from({ length: now.getFullYear() - 1944 }, (_, i) => now.getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button type="button" onClick={nextBulan} disabled={isCurrentMonth} aria-label="Bulan berikutnya" style={{ padding: '0 12px' }}>
                <ChevronRight className="i" />
              </button>
            </div>
          </>
        }
      />

      {/* Kop desa: total penduduk, kepala keluarga, L/P */}
      <div className="a-kop">
        <div className="seal" />
        <div className="kin">
          <div>
            <WilayahBadge />
            <div className="big tab">
              {loadingStats
                ? <Skeleton style={{ height: 56, width: 190, borderRadius: 12 }} />
                : <><CountUp value={totalPenduduk} /><small>jiwa</small></>}
            </div>
            <div className="sub">
              dalam <b>{loadingStats ? '…' : (stats?.totalKK ?? 0).toLocaleString('id-ID')} kepala keluarga</b>
              {pendudukBaru > 0 && <> · <b>+{pendudukBaru}</b> penduduk baru bulan ini</>}
            </div>
          </div>
          <div className="kx">
            <div><span><JkIkon jk="L" size={13} /> Laki-laki</span><b><CountUp value={laki} /></b></div>
            <i />
            <div><span><JkIkon jk="P" size={13} /> Perempuan</span><b><CountUp value={perempuan} /></b></div>
          </div>
        </div>
        <div className="gbar">
          <i style={{ width: masuk ? `${persenLaki.toFixed(1)}%` : '0%', background: '#7DB2F0' }} />
          <i style={{ background: '#F0A2CC', flex: 1 }} />
        </div>
      </div>

      {/* Kelahiran, kematian, mutasi bulan terpilih */}
      <div className="g4" style={{ marginTop: 16 }}>
        <StatCard label="Kelahiran" icon={PERISTIWA.kelahiran.Icon} tone={PERISTIWA.kelahiran.nada} loading={loadLahir}
          value={kLahir?.n ?? 0} spark={kLahir?.seri}
          delta={kLahir ? { selisih: kLahir.selisih, baik: kLahir.selisih >= 0, banding: kLahir.banding } : undefined} />
        <StatCard label="Kematian" icon={PERISTIWA.kematian.Icon} tone={PERISTIWA.kematian.nada} loading={loadMeninggal}
          value={kMati?.n ?? 0} spark={kMati?.seri}
          delta={kMati ? { selisih: kMati.selisih, baik: kMati.selisih <= 0, banding: kMati.banding } : undefined} />
        <StatCard label="Pindah keluar" icon={PERISTIWA.pindah_keluar.Icon} tone={PERISTIWA.pindah_keluar.nada} loading={loadKeluar}
          value={kKeluar?.n ?? 0} spark={kKeluar?.seri}
          delta={kKeluar ? { selisih: kKeluar.selisih, baik: kKeluar.selisih <= 0, banding: kKeluar.banding } : undefined} />
        <StatCard label="Pindah masuk" icon={PERISTIWA.pindah_masuk.Icon} tone={PERISTIWA.pindah_masuk.nada} loading={loadMasuk}
          value={kMasuk?.n ?? 0} spark={kMasuk?.seri}
          delta={kMasuk ? { selisih: kMasuk.selisih, baik: kMasuk.selisih >= 0, banding: kMasuk.banding } : undefined} />
      </div>

      {/* Sebaran per RT dan dusun + jenis kelamin */}
      <div className="g2" style={{ marginTop: 14 }}>
        <div className="a-card p">
          <div className="ch2">
            <h3>Sebaran per RT</h3>
            <span className="a-badge mute nd">Klik untuk melihat warga</span>
          </div>
          {loadingStats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '6px 10px' }}>
              {[...Array(5)].map((_, i) => <Skeleton key={i} style={{ height: 14 }} />)}
            </div>
          ) : (
            <>
              <BarRows rows={rtRows} total={totalPenduduk} warna="linear-gradient(90deg,var(--navy-700),var(--navy-500))" />
              <div className="rtot">
                <span>Total</span>
                <span className="lp"><b className="l">L {laki.toLocaleString('id-ID')}</b> · <b className="p">P {perempuan.toLocaleString('id-ID')}</b></span>
                <span>{totalPenduduk.toLocaleString('id-ID')}</span>
              </div>
            </>
          )}

          <div className="ch2" style={{ marginTop: 18 }}>
            <h3>Sebaran per dusun</h3>
            <span className="a-badge mute nd">Klik untuk melihat warga</span>
          </div>
          {loadingStats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '6px 10px' }}>
              {[...Array(4)].map((_, i) => <Skeleton key={i} style={{ height: 14 }} />)}
            </div>
          ) : (
            <>
              <BarRows rows={dusunRows} total={totalPenduduk} warna="linear-gradient(90deg,var(--gold-600),var(--gold-400))" />
              <div className="rtot">
                <span>Total</span>
                <span className="lp"><b className="l">L {laki.toLocaleString('id-ID')}</b> · <b className="p">P {perempuan.toLocaleString('id-ID')}</b></span>
                <span>{totalPenduduk.toLocaleString('id-ID')}</span>
              </div>
            </>
          )}
        </div>

        <GenderChart lakiLaki={laki} perempuan={perempuan} loading={loadingStats} />
      </div>

      {/* Kelompok umur + aktivitas terbaru */}
      <div className="g2" style={{ marginTop: 14 }}>
        <UmurChart data={umur} loading={loadingUmur} />
        <RecentActivity
          logs={logs.slice(0, 6)}
          loading={loadingLog}
          footer={isOperator() ? <AksiCepat /> : undefined}
        />
      </div>
    </AppShell>
  )
}
