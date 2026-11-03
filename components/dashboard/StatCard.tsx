'use client'

import { Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { CountUp, Spark } from './dashParts'

export interface StatDelta {
  /** Selisih terhadap bulan pembanding (boleh negatif/nol). */
  selisih: number
  /** true bila arah selisih itu baik (kelahiran naik, kematian turun, dst.). */
  baik: boolean
  /** Nama bulan pembanding, mis. "Agustus". */
  banding: string
}

interface StatCardProps {
  label: string
  value: number | undefined
  loading?: boolean
  icon: LucideIcon
  tone?: 'navy' | 'ok' | 'bad' | 'warn' | 'gold' | 'mute' | 'lk' | 'pr'
  suffix?: string
  subLabel?: string
  /** Tanpa delta (data pembanding tidak ada) kartu tampil tanpa selisih. */
  delta?: StatDelta
  /** Titik sparkline (bulanan, lama → baru). */
  spark?: number[]
}

// Kartu statistik gaya prototype (`.a-stat`). Angka datang dari pemanggil.
export function StatCard({ label, value, loading, icon: Icon, tone = 'navy', suffix, subLabel, delta, spark }: StatCardProps) {
  const arah = !delta || delta.selisih === 0 ? 'fl' : delta.baik ? 'up' : 'dn'
  const warnaSpark = arah === 'up' ? 'var(--ok)' : arah === 'dn' ? 'var(--bad)' : 'var(--ink-4)'
  const IkonDelta = !delta || delta.selisih === 0 ? Minus : delta.selisih > 0 ? TrendingUp : TrendingDown

  return (
    <div className="a-stat lift">
      <div className="l">
        <span className={`ico ico-${tone}`}><Icon className="i" /></span>
        {label}
      </div>
      <div className="v">
        {loading ? (
          <Skeleton style={{ height: 30, width: 70 }} />
        ) : value === undefined ? (
          '—'
        ) : (
          <>
            <CountUp value={value} />
            {suffix && <small>{suffix}</small>}
          </>
        )}
      </div>
      {!loading && delta ? (
        <span className={`d ${arah}`}>
          <IkonDelta className="i" style={{ fontSize: 14 }} />
          {delta.selisih > 0 ? '+' : ''}{delta.selisih} <span>vs {delta.banding}</span>
        </span>
      ) : (
        subLabel && !loading && <span className="d fl">{subLabel}</span>
      )}
      {!loading && spark && spark.length > 1 && (
        <span style={{ color: warnaSpark }}><Spark values={spark} /></span>
      )}
    </div>
  )
}
