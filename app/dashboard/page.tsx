'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Users, Home, Baby, HeartPulse, ArrowRightFromLine, ArrowLeftFromLine } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { GenderChart } from '@/components/dashboard/GenderChart'
import { WilayahBadge } from '@/components/dashboard/WilayahBadge'
import {
  usePendudukStats,
  usePendudukBaruBulanIni,
} from '@/hooks/useDashboard'
import { useLahir } from '@/hooks/useVital'
import { useMeninggal } from '@/hooks/useVital'
import { useMutasiKeluar, useMutasiMasuk } from '@/hooks/useMutasi'

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function filterBulan(tgl: unknown, bulan: number, tahun: number): boolean {
  if (!tgl) return false
  let d: Date
  if (typeof tgl === 'object' && tgl !== null && 'seconds' in tgl) {
    d = new Date((tgl as { seconds: number }).seconds * 1000)
  } else if (typeof tgl === 'string') {
    d = new Date(tgl)
  } else return false
  if (isNaN(d.getTime())) return false
  return d.getMonth() === bulan && d.getFullYear() === tahun
}

export default function DashboardPage() {
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth())
  const [tahun, setTahun] = useState(now.getFullYear())

  const { data: stats, isLoading: loadingStats } = usePendudukStats()
  const { data: pendudukBaru = 0 } = usePendudukBaruBulanIni()
  const { data: allLahir = [] } = useLahir()
  const { data: allMeninggal = [] } = useMeninggal()
  const { data: allKeluar = [] } = useMutasiKeluar()
  const { data: allMasuk = [] } = useMutasiMasuk()

  const kelahiran = allLahir.filter(r => filterBulan(r.tanggal_lahir, bulan, tahun)).length
  const kematian = allMeninggal.filter(r => filterBulan(r.tanggal, bulan, tahun)).length
  const mutasiKeluar = allKeluar.filter(r => filterBulan(r.tanggal, bulan, tahun)).length
  const mutasiMasuk = allMasuk.filter(r => filterBulan(r.tanggal, bulan, tahun)).length

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

  return (
    <AppShell title="Beranda">
      <div className="flex flex-col gap-4">
        {/* Sub-header */}
        <div className="flex items-center gap-2.5">
          <Home size={18} className="text-sky-400 shrink-0" />
          <h1 className="text-base font-semibold text-slate-100">Beranda</h1>
        </div>
        <WilayahBadge />

        {/* Total stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Penduduk" value={stats?.totalPenduduk} loading={loadingStats}
            icon={Users} color="sky" suffix="jiwa"
            subLabel={pendudukBaru > 0 ? `+${pendudukBaru} baru bulan ini` : undefined} />
          <StatCard label="Kepala Keluarga" value={stats?.totalKK} loading={loadingStats}
            icon={Home} color="violet" suffix="KK" />
        </div>

        {/* Navigasi bulan */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <button onClick={prevBulan}
              className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <p className="text-sm font-semibold text-slate-300">
              {NAMA_BULAN[bulan]} {tahun}
            </p>
            <button onClick={nextBulan} disabled={isCurrentMonth}
              className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30">
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Kelahiran" value={kelahiran} icon={Baby} color="emerald" subLabel="Bayi lahir" />
            <StatCard label="Kematian" value={kematian} icon={HeartPulse} color="slate" subLabel="Warga meninggal" />
            <StatCard label="Pindah Keluar" value={mutasiKeluar} icon={ArrowRightFromLine} color="rose" subLabel="Mutasi keluar" />
            <StatCard label="Pindah Masuk" value={mutasiMasuk} icon={ArrowLeftFromLine} color="amber" subLabel="Mutasi masuk" />
          </div>
        </div>

        {/* Charts */}
        <GenderChart lakiLaki={stats?.lakiLaki ?? 0} perempuan={stats?.perempuan ?? 0} loading={loadingStats} />

        {/* Tabel Penduduk per RT */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Penduduk per RT</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['RT','L','P','Total'].map(h => (
                    <th key={h} className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingStats ? (
                  <tr><td colSpan={4} className="text-center py-4 text-slate-600 text-xs">Memuat...</td></tr>
                ) : (stats?.rtData ?? []).map(row => (
                  <tr key={row.rt} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2 px-2 text-center text-slate-300 font-medium text-xs">
                      {row.rt === 'Lain-lain' ? row.rt : `RT ${row.rt}`}
                    </td>
                    <td className="py-2 px-2 text-center text-sky-400 tabular-nums text-xs">{row.laki}</td>
                    <td className="py-2 px-2 text-center text-pink-400 tabular-nums text-xs">{row.perempuan}</td>
                    <td className="py-2 px-2 text-center text-slate-200 font-semibold tabular-nums text-xs">{row.jumlah}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.08]">
                  <td className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</td>
                  <td className="py-2 px-2 text-center text-sky-400 font-bold tabular-nums text-xs">{stats?.lakiLaki ?? 0}</td>
                  <td className="py-2 px-2 text-center text-pink-400 font-bold tabular-nums text-xs">{stats?.perempuan ?? 0}</td>
                  <td className="py-2 px-2 text-center text-slate-100 font-bold tabular-nums text-xs">{stats?.totalPenduduk ?? 0}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Tabel Penduduk per Dusun */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1424] p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Penduduk per Dusun</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Dusun','L','P','Total'].map(h => (
                    <th key={h} className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingStats ? (
                  <tr><td colSpan={4} className="text-center py-4 text-slate-600 text-xs">Memuat...</td></tr>
                ) : (stats?.dusunData ?? []).map(row => (
                  <tr key={row.dusun} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2 px-2 text-slate-300 font-medium text-xs text-center">{row.dusun}</td>
                    <td className="py-2 px-2 text-center text-sky-400 tabular-nums text-xs">{row.laki}</td>
                    <td className="py-2 px-2 text-center text-pink-400 tabular-nums text-xs">{row.perempuan}</td>
                    <td className="py-2 px-2 text-center text-slate-200 font-semibold tabular-nums text-xs">{row.jumlah}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.08]">
                  <td className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</td>
                  <td className="py-2 px-2 text-center text-sky-400 font-bold tabular-nums text-xs">{stats?.lakiLaki ?? 0}</td>
                  <td className="py-2 px-2 text-center text-pink-400 font-bold tabular-nums text-xs">{stats?.perempuan ?? 0}</td>
                  <td className="py-2 px-2 text-center text-slate-100 font-bold tabular-nums text-xs">{stats?.totalPenduduk ?? 0}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
