import { initializeApp, getApps } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// PENTING: Next.js selalu mencoba prerender route bawaan /_not-found sebagai
// static page saat build — terlepas dari apakah semua page lain full client
// component. Prerendering itu mengeksekusi module ini di server tanpa browser.
// Jika env var Firebase kosong/salah saat itu (mis. lupa di-set di environment
// "Preview" Vercel), initializeApp/getAuth/getFirestore bisa throw dan
// menggagalkan SELURUH build, bukan cuma satu halaman.
//
// Guard ini membuat build tetap jalan dalam kondisi tsb, tanpa mengubah
// perilaku sama sekali saat benar-benar dijalankan di browser pengguna.
const isBrowser = typeof window !== 'undefined'
const hasValidConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

let app: ReturnType<typeof initializeApp>
let authInstance: ReturnType<typeof getAuth>
let dbInstance: ReturnType<typeof getFirestore>

if (isBrowser || hasValidConfig) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  authInstance = getAuth(app)
  dbInstance = getFirestore(app)

  // Selalu simpan sesi di localStorage — user tidak perlu login ulang meski tab/browser ditutup
  if (isBrowser) {
    setPersistence(authInstance, browserLocalPersistence).catch(() => {})
  }
} else {
  // Hanya tercapai saat prerender server-side TANPA env var valid (bukan browser
  // sungguhan). App placeholder ini tidak pernah dipakai untuk operasi nyata —
  // semua page yang benar-benar butuh Firebase adalah 'use client' dan berjalan
  // di browser, di mana isBrowser selalu true dan cabang di atas yang dipakai.
  app = initializeApp({ apiKey: 'build-placeholder', projectId: 'build-placeholder' }, 'build-placeholder')
  authInstance = getAuth(app)
  dbInstance = getFirestore(app)
}

export const auth = authInstance
export const db = dbInstance
export default app
