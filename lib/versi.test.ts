import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { APP_VERSION } from '@/lib/utils'

/**
 * Versi aplikasi harus sama di semua tempat (lihat README → "Skema Versi"):
 * package.json, package-lock.json, APP_VERSION (lib/utils.ts), dan README.
 */
const baca = (berkas: string) => readFileSync(resolve(process.cwd(), berkas), 'utf8')
const pkg = JSON.parse(baca('package.json')) as { version: string }
const lock = JSON.parse(baca('package-lock.json')) as { version: string; packages: Record<string, { version?: string }> }
const readme = baca('README.md')

describe('versi aplikasi konsisten di semua tempat', () => {
  it('package.json berformat MAJOR.MINOR.PATCH', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('APP_VERSION = "v" + versi package.json', () => {
    expect(APP_VERSION).toBe(`v${pkg.version}`)
  })

  it('package-lock.json (akar) sama dengan package.json', () => {
    expect(lock.version).toBe(pkg.version)
    expect(lock.packages[''].version).toBe(pkg.version)
  })

  it('README: "Versi Saat Ini" sama dengan APP_VERSION', () => {
    const cocok = readme.match(/^## Versi Saat Ini: (v\d+\.\d+\.\d+)/m)
    expect(cocok?.[1]).toBe(APP_VERSION)
  })

  it('README: Riwayat Versi memuat entri untuk versi saat ini', () => {
    expect(readme).toMatch(new RegExp(`^### ${APP_VERSION.replace(/\./g, '\\.')}\\b`, 'm'))
  })
})
