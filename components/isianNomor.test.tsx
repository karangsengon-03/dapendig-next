import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'

const { b } = vi.hoisted(() => ({ b: () => ({ mutate: () => {}, mutateAsync: () => {}, isPending: false }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }), useSearchParams: () => new URLSearchParams('') }))
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: () => {} }) }))
vi.mock('@/hooks/useMutasi', () => ({ useAddMutasiKeluar: b, useAddMutasiMasuk: b, useAddMutasiMasukBatch: b }))
vi.mock('@/hooks/useVital', () => ({ useAddLahir: b, useAddMeninggal: b }))
vi.mock('@/hooks/usePenduduk', () => ({
  useCatatPindahKeluarKeluarga: b, usePendudukList: () => ({ data: [], isLoading: false }), checkNikExists: () => Promise.resolve(false),
}))

import { MutasiKeluarForm, MutasiMasukForm } from '@/components/mutasi/MutasiForm'
import { LahirForm, MeninggalForm } from '@/components/vital/VitalForm'
import { PendudukForm } from '@/components/penduduk/PendudukForm'

/**
 * Semua isian NIK dan No. KK berperilaku sama: hanya angka, maksimal 16 digit, dan nomor yang ditempel dengan
 * spasi/titik/strip tetap utuh (dulu: huruf diterima, dan tempelan "3511 0300 0000 1826" terpotong di 13 digit).
 */
const DAFTAR: [string, () => ReactElement, string[]][] = [
  ['Pindah keluar', () => <MutasiKeluarForm onSuccess={vi.fn()} onCancel={vi.fn()} />, ['mk-nik', 'mk-kk']],
  ['Pindah masuk', () => <MutasiMasukForm onSuccess={vi.fn()} onCancel={vi.fn()} />, ['pm-nik', 'pm-kk']],
  ['Kelahiran', () => <LahirForm onSuccess={vi.fn()} onCancel={vi.fn()} />, ['lh-nik', 'lh-kk']],
  ['Kematian', () => <MeninggalForm onSuccess={vi.fn()} onCancel={vi.fn()} allPenduduk={[]} />, ['mn-nik', 'mn-kk']],
  ['Edit penduduk', () => <PendudukForm mode="edit" editId="x" initial={{}} onSubmit={vi.fn()} />, ['f-nik', 'f-kk']],
]

describe.each(DAFTAR)('isian nomor — %s', (_nama, buat, ids) => {
  it.each(ids)('%s: huruf dan simbol dibuang saat diketik', (id) => {
    render(buat())
    const el = document.getElementById(id) as HTMLInputElement
    fireEvent.change(el, { target: { value: '35ab11x40 1' } })
    expect(el.value).toBe('3511401')
  })

  it.each(ids)('%s: nomor yang ditempel dengan spasi/titik/strip menjadi 16 digit utuh', (id) => {
    render(buat())
    const el = document.getElementById(id) as HTMLInputElement
    fireEvent.change(el, { target: { value: '3511 0300 0000 1826' } })
    expect(el.value).toBe('3511030000001826')
    fireEvent.change(el, { target: { value: '3511-0300-0000.1826' } })
    expect(el.value).toBe('3511030000001826')
  })

  it.each(ids)('%s: lebih dari 16 digit dipotong di 16', (id) => {
    render(buat())
    const el = document.getElementById(id) as HTMLInputElement
    fireEvent.change(el, { target: { value: '351103000000182612345' } })
    expect(el.value).toBe('3511030000001826')
  })

  it.each(ids)('%s: isian tidak memakai maxLength (peramban memotong tempelan sebelum dibersihkan)', (id) => {
    render(buat())
    expect((document.getElementById(id) as HTMLInputElement).hasAttribute('maxlength')).toBe(false)
  })
})
