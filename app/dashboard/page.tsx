'use client'

import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { GenderChart } from '@/components/dashboard/GenderChart'
import { RTChart } from '@/components/dashboard/RTChart'
import { UmurChart } from '@/components/dashboard/UmurChart'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { WilayahBadge } from '@/components/dashboard/WilayahBadge'
import {
  usePendudukStats,
  useKelahiranBulanIni,
  useKematianBulanIni,
  useMutasiBulanIni,
  useRecentLog,
  usePendudukBaruBulanIni,
  useUmurStats,
} from '@/hooks/useDashboard'
import {
  Users,
  Home,
  Baby,
  HeartPulse,
  ArrowRightFromLine,
  ArrowLeftFromLine,
} from 'lucide-react'

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = usePendudukStats()
  const { data: kelahiran, isLoading: loadingLahir } = useKelahiranBulanIni()
  const { data: kematian, isLoading: loadingMeninggal } = useKematianBulanIni()
  const { data: mutasi, isLoading: loadingMutasi } = useMutasiBulanIni()
  const { data: logs = [], isLoading: loadingLog } = useRecentLog()
  const { data: pendudukBaru = 0 } = usePendudukBaruBulanIni()
  const { data: umurData = [], isLoading: loadingUmur } = useUmurStats()

  const bulanIni = new Date().toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <AppShell title="Beranda">
      <div className="flex flex-col gap-4 animate-fade-in-up">
        <div className="flex flex-col gap-2">
          <WilayahBadge />
          <p className="text-xs text-slate-600">
            Data per {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Penduduk"
            value={stats?.totalPenduduk}
            loading={loadingStats}
            icon={Users}
            color="sky"
            suffix="jiwa"
            subLabel={pendudukBaru > 0 ? `+${pendudukBaru} baru bulan ini` : undefined}
          />
          <StatCard
            label="Kepala Keluarga"
            value={stats?.totalKK}
            loading={loadingStats}
            icon={Home}
            color="violet"
            suffix="KK"
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-slate-600 font-medium uppercase tracking-wider px-0.5">
            {bulanIni}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Kelahiran"
              value={kelahiran}
              loading={loadingLahir}
              icon={Baby}
              color="emerald"
              subLabel="Bayi lahir bulan ini"
            />
            <StatCard
              label="Kematian"
              value={kematian}
              loading={loadingMeninggal}
              icon={HeartPulse}
              color="slate"
              subLabel="Warga meninggal"
            />
            <StatCard
              label="Pindah Keluar"
              value={mutasi?.keluar}
              loading={loadingMutasi}
              icon={ArrowRightFromLine}
              color="rose"
              subLabel="Mutasi keluar"
            />
            <StatCard
              label="Pindah Masuk"
              value={mutasi?.masuk}
              loading={loadingMutasi}
              icon={ArrowLeftFromLine}
              color="amber"
              subLabel="Mutasi masuk"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <GenderChart
            lakiLaki={stats?.lakiLaki ?? 0}
            perempuan={stats?.perempuan ?? 0}
            loading={loadingStats}
          />
          <RTChart
            data={stats?.rtData ?? []}
            loading={loadingStats}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <UmurChart data={umurData} loading={loadingUmur} />
        </div>

        <RecentActivity logs={logs} loading={loadingLog} />
      </div>
    </AppShell>
  )
}
