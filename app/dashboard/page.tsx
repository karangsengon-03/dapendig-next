'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Users, Home, Baby, HeartPulse, ArrowRightFromLine, ArrowLeftFromLine } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { GenderChart } from '@/components/dashboard/GenderChart'
import { RTChart } from '@/components/dashboard/RTChart'
import { UmurChart } from '@/components/dashboard/UmurChart'
import { WilayahBadge } from '@/components/dashboard/WilayahBadge'
import {
  usePendudukStats,
  usePendudukBaruBulanIni,
  useUmurStats,
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
  const { data: umurData = [], isLoading: loadingUmur } = useUmurStats()
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
        <div className="flex flex-col gap-1">
          <WilayahBadge />
          <p className="text-xs text-slate-600">
            Data per {now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <GenderChart lakiLaki={stats?.lakiLaki ?? 0} perempuan={stats?.perempuan ?? 0} loading={loadingStats} />
          <RTChart data={stats?.rtData ?? []} loading={loadingStats} />
        </div>
        <UmurChart data={umurData} loading={loadingUmur} />
      </div>
    </AppShell>
  )
}
