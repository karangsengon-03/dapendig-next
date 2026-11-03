import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { ArrowLeftFromLine, ArrowRightFromLine, Baby, HeartCrack, Mars, Venus } from 'lucide-react'
import { JK_VISUAL, PERISTIWA, jkKunci } from './visual'

const ROOT = process.cwd()
function semuaSumber(dir: string, hasil: string[] = []): string[] {
  for (const nama of readdirSync(dir)) {
    if (['node_modules', '.next', '.git', 'coverage'].includes(nama)) continue
    const p = join(dir, nama)
    if (statSync(p).isDirectory()) semuaSumber(p, hasil)
    else if (/\.(ts|tsx)$/.test(nama) && !/\.test\.(ts|tsx)$/.test(nama) && !nama.endsWith('.d.ts')) hasil.push(p)
  }
  return hasil
}
const SUMBER = semuaSumber(ROOT).map((p) => ({ rel: relative(ROOT, p).split(sep).join('/'), isi: readFileSync(p, 'utf8') }))
/** Berkas yang memakai ikon `nama` (bukan sekadar menyebutnya di komentar): impor dari lucide-react atau dipakai sebagai <Nama / Icon: Nama. */
const pemakai = (nama: string) =>
  SUMBER.filter((f) => new RegExp(`import\\s*\\{[^}]*\\b${nama}\\b[^}]*\\}\\s*from\\s*'lucide-react'`).test(f.isi)).map((f) => f.rel)

describe('registri visual', () => {
  it('peristiwa: ikon dan nada tetap', () => {
    expect(PERISTIWA.kelahiran).toEqual({ Icon: Baby, nada: 'ok' })
    expect(PERISTIWA.kematian).toEqual({ Icon: HeartCrack, nada: 'mute' })
    expect(PERISTIWA.pindah_keluar).toEqual({ Icon: ArrowRightFromLine, nada: 'bad' })
    expect(PERISTIWA.pindah_masuk).toEqual({ Icon: ArrowLeftFromLine, nada: 'ok' })
  })
  it('jenis kelamin: Mars/lk dan Venus/pr', () => {
    expect(JK_VISUAL.L).toMatchObject({ Icon: Mars, kelas: 'lk' })
    expect(JK_VISUAL.P).toMatchObject({ Icon: Venus, kelas: 'pr' })
  })
  it('jkKunci menerima L/P dan nama lengkap, apa pun huruf besar/kecilnya', () => {
    expect(jkKunci('L')).toBe('L'); expect(jkKunci('Laki-laki')).toBe('L'); expect(jkKunci('laki-laki')).toBe('L')
    expect(jkKunci('P')).toBe('P'); expect(jkKunci('Perempuan')).toBe('P')
    expect(jkKunci('')).toBeNull(); expect(jkKunci(undefined)).toBeNull(); expect(jkKunci('x')).toBeNull()
  })
})

describe('konsistensi ikon di seluruh aplikasi (pemindaian sumber)', () => {
  it('LogOut/LogIn hanya untuk masuk/keluar akun, tidak untuk "pindah"', () => {
    const boleh = ['components/layout/Topbar.tsx', 'components/layout/Sidebar.tsx', 'components/auth/LoginForm.tsx']
    for (const ikon of ['LogOut', 'LogIn']) {
      const salah = pemakai(ikon).filter((f) => !boleh.includes(f))
      expect(salah, `${ikon} dipakai di luar autentikasi: ${salah.join(', ')}`).toEqual([])
    }
  })
  it('HeartPulse hanya untuk menu gabungan "Kelahiran & Kematian" (nav); kematian selalu HeartCrack', () => {
    expect(pemakai('HeartPulse')).toEqual(['components/layout/nav.ts'])
  })
  it('UserMinus tidak dipakai (pindah keluar = ArrowRightFromLine)', () => {
    expect(pemakai('UserMinus')).toEqual([])
  })
  it('ikon Baby/HeartCrack/ArrowRightFromLine/ArrowLeftFromLine hanya diimpor dari registri visual', () => {
    for (const ikon of ['Baby', 'HeartCrack', 'ArrowRightFromLine', 'ArrowLeftFromLine']) {
      const luar = pemakai(ikon).filter((f) => f !== 'lib/visual.ts')
      expect(luar, `${ikon} diimpor langsung di: ${luar.join(', ')}`).toEqual([])
    }
  })
  it('Mars/Venus hanya lewat registri; filter jenis kelamin memakai VenusAndMars', () => {
    expect(pemakai('Mars')).toEqual(['lib/visual.ts'])
    expect(pemakai('Venus')).toEqual(['lib/visual.ts'])
    expect(pemakai('VenusAndMars')).toContain('components/penduduk/PendudukFilter.tsx')
  })
  it('warna jenis kelamin memakai token --lk/--pr, bukan navy/gold sembarangan', () => {
    const mon = SUMBER.find((f) => f.rel === 'app/monografi/page.tsx')!.isi
    expect(mon).toMatch(/label="Laki-laki"[^\n]*tone="lk"/)
    expect(mon).toMatch(/label="Perempuan"[^\n]*tone="pr"/)
    const gc = SUMBER.find((f) => f.rel === 'components/dashboard/GenderChart.tsx')!.isi
    expect(gc).toContain("warna: 'var(--lk)'")
    expect(gc).toContain("warna: 'var(--pr)'")
  })
})
