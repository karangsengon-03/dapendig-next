'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface PopPos { left: number; top: number }

/** Posisi popover tepat di bawah elemen pemicu, dijaga agar tetap di dalam layar (di HP jadi sheet dari bawah lewat CSS prototype). */
export function hitungPos(el: HTMLElement, lebar: number): PopPos {
  const r = el.getBoundingClientRect()
  return {
    left: Math.max(8, Math.min(r.left, window.innerWidth - lebar - 8)),
    top: r.bottom + 6,
  }
}

interface PopLayerProps {
  pos: PopPos
  lebar?: number
  title?: string
  onClose: () => void
  children: React.ReactNode
}

// Popover gaya prototype (`.a-pops > .pop`) lewat Portal; Esc atau klik di luar menutup.
export function PopLayer({ pos, lebar = 230, title, onClose, children }: PopLayerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="a-pops" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pop" role="menu" style={{ left: pos.left, top: pos.top, width: lebar }}>
        {title && <div className="pt">{title}</div>}
        {children}
      </div>
    </div>,
    document.body
  )
}
