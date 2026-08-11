/**
 * Firestore Security Rules test suite.
 *
 * BUTUH Firebase Emulator berjalan lokal — jalankan di terminal terpisah:
 *   firebase emulators:start --only firestore
 * lalu di terminal lain:
 *   npm run test:rules
 *
 * TIDAK bisa dijalankan dari sandbox pengembangan ini — binary emulator
 * Firestore (file .jar Java) di-download saat runtime dari
 * storage.googleapis.com, domain yang diblokir di jaringan sandbox.
 * File ini sepenuhnya siap pakai begitu dijalankan di lingkungan dengan
 * akses internet normal.
 */
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

// 5 UID allowlist — SAMA PERSIS dengan firestore.rules dan hooks/useAuth.ts.
// Ini fixture harus tetap sinkron manual dengan rules asli (rules-unit-testing
// tidak punya cara membaca balik daftar UID dari dalam rules untuk dibandingkan).
const ALLOWED_UIDS = [
  'dzQ7vIVsTEbtfgML286w9MmUGqz2',
  'ZDX7bXzB95hBMv99Q5OxkXwJfmf2',
  'lZqlErwDKiSWXphAfAcI9uTgQKt2',
  'sdcHroGRTeZQxeQOtmJzMzmskP62',
  'YA7qQvgouLZYyAap44Z0I1kWTx43',
]
const UID_ADMIN = ALLOWED_UIDS[0]
const UID_OPERATOR = ALLOWED_UIDS[1]
const UID_VIEWER = ALLOWED_UIDS[2]
const UID_NOT_ALLOWLISTED = 'uid-diluar-allowlist-meski-auth-valid'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'dapendig-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  // Seed collection users — role() rule bergantung pada ini
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users', UID_ADMIN), { role: 'admin' })
    await setDoc(doc(db, 'users', UID_OPERATOR), { role: 'operator' })
    await setDoc(doc(db, 'users', UID_VIEWER), { role: 'viewer' })
  })
})

describe('Allowlist UID — gerbang pertama sebelum role apapun dicek', () => {
  it('UID yang TIDAK ada di allowlist DITOLAK meski auth valid dan role admin di collection users', async () => {
    // Skenario ini penting: seseorang bisa saja punya akun Firebase Auth
    // valid dan bahkan dokumen users/{uid} dengan role admin, tapi kalau
    // UID-nya tidak ada di 5-UID hardcoded, tetap harus ditolak total.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', UID_NOT_ALLOWLISTED), { role: 'admin' })
    })
    const ctx = testEnv.authenticatedContext(UID_NOT_ALLOWLISTED)
    await assertFails(getDoc(doc(ctx.firestore(), 'penduduk', 'any-nik')))
  })

  it('request tanpa autentikasi sama sekali DITOLAK', async () => {
    const ctx = testEnv.unauthenticatedContext()
    await assertFails(getDoc(doc(ctx.firestore(), 'penduduk', 'any-nik')))
  })
})

describe('Collection penduduk — read:viewer+, create/update:operator+, delete:admin', () => {
  it('viewer BISA read, TIDAK BISA create', async () => {
    const ctx = testEnv.authenticatedContext(UID_VIEWER)
    const db = ctx.firestore()
    await testEnv.withSecurityRulesDisabled(async (c) =>
      setDoc(doc(c.firestore(), 'penduduk', 'nik-1'), { nama_lengkap: 'Test' })
    )
    await assertSucceeds(getDoc(doc(db, 'penduduk', 'nik-1')))
    await assertFails(setDoc(doc(db, 'penduduk', 'nik-2'), { nama_lengkap: 'X' }))
  })

  it('operator BISA create dan update, TIDAK BISA delete', async () => {
    const ctx = testEnv.authenticatedContext(UID_OPERATOR)
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, 'penduduk', 'nik-3'), { nama_lengkap: 'Operator Test' }))
    await assertSucceeds(updateDoc(doc(db, 'penduduk', 'nik-3'), { nama_lengkap: 'Updated' }))
    await assertFails(deleteDoc(doc(db, 'penduduk', 'nik-3')))
  })

  it('admin BISA melakukan semuanya termasuk delete', async () => {
    const ctx = testEnv.authenticatedContext(UID_ADMIN)
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, 'penduduk', 'nik-4'), { nama_lengkap: 'Admin Test' }))
    await assertSucceeds(deleteDoc(doc(db, 'penduduk', 'nik-4')))
  })
})

describe('Collection meninggal — create:operator+, update/delete:admin (relevan untuk alur rollback)', () => {
  it('operator BISA create record kematian, TIDAK BISA delete langsung (rollback butuh admin)', async () => {
    const ctx = testEnv.authenticatedContext(UID_OPERATOR)
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, 'meninggal', 'record-1'), { nama: 'Test' }))
    await assertFails(deleteDoc(doc(db, 'meninggal', 'record-1')))
  })

  it('admin BISA delete record kematian (dipakai saat rollbackMeninggal menghapus record setelah dibatalkan)', async () => {
    const ctx = testEnv.authenticatedContext(UID_ADMIN)
    const db = ctx.firestore()
    await setDoc(doc(db, 'meninggal', 'record-2'), { nama: 'Test' })
    await assertSucceeds(deleteDoc(doc(db, 'meninggal', 'record-2')))
  })
})

describe('Collection users — read:allowlist manapun, write:admin saja', () => {
  it('operator BISA read users (perlu untuk cek role sendiri), TIDAK BISA write', async () => {
    const ctx = testEnv.authenticatedContext(UID_OPERATOR)
    const db = ctx.firestore()
    await assertSucceeds(getDoc(doc(db, 'users', UID_OPERATOR)))
    await assertFails(setDoc(doc(db, 'users', 'uid-baru'), { role: 'viewer' }))
  })
})

describe('REGRESSION: counter_surat sudah dihapus (fitur Surat Resmi dihapus di v2.7.0)', () => {
  it('collection counter_surat sekarang TIDAK PUNYA rule sama sekali — default deny berlaku, bahkan untuk admin', async () => {
    // Firestore rules bersifat default-deny: collection tanpa match block
    // sama sekali otomatis ditolak untuk siapapun, termasuk admin. Ini
    // regression test memastikan penghapusan rule counter_surat di v2.7.0
    // (dulu 'allow read,write: if request.auth != null' — celah keamanan
    // karena tidak pakai isAllowed()) benar-benar hilang, bukan cuma
    // dipindah ke collection lain.
    const ctx = testEnv.authenticatedContext(UID_ADMIN)
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, 'counter_surat', 'test-key'), { urut: 999 }))
    await assertFails(getDoc(doc(db, 'counter_surat', 'test-key')))
  })
})
