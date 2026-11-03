'use client'

import { useState } from 'react'
import { Plus, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, InBox } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useDusunConfig, useSaveDusun } from '@/hooks/usePengaturan'
import { DUSUN_BAWAAN, RW_BAWAAN, validasiDusun, validasiRw, type DusunItem } from '@/lib/dusun'
import { GalatTolak } from '@/lib/galat-tolak'
import { rt3 } from '@/lib/rt-rw'

/**
 * Pengaturan → Dusun, RT, dan RW. Satu dusun = nama + RT-nya (RT tidak harus berurutan). Gabungan RT semua dusun menjadi
 * pilihan RT di seluruh form dan filter; dusun sebuah penduduk mengikuti RT-nya. Daftar RW diatur terpisah di bawahnya.
 */
export function DusunRtSection() {
  const { toast } = useToast()
  const { data, isLoading } = useDusunConfig()
  const { mutate: simpan, isPending } = useSaveDusun()
  // null = ikuti data tersimpan (diturunkan, bukan disalin ke state); terisi setelah pengguna mengubah sesuatu
  const [salinan, setSalinan] = useState<DusunItem[] | null>(null)
  const [rtBaru, setRtBaru] = useState<Record<number, string>>({})
  const [salinanRw, setSalinanRw] = useState<string[] | null>(null)
  const [rwBaru, setRwBaru] = useState('')
  const [sudahCoba, setSudahCoba] = useState(false)

  const aktif = salinan ?? data?.dusun ?? DUSUN_BAWAAN
  const galat = validasiDusun(aktif)
  const tampil = sudahCoba ? galat : null
  const rwAktif = salinanRw ?? data?.rw ?? RW_BAWAAN
  const galatRw = validasiRw(rwAktif)

  const ubah = (next: DusunItem[]) => setSalinan(next)
  const ubahNama = (i: number, nama: string) => ubah(aktif.map((d, k) => (k === i ? { ...d, nama } : d)))
  const hapusRt = (i: number, rt: string) => ubah(aktif.map((d, k) => (k === i ? { ...d, rt: d.rt.filter((r) => r !== rt) } : d)))
  const hapusDusun = (i: number) => ubah(aktif.filter((_, k) => k !== i))
  const tambahDusun = () => ubah([...aktif, { nama: '', rt: [] }])

  function tambahRt(i: number) {
    const mentah = (rtBaru[i] ?? '').trim()
    if (!mentah) return
    const nilai = /^\d+$/.test(mentah) ? rt3(mentah) : mentah
    setRtBaru((p) => ({ ...p, [i]: '' }))
    if (aktif[i].rt.includes(nilai)) return
    ubah(aktif.map((d, k) => (k === i ? { ...d, rt: [...d.rt, nilai].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)) } : d)))
  }

  function tambahRw() {
    const mentah = rwBaru.trim()
    if (!mentah) return
    const nilai = /^\d+$/.test(mentah) ? rt3(mentah) : mentah
    setRwBaru('')
    if (rwAktif.includes(nilai)) return
    setSalinanRw([...rwAktif, nilai].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)))
  }

  function handleSimpan() {
    setSudahCoba(true)
    if (galat.ada || galatRw) { toast('Periksa isian dusun, RT, dan RW dulu', 'error'); return }
    simpan({ dusun: aktif, rw: rwAktif }, {
      onSuccess: () => { setSalinan(null); setSalinanRw(null); setSudahCoba(false); toast('Dusun, RT, dan RW berhasil disimpan', 'success') },
      onError: (e) => toast(e instanceof GalatTolak ? e.message : 'Gagal menyimpan dusun, RT, dan RW', 'error'),
    })
  }

  if (isLoading) {
    return (
      <div className="a-fs">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="a-fs">
      <div className="fh">
        <h4>Dusun, RT, dan RW</h4>
        <p>
          Tentukan RT mana saja yang masuk setiap dusun. Gabungan RT semua dusun menjadi pilihan RT di form dan filter;
          dusun penduduk mengikuti RT-nya. RT yang dihapus tetap tersimpan pada data lama dan dikelompokkan sebagai
          “Lain-lain” di statistik sampai RT-nya diubah. Daftar RW di bagian bawah menjadi pilihan RW di semua form.
        </p>
      </div>

      {tampil?.umum && <p className="a-err" role="alert">{tampil.umum}</p>}

      {aktif.map((d, i) => (
        <div className="dsn-card" key={i} data-testid="dusun-kartu">
          <div className="dsn-hd">
            <Field label="Nama dusun" htmlFor={`dsn-nama-${i}`} error={tampil?.baris[i]?.nama}>
              <InBox error={!!tampil?.baris[i]?.nama}>
                <input id={`dsn-nama-${i}`} placeholder="Contoh: Pesanggrahan" value={d.nama} onChange={(e) => ubahNama(i, e.target.value)} autoComplete="off" />
              </InBox>
            </Field>
            <Button type="button" variant="outline" size="icon" className="dsn-del" aria-label={`Hapus dusun ${d.nama || i + 1}`} onClick={() => hapusDusun(i)}>
              <Trash2 size={16} />
            </Button>
          </div>

          <div>
            <div className="dsn-chips" aria-label={`RT dusun ${d.nama || i + 1}`}>
              {d.rt.map((r) => (
                <span className="dsn-chip" key={r}>
                  RT {r}
                  <button type="button" aria-label={`Hapus RT ${r} dari ${d.nama || 'dusun ini'}`} onClick={() => hapusRt(i, r)}><X size={13} /></button>
                </span>
              ))}
              {d.rt.length === 0 && <span className="a-hint">Belum ada RT</span>}
            </div>
            {tampil?.baris[i]?.rt && <p className="a-err" role="alert">{tampil.baris[i].rt}</p>}
          </div>

          <div className="dsn-add">
            <InBox>
              <input
                aria-label={`Tambah RT ke ${d.nama || 'dusun ini'}`}
                inputMode="numeric"
                placeholder="No. RT, mis. 12"
                value={rtBaru[i] ?? ''}
                onChange={(e) => setRtBaru((p) => ({ ...p, [i]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tambahRt(i) } }}
              />
            </InBox>
            <Button type="button" variant="secondary" size="sm" onClick={() => tambahRt(i)}><Plus size={15} />Tambah RT</Button>
          </div>
        </div>
      ))}

      <div className="dsn-card" data-testid="rw-kartu" style={{ marginTop: 14 }}>
        <div>
          <h5 style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>Daftar RW</h5>
          <p className="a-hint">RW yang tersedia di seluruh desa. Menjadi pilihan RW di Pindah Masuk, Kelahiran, dan Edit penduduk.</p>
        </div>
        <div>
          <div className="dsn-chips" aria-label="Daftar RW">
            {rwAktif.map((r) => (
              <span className="dsn-chip" key={r}>
                RW {r}
                <button type="button" aria-label={`Hapus RW ${r}`} onClick={() => setSalinanRw(rwAktif.filter((x) => x !== r))}><X size={13} /></button>
              </span>
            ))}
            {rwAktif.length === 0 && <span className="a-hint">Belum ada RW</span>}
          </div>
          {sudahCoba && galatRw && <p className="a-err" role="alert">{galatRw}</p>}
        </div>
        <div className="dsn-add">
          <InBox>
            <input
              aria-label="Tambah RW"
              inputMode="numeric"
              placeholder="No. RW, mis. 6"
              value={rwBaru}
              onChange={(e) => setRwBaru(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tambahRw() } }}
            />
          </InBox>
          <Button type="button" variant="secondary" size="sm" onClick={tambahRw}><Plus size={15} />Tambah RW</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        <Button type="button" variant="outline" onClick={tambahDusun}><Plus size={16} />Tambah dusun</Button>
        <Button type="button" variant="ghost" onClick={() => { setSalinan(DUSUN_BAWAAN); setSalinanRw(RW_BAWAAN); setSudahCoba(false) }}><RotateCcw size={16} />Pakai bawaan</Button>
        <Button type="button" onClick={handleSimpan} disabled={isPending} style={{ marginLeft: 'auto' }}><Save size={16} />{isPending ? 'Menyimpan…' : 'Simpan'}</Button>
      </div>
    </div>
  )
}
