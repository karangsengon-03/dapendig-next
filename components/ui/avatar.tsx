import { cn } from '@/lib/utils'

/** Inisial untuk avatar: satu kata → 1 huruf; lebih dari satu → huruf pertama kata pertama + kata terakhir. */
export function getInisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/).filter(Boolean)
  if (bagian.length === 0) return '?'
  if (bagian.length === 1) return bagian[0].charAt(0).toUpperCase()
  return (bagian[0].charAt(0) + bagian[bagian.length - 1].charAt(0)).toUpperCase()
}

interface AvatarProps {
  nama: string
  /** Jenis kelamin penduduk ('L'/'P' atau 'Laki-laki'/'Perempuan'). Tanpa nilai = avatar netral (navy). */
  jk?: string
  size?: number
  className?: string
}

export function Avatar({ nama, jk, size = 40, className }: AvatarProps) {
  const j = (jk ?? '').toLowerCase()
  const laki = j === 'l' || j.startsWith('laki')
  const perempuan = j === 'p' || j.startsWith('perempuan')
  return (
    <span
      aria-hidden="true"
      className={cn('a-avatar', laki && 'lk', perempuan && 'pr', className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.35),
        fontSize: Math.max(11, Math.round(size * 0.37)),
      }}
    >
      {getInisial(nama)}
    </span>
  )
}
