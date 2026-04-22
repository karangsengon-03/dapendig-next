import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'DaPenDig Next | Masuk',
}

export default function LoginPage() {
  return <LoginForm />
}
