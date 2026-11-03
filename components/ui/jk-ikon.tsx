import { JK_VISUAL, jkKunci } from '@/lib/visual'
import { cn } from '@/lib/utils'

/** Ikon jenis kelamin (Mars biru untuk laki-laki, Venus merah muda untuk perempuan). Nilai tak dikenal → tidak menampilkan apa pun. */
export function JkIkon({ jk, size = 14, className }: { jk: string | null | undefined; size?: number; className?: string }) {
  const k = jkKunci(jk)
  if (!k) return null
  const { Icon, kelas } = JK_VISUAL[k]
  return <Icon aria-hidden="true" size={size} strokeWidth={2.4} className={cn('jk-ic', kelas, className)} />
}
