'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useMasuk } from './dashParts'

interface GenderChartProps {
  lakiLaki: number
  perempuan: number
  loading?: boolean
}

const UKURAN = 150
const TEBAL = 22

// Donut jenis kelamin gaya prototype (`.a-donut` + legenda `.a-lgd`); angka dari props.
export function GenderChart({ lakiLaki, perempuan, loading }: GenderChartProps) {
  const masuk = useMasuk()
  const total = lakiLaki + perempuan

  const r = (UKURAN - TEBAL) / 2
  const c = UKURAN / 2
  const keliling = 2 * Math.PI * r
  const irisan = [
    { nilai: lakiLaki, warna: 'var(--lk)' },
    { nilai: perempuan, warna: 'var(--pr)' },
  ]
  let offset = 0
  const busur = irisan.map(s => {
    const panjang = total ? (keliling * s.nilai) / total : 0
    const tampak = Math.max(0, panjang - 3)
    const item = { ...s, tampak, offset: -offset }
    offset += panjang
    return item
  })

  return (
    <div className="a-card p">
      <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Jenis kelamin</h3>

      {loading ? (
        <div className="dw">
          <Skeleton style={{ width: UKURAN, height: UKURAN, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11, minWidth: 130 }}>
            <Skeleton style={{ height: 14 }} />
            <Skeleton style={{ height: 14 }} />
          </div>
        </div>
      ) : total === 0 ? (
        <div className="feed"><p className="kosong">Belum ada data</p></div>
      ) : (
        <div className="dw">
          <div className="a-donut">
            <svg width={UKURAN} height={UKURAN} viewBox={`0 0 ${UKURAN} ${UKURAN}`} role="img" aria-label={`Laki-laki ${lakiLaki}, perempuan ${perempuan}`}>
              <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line)" strokeWidth={TEBAL} />
              {busur.map((b, i) => (
                <circle
                  key={i}
                  className="dn"
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke={b.warna}
                  strokeWidth={TEBAL}
                  strokeDashoffset={b.offset}
                  strokeDasharray={masuk ? `${b.tampak} ${keliling - b.tampak}` : `0 ${keliling}`}
                  transform={`rotate(-90 ${c} ${c})`}
                />
              ))}
            </svg>
            <div className="c">
              <b className="tab">{total.toLocaleString('id-ID')}</b>
              <span>jiwa</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11, minWidth: 130 }}>
            <div className="a-lgd"><i style={{ background: 'var(--navy-600)' }} />Laki-laki<b>{lakiLaki.toLocaleString('id-ID')}</b></div>
            <div className="a-lgd"><i style={{ background: 'var(--pr)' }} />Perempuan<b>{perempuan.toLocaleString('id-ID')}</b></div>
            {perempuan > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--line)' }} />
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.45 }}>
                  Rasio <b style={{ color: 'var(--ink)' }}>{Math.round((lakiLaki / perempuan) * 100)} laki-laki</b> per 100 perempuan
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
