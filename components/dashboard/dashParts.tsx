'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

/** true setelah frame pertama: dipakai agar bilah/donut beranimasi dari 0 (transisi CSS prototype). */
export function useMasuk(): boolean {
  const [masuk, setMasuk] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setMasuk(true))
    return () => cancelAnimationFrame(r)
  }, [])
  return masuk
}

/** Angka naik dari nilai sebelumnya ke nilai baru (padanan data-count prototype). Hormati prefers-reduced-motion. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [tampil, setTampil] = useState(0)
  const dari = useRef(0)
  useEffect(() => {
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const awal = dari.current
    const mulai = performance.now()
    let raf = 0
    const langkah = (t: number) => {
      const p = kurangiGerak ? 1 : Math.min(1, (t - mulai) / duration)
      const e = 1 - Math.pow(1 - p, 3)
      const v = Math.round(awal + (value - awal) * e)
      dari.current = v
      setTampil(v)
      if (p < 1) raf = requestAnimationFrame(langkah)
    }
    raf = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{tampil.toLocaleString('id-ID')}</>
}

/** Sparkline (padanan spark() prototype). `values` minimal 2 titik. */
export function Spark({ values, w = 84, h = 34 }: { values: number[]; w?: number; h?: number }) {
  const id = 'sp' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const mx = Math.max(...values, 1)
  const n = Math.max(values.length - 1, 1)
  const d = values
    .map((v, i) => `${(2 + (i * (w - 4)) / n).toFixed(1)},${(h - 4 - (v / mx) * (h - 10)).toFixed(1)}`)
    .join(' ')
  return (
    <svg className="sp" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity=".28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`2,${h - 2} ${d} ${w - 2},${h - 2}`} fill={`url(#${id})`} />
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export interface BarRow {
  key: string
  label: string
  nilai: number
  /** Rincian L/P (informasi dari zip); dilewati bila tidak ada. */
  laki?: number
  perempuan?: number
  /** Keterangan kecil di bawah nama (mis. "belum terdaftar di Pengaturan"). */
  ket?: string
  /** Bila diisi, baris menjadi tautan (klik untuk melihat warga). */
  href?: string
}

/** Baris bilah gaya prototype (`.a-row`): nama, bilah, nilai + persen; rincian L/P di bawah bilah. */
export function BarRows({ rows, total, warna }: { rows: BarRow[]; total: number; warna: string }) {
  const masuk = useMasuk()
  const mx = Math.max(...rows.map(r => r.nilai), 1)
  return (
    <>
      {rows.map(r => {
        const isi = (
          <>
            <span className="n">{r.label}{r.ket && <small className="ket">{r.ket}</small>}</span>
            <div className="tr">
              <div className="a-bar">
                <i
                  className="bf"
                  style={{ width: masuk ? `${((r.nilai / mx) * 100).toFixed(1)}%` : '0%', background: warna, borderRadius: 99 }}
                />
              </div>
              {r.laki !== undefined && r.perempuan !== undefined && (
                <span className="lp">
                  <b className="l">L {r.laki.toLocaleString('id-ID')}</b> · <b className="p">P {r.perempuan.toLocaleString('id-ID')}</b>
                </span>
              )}
            </div>
            <span className="vv">
              {r.nilai.toLocaleString('id-ID')}
              <small>{total ? Math.round((r.nilai / total) * 100) : 0}%</small>
            </span>
            {r.href && <ArrowUpRight className="i go" />}
          </>
        )
        return r.href ? (
          <Link key={r.key} href={r.href} className="a-row clk">{isi}</Link>
        ) : (
          <div key={r.key} className="a-row">{isi}</div>
        )
      })}
    </>
  )
}

/** Baris total seragam untuk semua kartu data (Beranda dan Monografi): label, rincian L/P di bawahnya, dan jumlah di kanan. */
export function BarisTotal({ label, laki, perempuan, jumlah, satuan, className }: {
  label: string; laki: number; perempuan: number; jumlah: number; satuan?: string; className?: string
}) {
  return (
    <div className={className ? `rtot ${className}` : 'rtot'}>
      <span className="tl">
        {label}
        <small className="lp"><b className="l">L {laki.toLocaleString('id-ID')}</b> · <b className="p">P {perempuan.toLocaleString('id-ID')}</b></small>
      </span>
      <span>{jumlah.toLocaleString('id-ID')}{satuan ? ` ${satuan}` : ''}</span>
    </div>
  )
}
