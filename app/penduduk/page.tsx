'use client'

import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import { rt3 } from '@/lib/rt-rw'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { PendudukTable } from '@/components/penduduk/PendudukTable'
import { PendudukFilter, adaFilterAktif, FILTER_AWAL, type FilterState } from '@/components/penduduk/PendudukFilter'
import { usePendudukList } from '@/hooks/usePenduduk'
import { useDusunAktif } from '@/hooks/useDusunAktif'
import { PENDIDIKAN } from '@/lib/penduduk-constants'
import { jumlahKeluarga } from '@/lib/keluarga'
import { cocokRentangUmur, cocokKlasifikasi, kunciRentangSah, klasifikasiSah } from '@/lib/umur'
import { useAuthStore } from '@/store/authStore'

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

// Satu sumber nilai awal filter (FILTER_AWAL di PendudukFilter) supaya penambahan filter tidak perlu diubah di dua tempat.
const DEFAULT_FILTER: FilterState = FILTER_AWAL

// Param URL (dari klik di Beranda dan Monografi): ?rt= &dusun= &umur=0-4 &agama= &pekerjaan= &pendidikan= &statusPerkawinan= &status=
const PARAM_FILTER = ['rt', 'dusun', 'umur', 'klasifikasi', 'agama', 'pekerjaan', 'pendidikan', 'statusPerkawinan', 'status'] as const

function filterDariUrl(sp: { get: (k: string) => string | null }): FilterState {
  return {
    ...DEFAULT_FILTER,
    rt: sp.get('rt') ?? '',
    dusun: sp.get('dusun') ?? '',
    umur: kunciRentangSah(sp.get('umur')),
    klasifikasi: klasifikasiSah(sp.get('klasifikasi')),
    agama: sp.get('agama') ?? '',
    pekerjaan: sp.get('pekerjaan') ?? '',
    pendidikan: sp.get('pendidikan') ?? '',
    statusPerkawinan: sp.get('statusPerkawinan') ?? '',
    status: sp.get('status') ?? 'aktif',
  }
}

// Urutan hubungan keluarga yang benar untuk sorting dalam 1 KK
const HUB_ORDER: Record<string, number> = {
  'Kepala Keluarga': 0,
  'Istri': 1,
  'Anak': 2,
  'Menantu': 3,
  'Cucu': 4,
  'Orang Tua': 5,
  'Mertua': 6,
  'Famili Lain': 7,
  'Pembantu': 8,
  'Lainnya': 9,
}

function PendudukContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: allData = [], isLoading } = usePendudukList()
  const { dusunDariRt } = useDusunAktif()

  // Tandai apakah filter berasal dari URL params (navigasi dari monografi)
  // Jika iya, JANGAN simpan ke sessionStorage agar tidak ter-restore saat kembali ke
  // halaman ini tanpa URL params (pindah menu lain lalu kembali)
  const hasUrlParams = PARAM_FILTER.some((k) => searchParams.get(k) !== null)

  // Ref untuk track apakah filter ini berasal dari monografi (URL params)
  // sehingga kita tidak menyimpannya ke sessionStorage
  const isFromMonografiRef = useRef(hasUrlParams)

  const [filter, setFilter] = useState<FilterState>(() => {
    if (hasUrlParams) {
      // Filter dari monografi — terapkan langsung, tidak dari sessionStorage
      return filterDariUrl(searchParams)
    }
    // Restore dari sessionStorage hanya jika tidak ada URL params
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('penduduk_filter')
        if (saved) {
          const parsed = JSON.parse(saved) as FilterState
          return { ...DEFAULT_FILTER, ...parsed }
        }
      } catch { /* ignore */ }
    }
    return { ...DEFAULT_FILTER }
  })
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('penduduk_page_size')
        if (saved) return Number(saved) as 25 | 50 | 100
      } catch { /* ignore */ }
    }
    return 25
  })
  const [page, setPage] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('penduduk_page')
        if (saved) return Number(saved)
      } catch { /* ignore */ }
    }
    return 1
  })

  // Setelah filter dari monografi diterapkan, bersihkan URL params dengan replace history
  // sehingga: (1) refresh tidak re-apply filter monografi, (2) navigasi kembali tidak membawa filter lama
  useEffect(() => {
    if (!hasUrlParams) return
    isFromMonografiRef.current = true
    setFilter(filterDariUrl(searchParams)) // eslint-disable-line react-hooks/set-state-in-effect
    setPage(1)
    // Hapus URL params tanpa reload — agar filter tidak sticky di URL
    router.replace('/penduduk', { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Simpan filter ke sessionStorage HANYA jika filter bukan dari monografi
  // (setelah user mengubah filter secara manual, isFromMonografiRef di-reset)
  useEffect(() => {
    if (isFromMonografiRef.current) {
      // Filter baru saja di-set dari monografi — jangan simpan ke sessionStorage
      // agar saat kembali ke halaman ini (tanpa URL params) filter sudah reset
      return
    }
    try {
      sessionStorage.setItem('penduduk_filter', JSON.stringify(filter))
    } catch { /* ignore */ }
  }, [filter])

  useEffect(() => {
    try {
      sessionStorage.setItem('penduduk_page_size', String(pageSize))
    } catch { /* ignore */ }
  }, [pageSize])

  useEffect(() => {
    try {
      sessionStorage.setItem('penduduk_page', String(page))
    } catch { /* ignore */ }
  }, [page])

  // Dynamic options dari data aktif
  const baseData = useMemo(() => {
    if (!filter.status) return allData
    return allData.filter(r => r.status === filter.status)
  }, [allData, filter.status])

  const agamaOptions = useMemo(() => ([...new Set((baseData.map(r => r.agama) as string[]).filter(Boolean))]).sort(), [baseData])
  const pekerjaanOptions = useMemo(() => ([...new Set((baseData.map(r => r.pekerjaan) as string[]).filter(Boolean))]).sort(), [baseData])
  // Pendidikan: urutan jenjang (bukan abjad); nilai lama di luar daftar baku ditaruh di akhir
  const pendidikanOptions = useMemo(() => {
    const ada = new Set((baseData.map(r => r.pendidikan) as string[]).filter(Boolean))
    return [...PENDIDIKAN, ...[...ada].filter(p => !(PENDIDIKAN as readonly string[]).includes(p)).sort()]
  }, [baseData])

  // Total untuk counter — hanya data yang statusnya sesuai filter aktif (bukan semua allData)
  const totalForCounter = useMemo(() => {
    if (!filter.status) return allData.length
    return allData.filter(r => r.status === filter.status).length
  }, [allData, filter.status])

  const filtered = useMemo(() => {
    let rows = [...allData]
    if (filter.status) rows = rows.filter((r) => r.status === filter.status)
    if (filter.rt) rows = rows.filter((r) => rt3(r.rt) === rt3(filter.rt))
    if (filter.dusun) rows = rows.filter((r) => dusunDariRt(r.rt) === filter.dusun)
    if (filter.jenisKelamin) rows = rows.filter((r) => r.jenis_kelamin === filter.jenisKelamin)
    if (filter.umur) rows = rows.filter((r) => cocokRentangUmur(r.tanggal_lahir, filter.umur))
    if (filter.klasifikasi) rows = rows.filter((r) => cocokKlasifikasi(r.tanggal_lahir, filter.klasifikasi))
    if (filter.agama) rows = rows.filter((r) => r.agama === filter.agama)
    if (filter.statusPerkawinan) rows = rows.filter((r) => r.status_perkawinan === filter.statusPerkawinan)
    if (filter.pekerjaan) rows = rows.filter((r) => r.pekerjaan === filter.pekerjaan)
    if (filter.pendidikan) rows = rows.filter((r) => r.pendidikan === filter.pendidikan)
    if (filter.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.nama_lengkap?.toLowerCase().includes(q) ||
          r.nik?.includes(q) ||
          r.no_kk?.includes(q) ||
          r.rt?.includes(q)
      )
    }
    if (filter.sortBy === 'rt_kk') {
      rows.sort((a, b) => {
        // 1) RT numerik
        const rtCmp = (Number(a.rt) || 0) - (Number(b.rt) || 0)
        if (rtCmp !== 0) return rtCmp
        // 2) No. KK
        const kkCmp = (a.no_kk ?? '').localeCompare(b.no_kk ?? '')
        if (kkCmp !== 0) return kkCmp
        // 3) Urutan hubungan keluarga: KK → Istri → Anak → dst
        const hubA = HUB_ORDER[a.hubungan_keluarga ?? ''] ?? 99
        const hubB = HUB_ORDER[b.hubungan_keluarga ?? ''] ?? 99
        if (hubA !== hubB) return hubA - hubB
        // 4) Nama alfabet sebagai tiebreaker
        return (a.nama_lengkap ?? '').localeCompare(b.nama_lengkap ?? '', 'id')
      })
    } else {
      rows.sort((a, b) => {
        const k = filter.sortBy as keyof typeof a
        const av = a[k] ?? ''
        const bv = b[k] ?? ''
        const cmp = String(av).localeCompare(String(bv), 'id', { numeric: true })
        return filter.sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [allData, filter, dusunDariRt])

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const { isAdmin } = useAuthStore()

  // Ringkasan header (dari data yang sudah dimuat): penduduk aktif dan jumlah KK-nya
  const ringkasan = useMemo(() => {
    const aktif = allData.filter(r => r.status === 'aktif')
    return { jiwa: aktif.length, kk: jumlahKeluarga(aktif) }
  }, [allData])

  function handleFilter(f: FilterState) {
    // User mengubah filter secara manual — ini bukan lagi filter dari monografi
    // Reset ref agar perubahan filter selanjutnya disimpan ke sessionStorage
    isFromMonografiRef.current = false
    setFilter(f)
    setPage(1)
  }

  const dari = filtered.length ? (page - 1) * pageSize + 1 : 0
  const sampai = Math.min(filtered.length, page * pageSize)
  const nomor = nomorHalaman(page, totalPages)

  const pilihUkuran = (
    <div className="a-in sm perp">
      <select
        aria-label="Jumlah per halaman"
        value={pageSize}
        onChange={e => { setPageSize(Number(e.target.value) as 25 | 50 | 100); setPage(1) }}
      >
        {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} per halaman</option>)}
      </select>
      <ChevronDown className="i chev" />
    </div>
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHeader
        title="Penduduk"
        description={isLoading ? 'Memuat data penduduk…' : `${ringkasan.jiwa.toLocaleString('id-ID')} penduduk aktif di ${ringkasan.kk.toLocaleString('id-ID')} kepala keluarga`}
        action={isAdmin() ? (
          <>
            <Button asChild variant="outline">
              <Link href="/pengaturan?bagian=impor" title="Impor Excel ada di Pengaturan"><Upload className="i" />Impor Excel</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pengaturan?bagian=ekspor" title="Ekspor Excel ada di Pengaturan"><Download className="i" />Ekspor Excel</Link>
            </Button>
          </>
        ) : undefined}
      />

      <PendudukFilter
        filter={filter}
        onChange={handleFilter}
        total={totalForCounter}
        filtered={filtered.length}
        agamaOptions={agamaOptions}
        pekerjaanOptions={pekerjaanOptions}
        pendidikanOptions={pendidikanOptions}
      />

      {/* Desktop: tabel */}
      <div className="a-tw only-d" style={{ marginTop: 12, flex: 1, minHeight: 0 }}>
        <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
          <PendudukTable
            data={filtered} loading={isLoading} page={page} pageSize={pageSize}
            tampilan="tabel" onReset={adaFilterAktif(filter) ? () => handleFilter({ ...DEFAULT_FILTER }) : undefined}
          />
        </div>
        {!isLoading && filtered.length > 0 && (
          <div className="a-pg">
            <span>
              Menampilkan <b style={{ color: 'var(--ink)' }}>{dari.toLocaleString('id-ID')}–{sampai.toLocaleString('id-ID')}</b> dari{' '}
              <b style={{ color: 'var(--ink)' }}>{filtered.length.toLocaleString('id-ID')}</b> penduduk
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {pilihUkuran}
              <span>Hal {page} / {totalPages}</span>
              <div className="pgs">
                <button type="button" className="ar" aria-label="Halaman sebelumnya"
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="i" style={{ fontSize: 15 }} />
                </button>
                {nomor.map((n, i) => n === '…'
                  ? <button key={`e${i}`} type="button" style={{ color: 'var(--ink-3)', pointerEvents: 'none' }} tabIndex={-1}>…</button>
                  : <button key={n} type="button" className={n === page ? 'on' : ''} aria-current={n === page ? 'page' : undefined}
                      onClick={() => setPage(n)}>{n}</button>)}
                <button type="button" className="ar" aria-label="Halaman berikutnya"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="i" style={{ fontSize: 15 }} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HP: kartu */}
      <div className="only-m" style={{ marginTop: 12, flex: 1, minHeight: 0, overflow: 'auto' }}>
        <PendudukTable
          data={filtered} loading={isLoading} page={page} pageSize={pageSize}
          tampilan="kartu" onReset={adaFilterAktif(filter) ? () => handleFilter({ ...DEFAULT_FILTER }) : undefined}
        />
        {!isLoading && filtered.length > 0 && (
          <>
            <div className="mpg">
              <Button type="button" variant="outline" size="sm" disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft className="i" />Sebelumnya
              </Button>
              <span>Hal {page} / {totalPages}</span>
              <Button type="button" variant="outline" size="sm" disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Berikutnya<ChevronRight className="i" />
              </Button>
            </div>
            <div className="mpg" style={{ justifyContent: 'center' }}>{pilihUkuran}</div>
          </>
        )}
      </div>
    </div>
  )
}

// Nomor halaman ringkas: 1 … (sekarang-1) sekarang (sekarang+1) … terakhir
function nomorHalaman(page: number, total: number): (number | '…')[] {
  const hasil: (number | '…')[] = []
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - page) <= 1) hasil.push(p)
    else if (hasil[hasil.length - 1] !== '…') hasil.push('…')
  }
  return hasil
}

export default function PendudukPage() {
  return (
    <AppShell title="Penduduk" fullHeight>
      <Suspense fallback={<div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Memuat...</div>}>
        <PendudukContent />
      </Suspense>
    </AppShell>
  )
}
