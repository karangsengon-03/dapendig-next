'use client'

import * as React from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  keluar?: boolean
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

// Lama tampil sama dengan versi lama (4 detik); batang progres prototype diselaraskan ke angka ini.
const DURASI_MS = 4000
const DURASI_KELUAR_MS = 200

const GAYA: Record<ToastType, { Icon: LucideIcon; warna: string; latar: string }> = {
  success: { Icon: CheckCircle, warna: 'var(--ok)', latar: 'var(--ok-bg)' },
  error: { Icon: XCircle, warna: 'var(--bad)', latar: 'var(--bad-bg)' },
  warning: { Icon: AlertTriangle, warna: 'var(--warn)', latar: 'var(--warn-bg)' },
  info: { Icon: Info, warna: 'var(--info)', latar: 'var(--info-bg)' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, keluar: true } : t)))
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), DURASI_KELUAR_MS)
  }, [])

  const toast = React.useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => remove(id), DURASI_MS)
    },
    [remove]
  )

  const value = React.useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="a-toasts" aria-live="polite">
        {toasts.map((t) => {
          const { Icon, warna, latar } = GAYA[t.type]
          return (
            <div
              key={t.id}
              className={cn('a-toast', t.keluar && 'out')}
              role={t.type === 'error' ? 'alert' : 'status'}
            >
              <span className="ti" style={{ background: latar, color: warna }}>
                <Icon className="i" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontWeight: 600 }}>{t.message}</b>
              </div>
              <button type="button" className="cl" onClick={() => remove(t.id)} aria-label="Tutup notifikasi">
                <X className="i" />
              </button>
              <span className="pg" style={{ color: warna, animationDuration: `${DURASI_MS}ms` }} />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return ctx
}
