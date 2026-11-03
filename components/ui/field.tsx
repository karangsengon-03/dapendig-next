import * as React from 'react'
import { CircleAlert, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: React.ReactNode
  htmlFor?: string
  /** Tanda wajib (*). */
  req?: boolean
  /** Tanda "(opsional)" kecil di samping label (teks zip). */
  opt?: boolean
  error?: string
  hint?: React.ReactNode
  /** Kelas kolom grid (.a-fg6): s1, s2, s3, s4, s6. */
  className?: string
  children: React.ReactNode
}

/** Blok isian prototype (`fld()`): label, kotak `.a-in`, dan baris petunjuk/galat. */
export function Field({ label, htmlFor, req, opt, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('a-field', className)}>
      <label htmlFor={htmlFor}>
        {label}
        {req && <span className="req">*</span>}
        {opt && <span className="opt">(opsional)</span>}
      </label>
      {children}
      {error ? (
        <p className="a-err" role="alert"><CircleAlert className="i" style={{ fontSize: 14 }} />{error}</p>
      ) : (
        <p className="a-hint">{hint}</p>
      )}
    </div>
  )
}

interface BoxProps {
  error?: boolean
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** Kotak isian `.a-in` (tinggi 44 px, cincin fokus). Anak = <input>/<select> polos. */
export function InBox({ error, icon, className, children }: BoxProps) {
  return (
    <div className={cn('a-in', error && 'err', className)}>
      {icon}
      {children}
    </div>
  )
}

/** Pemilih bawaan peramban dengan panah gaya prototype. */
export function SelectIn({
  id, value, onChange, options, error, kosong, 'aria-label': ariaLabel,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  error?: boolean
  /** Teks pilihan kosong (nilai ""), mis. "Pilih agama". Tanpa ini pilihan pertama tampil sebagai terpilih. */
  kosong?: string
  'aria-label'?: string
}) {
  const nilai = value ?? ''
  // Nilai tersimpan di luar daftar (data lama) tetap tampil apa adanya, tidak diam-diam diganti pilihan pertama
  const asing = nilai !== '' && !options.includes(nilai)
  return (
    <InBox error={error}>
      <select id={id} aria-label={ariaLabel} value={nilai} onChange={(e) => onChange(e.target.value)}>
        {kosong !== undefined && <option value="">{kosong}</option>}
        {asing && <option value={nilai}>{nilai}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="i chev" />
    </InBox>
  )
}
