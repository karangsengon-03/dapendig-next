'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'

async function writeLog(aksi: string, keterangan: string, email: string) {
  await addDoc(collection(db, 'log'), {
    aksi,
    keterangan,
    nik_target: '',
    oleh: email,
    ts: serverTimestamp(),
  })
}

// ── Update nama ─────────────────────────────────────────────────────────────

export function useUpdateNama() {
  const qc = useQueryClient()
  const { user, setUser } = useAuthStore()

  return useMutation({
    mutationFn: async (nama: string) => {
      if (!user) throw new Error('Tidak ada sesi')
      await updateDoc(doc(db, 'users', user.uid), { nama })
      await writeLog('edit', `Perbarui nama profil: ${nama}`, user.email)
    },
    onSuccess: (_, nama) => {
      if (user) setUser({ ...user, nama })
      qc.invalidateQueries({ queryKey: ['pengaturan', 'users'], exact: false })
    },
  })
}

// ── Ganti password (memerlukan re-auth) ─────────────────────────────────────

export function useGantiPassword() {
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      passwordLama,
      passwordBaru,
    }: {
      passwordLama: string
      passwordBaru: string
    }) => {
      const firebaseUser = auth.currentUser
      if (!firebaseUser || !user) throw new Error('Tidak ada sesi')

      // Re-autentikasi dulu sebelum ganti password
      const credential = EmailAuthProvider.credential(user.email, passwordLama)
      await reauthenticateWithCredential(firebaseUser, credential)

      // Baru ganti password
      await updatePassword(firebaseUser, passwordBaru)
      await writeLog('edit', 'Ganti password akun', user.email)
    },
  })
}
