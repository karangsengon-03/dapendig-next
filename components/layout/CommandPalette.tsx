'use client'

import { useEffect, useMemo, useState } from 'react'
import { rt3 } from '@/lib/rt-rw'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Search, type LucideIcon } from 'lucide-react'
import { usePendudukList } from '@/hooks/usePenduduk'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Penduduk } from '@/types'
import { NAV_FOOT, NAV_GROUPS } from './nav'

type Baris =
  | { jenis: 'penduduk'; key: string; href: string; data: Penduduk }
  | { jenis: 'menu'; key: string; href: string; label: string; icon: LucideIcon }

const SEMUA_MENU = [...NAV_GROUPS.flatMap((g) => g.items), ...NAV_FOOT]

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  // Daftar penduduk dimuat lewat hook yang sudah ada (cache 60 detik). Komponen ini baru dipasang
  // saat palet dibuka, jadi tidak ada pembacaan data selama palet tertutup.
  const { data, isLoading, isError } = usePendudukList()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)

  const { orang, menu } = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const daftar = data ?? []
    const orang = (
      ql
        ? daftar.filter(
            (p) =>
              p.nama_lengkap?.toLowerCase().includes(ql) ||
              p.nik?.includes(ql) ||
              p.no_kk?.includes(ql)
          )
        : daftar.filter((p) => p.hubungan_keluarga === 'Kepala Keluarga' && p.status === 'aktif')
    ).slice(0, ql ? 6 : 4)
    const menu = SEMUA_MENU.filter((m) => !ql || m.label.toLowerCase().includes(ql))
    return { orang, menu }
  }, [data, q])

  const baris: Baris[] = [
    ...orang.map((p): Baris => ({ jenis: 'penduduk', key: `p-${p.id}`, href: `/penduduk/${p.id}`, data: p })),
    ...menu.map((m): Baris => ({ jenis: 'menu', key: `m-${m.href}`, href: m.href, label: m.label, icon: m.icon })),
  ]
  const aktif = Math.min(sel, Math.max(baris.length - 1, 0))

  // Esc menutup palet di mana pun fokusnya
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Jaga baris terpilih tetap terlihat saat navigasi keyboard
  useEffect(() => {
    document.getElementById(`cmd-r-${aktif}`)?.scrollIntoView({ block: 'nearest' })
  }, [aktif])

  function buka(b: Baris | undefined) {
    if (!b) return
    onClose()
    router.push(b.href)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel(Math.min(aktif + 1, baris.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel(Math.max(aktif - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      buka(baris[aktif])
    }
  }

  const adaQuery = q.trim() !== ''
  const kosong = baris.length === 0 && !isLoading

  return createPortal(
    <div className="a-layer">
      <div
        className="a-mbg a-cmdw"
        style={{ alignItems: 'flex-start', paddingTop: '9vh' }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="a-cmd" role="dialog" aria-modal="true" aria-label="Pencarian cepat">
          <div className="top">
            <Search className="i" style={{ fontSize: 18, color: 'var(--ink-3)' }} />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setSel(0)
              }}
              onKeyDown={onKeyDown}
              placeholder="Cari nama, NIK, No. KK, atau menu…"
              role="combobox"
              aria-expanded="true"
              aria-controls="cmd-list"
              aria-activedescendant={baris.length ? `cmd-r-${aktif}` : undefined}
              aria-label="Cari penduduk, KK, atau menu"
              autoComplete="off"
            />
            <kbd className="a-kbd">Esc</kbd>
          </div>

          <div id="cmd-list" role="listbox" style={{ maxHeight: 'min(60vh, 420px)', overflowY: 'auto' }}>
            {(orang.length > 0 || isLoading || isError) && (
              <>
                <div className="grp">{adaQuery ? 'Penduduk' : 'Kepala keluarga'}</div>
                {isLoading && (
                  <div className="r" style={{ color: 'var(--ink-3)' }}>Memuat data penduduk…</div>
                )}
                {isError && (
                  <div className="r" style={{ color: 'var(--bad)' }}>Gagal memuat data penduduk</div>
                )}
              </>
            )}
            {baris.map((b, i) =>
              b.jenis === 'penduduk' ? (
                <div
                  key={b.key}
                  id={`cmd-r-${i}`}
                  role="option"
                  aria-selected={i === aktif}
                  className={cn('r', i === aktif && 'on')}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => buka(b)}
                >
                  <Avatar nama={b.data.nama_lengkap} jk={b.data.jenis_kelamin} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.data.nama_lengkap}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {b.data.nik} · RT {rt3(b.data.rt)}/RW {rt3(b.data.rw)}
                    </div>
                  </div>
                  <small>{b.data.status === 'aktif' ? b.data.hubungan_keluarga : b.data.status}</small>
                </div>
              ) : (
                <div key={b.key}>
                  {i === orang.length && <div className="grp">Menu</div>}
                  <div
                    id={`cmd-r-${i}`}
                    role="option"
                    aria-selected={i === aktif}
                    className={cn('r', i === aktif && 'on')}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => buka(b)}
                  >
                    <span className="ico" style={{ background: 'var(--navy-50)', color: 'var(--navy-700)' }}>
                      <b.icon className="i" />
                    </span>
                    <span>{b.label}</span>
                  </div>
                </div>
              )
            )}
            {kosong && (
              <div className="r" style={{ color: 'var(--ink-3)', justifyContent: 'center', padding: '28px 18px' }}>
                Tidak ada hasil untuk “{q.trim()}”
              </div>
            )}
          </div>

          <div className="ft">
            <span>↑ ↓ pilih</span>
            <span>↵ buka</span>
            <span style={{ marginLeft: 'auto' }}>
              {orang.length} penduduk, {menu.length} menu
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Palet pencarian Ctrl+K: cari penduduk (nama, NIK, No. KK) dan menu. */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  if (!open) return null
  return <PaletteBody onClose={() => onOpenChange(false)} />
}
