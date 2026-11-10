'use client'

import { useState } from 'react'
import { Lock, Plus, RotateCcw, Save, Trash2, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, InBox } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useDusunConfig, useSaveDusun } from '@/hooks/usePengaturan'
import { useAppStore } from '@/store/appStore'
import { DUSUN_BAWAAN, RW_BAWAAN, daftarkanTerpakai, rtBelumTerdaftar, rwBelumTerdaftar, validasiDusun, validasiRw, type DusunItem } from '@/lib/dusun'
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
  // RT/RW yang ADA di data penduduk aktif (jumlah per RT/RW): dikunci bila terdaftar, dan yang belum terdaftar diberi keterangan
  const rtPakai = useAppStore((s) => s.rtPakai)
  const rwPakai = useAppStore((s) => s.rwPakai)

  const aktif = salinan ?? data?.dusun ?? DUSUN_BAWAAN
  const galat = validasiDusun(aktif)
  const tampil = sudahCoba ? galat : null
  const rwAktif = salinanRw ?? data?.rw ?? RW_BAWAAN
  const galatRw = validasiRw(rwAktif)

  const ubah = (next: DusunItem[]) => setSalinan(next)
  const belumRt = rtBelumTerdaftar(aktif, rtPakai)
  const belumRw = rwBelumTerdaftar(rwAktif, rwPakai)
  // Terkunci = dipakai penduduk aktif DAN hanya terdaftar di satu dusun (menghapusnya membuat RT itu tak terdaftar lagi).
  // RT yang sudah ada di dusun lain boleh dilepas dari dusun ini (pindah dusun).
  const pemilikRt = (rt: string) => aktif.filter((d) => d.rt.some((r) => rt3(r) === rt)).length
  const rtKunci = (rt: string) => (rtPakai[rt3(rt)] ?? 0) > 0 && pemilikRt(rt3(rt)) <= 1
  const rwKunci = (rw: string) => (rwPakai[rt3(rw)] ?? 0) > 0
  const dusunKunci = (d: DusunItem) => d.rt.some(rtKunci)
  const ubahNama = (i: number, nama: string) => ubah(aktif.map((d, k) => (k === i ? { ...d, nama } : d)))
  const hapusRt = (i: number, rt: string) => ubah(aktif.map((d, k) => (k === i ? { ...d, rt: d.rt.filter((r) => r !== rt) } : d)))
  const hapusDusun = (i: number) => {
    if (dusunKunci(aktif[i])) { toast('Dusun ini berisi RT yang dipakai penduduk, jadi tidak bisa dihapus', 'error'); return }
    ubah(aktif.filter((_, k) => k !== i))
  }
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
          dusun penduduk mengikuti RT-nya. Daftar RW di bagian bawah menjadi pilihan RW di semua form.
        </p>
      </div>

      <div className="dsn-note" data-testid="catatan-kunci">
        <b>Data penduduk adalah acuan.</b> RT dan RW yang ada pada data penduduk aktif selalu tampil apa adanya di Beranda dan statistik,
        walau belum didaftarkan di sini. Yang sudah terdaftar dan dipakai penduduk ditandai gembok <Lock size={12} aria-hidden style={{ verticalAlign: '-1px' }} />
        beserta jumlah penduduknya dan tidak bisa dihapus selama masih dipakai. Anda tetap bebas menambah RT, RW, atau dusun lain.
      </div>

      {(belumRt.length > 0 || belumRw.length > 0) && (
        <div className="dsn-note warn" role="status" data-testid="catatan-belum-terdaftar">
          <TriangleAlert size={14} aria-hidden style={{ verticalAlign: '-2px', marginRight: 6 }} />
          <b>Ada RT/RW di data penduduk yang belum terdaftar.</b>
          {belumRt.length > 0 && <> RT: {belumRt.map((r) => `${r} (${rtPakai[r]} jiwa)`).join(', ')}.</>}
          {belumRw.length > 0 && <> RW: {belumRw.map((r) => `${r} (${rwPakai[r]} jiwa)`).join(', ')}.</>}
          {' '}Datanya tetap dihitung dan RT/RW itu sudah bisa dipilih di form dan filter, tetapi dusunnya tampil sebagai “Lain-lain” sampai RT-nya dimasukkan ke dusun.
          <div className="act-c">
            <Button type="button" variant="outline" size="sm" onClick={() => { const g = daftarkanTerpakai(aktif, rwAktif, { rt: rtPakai, rw: rwPakai }); setSalinan(g.dusun); setSalinanRw(g.rw) }}>
              <Plus size={15} />Daftarkan semua ke daftar
            </Button>
          </div>
        </div>
      )}

      {tampil?.umum && <p className="a-err" role="alert">{tampil.umum}</p>}

      {aktif.map((d, i) => (
        <div className="dsn-card" key={i} data-testid="dusun-kartu">
          <div className="dsn-hd">
            <Field label="Nama dusun" htmlFor={`dsn-nama-${i}`} error={tampil?.baris[i]?.nama}>
              <InBox error={!!tampil?.baris[i]?.nama}>
                <input id={`dsn-nama-${i}`} placeholder="Contoh: Pesanggrahan" value={d.nama} onChange={(e) => ubahNama(i, e.target.value)} autoComplete="off" />
              </InBox>
            </Field>
            <Button type="button" variant="outline" size="icon" className="dsn-del" aria-label={`Hapus dusun ${d.nama || i + 1}`} disabled={dusunKunci(d)} title={dusunKunci(d) ? 'Berisi RT yang dipakai penduduk, tidak bisa dihapus' : undefined} onClick={() => hapusDusun(i)}>
              <Trash2 size={16} />
            </Button>
          </div>

          <div>
            <div className="dsn-chips" aria-label={`RT dusun ${d.nama || i + 1}`}>
              {d.rt.map((r) => rtKunci(r) ? (
                <span className="dsn-chip kunci" key={r} style={{ paddingRight: 12 }} title={`Dipakai ${rtPakai[rt3(r)]} penduduk aktif, tidak bisa dihapus`}>
                  <Lock size={12} aria-hidden />RT {r}<span className="cnt-p">· {rtPakai[rt3(r)]}</span>
                </span>
              ) : (
                <span className="dsn-chip" key={r}>
                  RT {r}{(rtPakai[rt3(r)] ?? 0) > 0 && <span className="cnt-p">· {rtPakai[rt3(r)]}</span>}
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
          <p className="a-hint">RW yang tersedia di seluruh desa. Menjadi pilihan RW di Pindah masuk, Kelahiran, dan Edit penduduk.</p>
        </div>
        <div>
          <div className="dsn-chips" aria-label="Daftar RW">
            {rwAktif.map((r) => rwKunci(r) ? (
              <span className="dsn-chip kunci" key={r} style={{ paddingRight: 12 }} title={`Dipakai ${rwPakai[rt3(r)]} penduduk aktif, tidak bisa dihapus`}>
                <Lock size={12} aria-hidden />RW {r}<span className="cnt-p">· {rwPakai[rt3(r)]}</span>
              </span>
            ) : (
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

      <div className="act-c" style={{ marginTop: 14 }}>
        <Button type="button" variant="outline" onClick={tambahDusun}><Plus size={16} />Tambah dusun</Button>
        <Button type="button" variant="outline" onClick={() => { const g = daftarkanTerpakai(DUSUN_BAWAAN, RW_BAWAAN, { rt: rtPakai, rw: rwPakai }); setSalinan(g.dusun); setSalinanRw(g.rw); setSudahCoba(false) }}><RotateCcw size={16} />Pakai bawaan</Button>
      </div>
      <div className="act-c" style={{ marginTop: 10 }}>
        <Button type="button" onClick={handleSimpan} disabled={isPending}><Save size={16} />{isPending ? 'Menyimpan…' : 'Simpan'}</Button>
      </div>
    </div>
  )
}
