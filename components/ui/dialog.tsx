'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'

/* ============================================================================
   Modal gaya prototype: .a-layer > .a-mbg > .a-modal (jadi sheet dari bawah di HP lewat CSS).
   Fokus, Esc, aria-modal, dan penguncian gulir dikelola Radix Dialog.
   ============================================================================ */

export type ModalTone = 'info' | 'ok' | 'warn' | 'bad' | 'mute'

interface ModalFrameProps {
  onClose: () => void
  className?: string
  width?: number
  /** Jangan fokus ke isian pertama saat dibuka (dialog konfirmasi). */
  noAutoFocus?: boolean
  children: React.ReactNode
}

function ModalFrame({ onClose, className, width, noAutoFocus, children }: ModalFrameProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  return (
    <DialogPrimitive.Root open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPrimitive.Portal>
        <div className="a-layer">
          <div className="a-mbg" style={{ pointerEvents: 'auto' }}>
            <DialogPrimitive.Content
              ref={ref}
              aria-describedby={undefined}
              className={cn('a-modal', className)}
              style={width ? { maxWidth: width } : undefined}
              onOpenAutoFocus={(e) => {
                // Prototype: isian pertama hanya difokuskan di layar lebar (di HP papan ketik tidak langsung muncul).
                e.preventDefault()
                const el = ref.current
                if (!el) return
                const lebar = typeof window !== 'undefined' && window.matchMedia('(min-width:701px)').matches
                const target = !noAutoFocus && lebar
                  ? el.querySelector<HTMLElement>('input:not([type=hidden]),select')
                  : null
                ;(target ?? el).focus()
              }}
            >
              {children}
            </DialogPrimitive.Content>
          </div>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

interface ModalProps {
  onClose: () => void
  title: React.ReactNode
  sub?: React.ReactNode
  /** Subjudul bergaya monospasi (No. KK / NIK). */
  mono?: boolean
  icon?: React.ReactNode
  tone?: ModalTone
  width?: number
  className?: string
  foot?: React.ReactNode
  children: React.ReactNode
}

/** Modal prototype (`modal()`): kepala berikon + judul + subjudul + tombol tutup, isi `.mb`, kaki `.mf`. */
export function Modal({ onClose, title, sub, mono, icon, tone = 'info', width = 480, className, foot, children }: ModalProps) {
  return (
    <ModalFrame onClose={onClose} width={width} className={className}>
      <div className="mh">
        {icon && (
          <div className="mi" style={{ background: `var(--${tone}-bg)`, color: `var(--${tone})` }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <DialogPrimitive.Title asChild><h3>{title}</h3></DialogPrimitive.Title>
          {sub && <p className={mono ? 'mono' : undefined}>{sub}</p>}
        </div>
        <DialogPrimitive.Close asChild>
          <button type="button" className="cl" aria-label="Tutup"><X className="i" /></button>
        </DialogPrimitive.Close>
      </div>
      <div className="mb">{children}</div>
      {foot && <div className="mf">{foot}</div>}
    </ModalFrame>
  )
}

interface ConfirmModalProps {
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
  icon: React.ReactNode
  tone?: ModalTone
  title: string
  okLabel: string
  cancelLabel?: string
  /** 'danger' (merah, bawaan) untuk hapus; 'default' (navy) untuk aksi yang bisa dibatalkan (mis. "Ya, batalkan"). */
  okVariant?: 'danger' | 'default'
  children: React.ReactNode
}

/** Dialog konfirmasi prototype (`confirmBox()`): ikon besar, judul, teks, dua tombol selebar sama. */
export function ConfirmModal({
  onCancel, onConfirm, loading, icon, tone = 'bad', title, okLabel, cancelLabel = 'Batal', okVariant = 'danger', children,
}: ConfirmModalProps) {
  return (
    <ModalFrame onClose={onCancel} width={420} className="conf" noAutoFocus>
      <div className="mb">
        <div className="cf">
          <div
            className="a-avatar"
            style={{ width: 52, height: 52, borderRadius: 16, background: `var(--${tone}-bg)`, color: `var(--${tone})` }}
          >
            {icon}
          </div>
          <DialogPrimitive.Title asChild><h3>{title}</h3></DialogPrimitive.Title>
          <p>{children}</p>
        </div>
      </div>
      <div className="mf">
        <Button type="button" variant="outline" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={okVariant} style={{ flex: 1 }} onClick={onConfirm} disabled={loading}>
          {loading && <Loader2 className="i" style={{ animation: 'spin 1s linear infinite' }} />}
          {okLabel}
        </Button>
      </div>
    </ModalFrame>
  )
}

/* ============================================================================
   AlertDialog (Radix) — belum dipakai halaman mana pun; hanya dialihkan ke token tema.
   ============================================================================ */

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-navy-950/55 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]',
        'rounded-2xl border border-line bg-card p-6 shadow-pop',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
        'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-2 mb-6', className)} {...props} />
)
AlertDialogHeader.displayName = 'AlertDialogHeader'

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex justify-end gap-3 mt-6', className)} {...props} />
)
AlertDialogFooter.displayName = 'AlertDialogFooter'

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-bold text-ink', className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-ink-2 leading-relaxed', className)}
    {...props}
  />
))
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants({ variant: 'default' }), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: 'outline' }), className)}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
}
