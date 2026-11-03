import { describe, it, expect } from 'vitest'
import { hitungVersi, terapkanKeTeks } from '../scripts/naikkan-versi.mjs'

const dasar = {
  pkg: JSON.stringify({ name: 'x', version: '3.1.0' }),
  lock: JSON.stringify({ version: '3.1.0', packages: { '': { version: '3.1.0' } } }),
  utils: "export const APP_VERSION = 'v3.1.0'\n",
  readme: '## Versi Saat Ini: v3.1.0\n\n## Riwayat Versi\n\n### v3.1.0 — Oktober 2026\n\n- a\n',
}

describe('hitungVersi', () => {
  it('patch / minor / major', () => {
    expect(hitungVersi('3.1.0', 'patch')).toBe('3.1.1')
    expect(hitungVersi('3.1.9', 'minor')).toBe('3.2.0')
    expect(hitungVersi('3.4.2', 'major')).toBe('4.0.0')
  })
  it('versi eksplisit (dengan atau tanpa v)', () => {
    expect(hitungVersi('3.1.0', '3.4.2')).toBe('3.4.2')
    expect(hitungVersi('3.1.0', 'v3.4.2')).toBe('3.4.2')
  })
  it('masukan salah ditolak', () => {
    expect(() => hitungVersi('3.1.0', 'besar')).toThrow(/Pakai/)
    expect(() => hitungVersi('x', 'patch')).toThrow(/tidak valid/)
  })
})

describe('terapkanKeTeks', () => {
  it('mengubah keempat tempat dan menambah kerangka riwayat di atas entri lama', () => {
    const h = terapkanKeTeks(dasar, '3.1.1', 'November 2026')
    expect(JSON.parse(h.pkg).version).toBe('3.1.1')
    expect(JSON.parse(h.lock).version).toBe('3.1.1')
    expect(JSON.parse(h.lock).packages[''].version).toBe('3.1.1')
    expect(h.utils).toContain("'v3.1.1'")
    expect(h.readme).toContain('## Versi Saat Ini: v3.1.1')
    expect(h.readme.indexOf('### v3.1.1 — November 2026')).toBeLessThan(h.readme.indexOf('### v3.1.0'))
  })
  it('tidak menggandakan entri bila sudah ada', () => {
    const h = terapkanKeTeks({ ...dasar, readme: dasar.readme + '\n### v3.1.1 — Sudah ada\n' }, '3.1.1')
    expect(h.readme.match(/^### v3\.1\.1/gm)).toHaveLength(1)
  })
  it('APP_VERSION tidak ditemukan → galat jelas', () => {
    expect(() => terapkanKeTeks({ ...dasar, utils: 'tidak ada' }, '3.1.1')).toThrow(/APP_VERSION/)
  })
})
