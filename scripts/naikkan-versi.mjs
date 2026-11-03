#!/usr/bin/env node
/**
 * naikkan-versi.mjs — menaikkan nomor versi di SEMUA tempat sekaligus (lihat README → "Skema Versi").
 *
 *   npm run versi -- patch        # 3.1.0 → 3.1.1  (perbaikan bug, keamanan, dependensi)
 *   npm run versi -- minor        # 3.1.0 → 3.2.0  (fitur baru yang tidak mengubah alur lama)
 *   npm run versi -- major        # 3.1.0 → 4.0.0  (redesain, perubahan alur utama atau skema data)
 *   npm run versi -- 3.4.2        # versi eksplisit
 *   npm run versi -- patch --dry  # hanya tampilkan perubahan, tidak menulis berkas
 *
 * Yang diubah: package.json, package-lock.json (dua baris `version`), APP_VERSION di lib/utils.ts, judul "Versi Saat Ini"
 * di README, dan entri kerangka `### vX.Y.Z — Bulan Tahun` di Riwayat Versi (isi ringkasan perubahannya sendiri).
 * Setelah itu jalankan `npm test`: lib/versi.test.ts memastikan keempat tempat sama.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** `jenis` = 'major' | 'minor' | 'patch' | 'X.Y.Z'. Mengembalikan versi baru (tanpa awalan v). */
export function hitungVersi(sekarang, jenis) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(sekarang)
  if (!m) throw new Error(`Versi sekarang tidak valid: "${sekarang}"`)
  const [ma, mi, pa] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (jenis === 'major') return `${ma + 1}.0.0`
  if (jenis === 'minor') return `${ma}.${mi + 1}.0`
  if (jenis === 'patch') return `${ma}.${mi}.${pa + 1}`
  const e = /^v?(\d+\.\d+\.\d+)$/.exec(jenis ?? '')
  if (!e) throw new Error('Pakai: major | minor | patch | X.Y.Z')
  return e[1]
}

/** Bulan dan tahun berbahasa Indonesia untuk judul entri riwayat, mis. "Oktober 2026". */
export const bulanTahun = (d = new Date()) => d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

export function terapkanKeTeks({ pkg, lock, utils, readme }, baru, tanggal = bulanTahun()) {
  const p = JSON.parse(pkg); p.version = baru
  const l = JSON.parse(lock); l.version = baru; if (l.packages?.['']) l.packages[''].version = baru
  const u = utils.replace(/export const APP_VERSION = 'v[\d.]+'/, `export const APP_VERSION = 'v${baru}'`)
  if (u === utils && !utils.includes(`'v${baru}'`)) throw new Error('APP_VERSION tidak ditemukan di lib/utils.ts')
  let r = readme.replace(/^## Versi Saat Ini: v\d+\.\d+\.\d+/m, `## Versi Saat Ini: v${baru}`)
  if (!new RegExp(`^### v${baru.replace(/\./g, '\\.')}\\b`, 'm').test(r)) {
    const kerangka = `### v${baru} — ${tanggal}\n\n**Ringkasan**\n- (isi ringkasan perubahan di sini: fitur baru / perbaikan bug / dependensi)\n\n`
    r = r.replace(/^### v\d+\.\d+\.\d+/m, (awal) => kerangka + awal)
  }
  return { pkg: JSON.stringify(p, null, 2) + '\n', lock: JSON.stringify(l, null, 2) + '\n', utils: u, readme: r }
}

function utama() {
  const [jenis, ...opsi] = process.argv.slice(2)
  if (!jenis) { console.error('Pakai: npm run versi -- <major|minor|patch|X.Y.Z> [--dry]'); process.exit(2) }
  const akar = resolve(fileURLToPath(import.meta.url), '..', '..')
  const berkas = { pkg: 'package.json', lock: 'package-lock.json', utils: 'lib/utils.ts', readme: 'README.md' }
  const isi = Object.fromEntries(Object.entries(berkas).map(([k, f]) => [k, readFileSync(resolve(akar, f), 'utf8')]))
  const sekarang = JSON.parse(isi.pkg).version
  const baru = hitungVersi(sekarang, jenis)
  if (baru === sekarang) { console.error(`Versi sudah ${sekarang}.`); process.exit(1) }
  const hasil = terapkanKeTeks(isi, baru)
  console.log(`v${sekarang} → v${baru}`)
  if (opsi.includes('--dry')) { console.log('(--dry: tidak ada berkas yang ditulis)'); return }
  for (const [k, f] of Object.entries(berkas)) writeFileSync(resolve(akar, f), hasil[k])
  console.log('Diperbarui:', Object.values(berkas).join(', '), '\nLengkapi ringkasan di README → Riwayat Versi, lalu jalankan: npm test')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) utama()
