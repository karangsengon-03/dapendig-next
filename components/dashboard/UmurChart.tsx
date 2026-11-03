'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { KATEGORI_UMUR, kunciRentang, labelRentang } from '@/lib/umur'
import { BarRows } from './dashParts'

export interface UmurData {
  label: string
  jumlah: number
  color: string
}

interface UmurChartProps {
  data: UmurData[]
  loading?: boolean
}

// Kelompok umur Beranda: bilah gaya prototype (`.a-row`); angka dari useUmurStats.
// Label hanya rentang ("0–4 th"): nama kategori (Balita, dst.) dibuang supaya tidak bentrok dengan "Klasifikasi umur" di Monografi
// yang memakai nama sama dengan rentang berbeda. Klik baris → Daftar Penduduk aktif pada rentang itu (`lib/umur.ts`, aturan sama dengan angkanya).
export function UmurChart({ data, loading }: UmurChartProps) {
  const total = data.reduce((s, d) => s + d.jumlah, 0)

  return (
    <div className="a-card p">
      <div className="ch2">
        <h3>Kelompok umur</h3>
        <span className="a-badge mute nd">Klik untuk melihat warga</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '6px 10px' }}>
          {[...Array(5)].map((_, i) => <Skeleton key={i} style={{ height: 14 }} />)}
        </div>
      ) : total === 0 ? (
        <div className="feed"><p className="kosong">Belum ada data</p></div>
      ) : (
        <BarRows
          rows={data.map(d => {
            const k = KATEGORI_UMUR.find(x => x.label === d.label)
            return {
              key: d.label,
              label: k ? labelRentang(k.min, k.max) : d.label,
              nilai: d.jumlah,
              href: k ? `/penduduk?umur=${kunciRentang(k.min, k.max)}&status=aktif` : undefined,
            }
          })}
          total={total}
          warna="linear-gradient(90deg,var(--navy-600),#6FA8F0)"
        />
      )}
    </div>
  )
}
