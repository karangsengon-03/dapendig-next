'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Split, TriangleAlert, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { Field, InBox } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { usePendudukList } from '@/hooks/usePenduduk'
import { useJalankanPemekaran, useKembalikanPemekaran, usePemekaranRiwayat, type HasilKembali, type RiwayatPemekaran } from '@/hooks/usePemekaran'
import { useAppStore } from '@/store/appStore'
import { daftarRt, urutRt } from '@/lib/dusun'
import { keluargaDiRt, rencanaPemindahan, validasiPemindahan, type PendudukWilayah } from '@/lib/pemekaran'
import { rt3 } from '@/lib/rt-rw'

/**
 * Pemekaran / pemindahan wilayah: pindahkan seluruh atau sebagian keluarga dari satu RT/RW ke RT/RW lain
 * (RT/RW yang dipakai penduduk dikunci di Pengaturan, jadi ini jalur resminya saat ada pemekaran atau penataan ulang).
 * Dusun mengikuti RT, jadi pindah RT otomatis pindah dusun sesuai pengaturan dusun.
 */
const waktu = (detik: number) =>
  detik ? new Date(detik * 1000).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function HasilBalik({ h }: { h: HasilKembali }) {
  return (
    <div className="dsn-note" style={{ marginTop: 10, marginBottom: 0 }} data-testid="hasil-kembali">
      <b>{h.dikembalikan} jiwa dikembalikan ke RT/RW semula.</b>
      {h.dilewati.length > 0 && <> {h.dilewati.length} dilewati karena RT/RW-nya sudah berubah lagi atau datanya tidak ada: {h.dilewati.slice(0, 4).join('; ')}{h.dilewati.length > 4 ? '…' : ''}.</>}
      {h.gagal.length > 0 && <> {h.gagal.length} gagal: {h.gagal.slice(0, 3).join('; ')}.</>}
    </div>
  )
}

/** Pemindahan sebelumnya yang masih bisa dikembalikan (seperti Tempat sampah: cadangan dihapus setelah dikembalikan). */
function RiwayatPemindahan() {
  const { toast } = useToast()
  const { data: daftar = [] } = usePemekaranRiwayat()
  const kembalikan = useKembalikanPemekaran()
  const [konfirm, setKonfirm] = useState<string | null>(null)
  const [hasil, setHasil] = useState<HasilKembali | null>(null)

  if (daftar.length === 0 && !hasil) return null
  const proses = (b: RiwayatPemekaran) =>
    kembalikan.mutate(b, {
      onSuccess: (h) => { setHasil(h); setKonfirm(null); toast(`${h.dikembalikan} jiwa dikembalikan`, h.gagal.length ? 'error' : 'success') },
      onError: () => toast('Gagal mengembalikan pemindahan', 'error'),
    })

  return (
    <div className="pmk-riwayat" data-testid="riwayat-pemekaran">
      <h4>Pemindahan sebelumnya</h4>
      {daftar.map((b) => (
        <div className="pmk-rw" key={b.id}>
          <span><b>{b.jumlah} jiwa · {b.ringkas}</b><small>{waktu(b.dibuatDetik)} · {b.oleh}</small></span>
          {konfirm === b.id ? (
            <span className="pmk-konf">
              <Button type="button" size="sm" variant="destructive" disabled={kembalikan.isPending} onClick={() => proses(b)}>
                {kembalikan.isPending ? 'Mengembalikan…' : 'Ya, kembalikan'}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={kembalikan.isPending} onClick={() => setKonfirm(null)}>Batal</Button>
            </span>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => setKonfirm(b.id)}><Undo2 size={14} />Kembalikan</Button>
          )}
        </div>
      ))}
      {hasil && <HasilBalik h={hasil} />}
    </div>
  )
}

export function PemekaranModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const { data: semua = [] } = usePendudukList()
  const rows = semua as unknown as PendudukWilayah[]
  const rtPakai = useAppStore((s) => s.rtPakai)
  const dusun = useAppStore((s) => s.dusun)
  const jalankan = useJalankanPemekaran()
  const kembalikan = useKembalikanPemekaran()
  const [konfBatal, setKonfBatal] = useState(false)
  const [hasilBalik, setHasilBalik] = useState<HasilKembali | null>(null)

  const rtOpsi = useMemo(() => Object.keys(rtPakai).sort(urutRt), [rtPakai])
  const [rtAsal, setRtAsal] = useState(rtOpsi[0] ?? '')
  const [rwAsal, setRwAsal] = useState('')
  const [rtTujuan, setRtTujuan] = useState('')
  const [rwTujuan, setRwTujuan] = useState('')
  const [mode, setMode] = useState<'semua' | 'pilih'>('semua')
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set())
  const [cari, setCari] = useState('')
  const [konfirmasi, setKonfirmasi] = useState(false)
  const [selesai, setSelesai] = useState<{ ok: number; gagal: string[]; batch: Pick<RiwayatPemekaran, 'id' | 'items' | 'ringkas'> | null } | null>(null)

  const keluargaSemuaRw = useMemo(() => keluargaDiRt(rows, rtAsal), [rows, rtAsal])
  const rwOpsi = useMemo(() => [...new Set(keluargaSemuaRw.map((k) => k.rw).filter(Boolean))].sort(urutRt), [keluargaSemuaRw])
  const keluarga = useMemo(() => keluargaDiRt(rows, rtAsal, rwAsal), [rows, rtAsal, rwAsal])
  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return q ? keluarga.filter((k) => k.kepala.toLowerCase().includes(q) || k.noKk.includes(q)) : keluarga
  }, [keluarga, cari])

  const param = { rtAsal, rwAsal, rtTujuan, rwTujuan }
  const galat = validasiPemindahan(param)
  const rencana = useMemo(
    () => (galat ? [] : rencanaPemindahan(rows, { ...param, keluarga: mode === 'semua' ? null : terpilih })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, rtAsal, rwAsal, rtTujuan, rwTujuan, mode, terpilih, galat],
  )
  const jumlahKel = mode === 'semua' ? keluarga.length : keluarga.filter((k) => terpilih.has(k.kunci)).length
  const rtResmi = useMemo(() => new Set(daftarRt(dusun)), [dusun])
  const tujuanBaru = rtTujuan.trim() !== '' && !rtResmi.has(rt3(rtTujuan))
  const labelTujuan = [rtTujuan.trim() !== '' ? `RT ${rt3(rtTujuan)}` : null, rwTujuan.trim() !== '' ? `RW ${rt3(rwTujuan)}` : null].filter(Boolean).join(' / ')

  function ubahAsal(v: string) { setRtAsal(v); setRwAsal(''); setTerpilih(new Set()); setKonfirmasi(false) }
  function toggle(kunci: string) {
    setTerpilih((s) => { const n = new Set(s); if (n.has(kunci)) n.delete(kunci); else n.add(kunci); return n })
    setKonfirmasi(false)
  }

  function proses() {
    jalankan.mutate(rencana, {
      onSuccess: ({ hasil: h, idBatch }) => {
        setSelesai({
          ok: h.berhasil.length,
          gagal: h.gagal.map((g) => `${g.item.nama}: ${g.pesan}`),
          batch: idBatch ? { id: idBatch, items: h.berhasil, ringkas: `${rtAsal ? `RT ${rt3(rtAsal)}` : ''} → ${labelTujuan}` } : null,
        })
        toast(`${h.berhasil.length} jiwa dipindah ke ${labelTujuan}`, h.gagal.length ? 'error' : 'success')
      },
      onError: () => toast('Gagal memindahkan penduduk', 'error'),
    })
  }

  if (selesai) {
    return (
      <Modal onClose={onClose} title="Pemindahan selesai" icon={<Split className="i" />} tone="ok" width={520}
        foot={
          <>
            {selesai.batch && !hasilBalik && (
              konfBatal ? (
                <>
                  <Button type="button" variant="outline" disabled={kembalikan.isPending} onClick={() => setKonfBatal(false)}>Tidak jadi</Button>
                  <Button type="button" variant="destructive" disabled={kembalikan.isPending}
                    onClick={() => kembalikan.mutate(selesai.batch!, {
                      onSuccess: (h) => { setHasilBalik(h); toast(`${h.dikembalikan} jiwa dikembalikan`, h.gagal.length ? 'error' : 'success') },
                      onError: () => toast('Gagal mengembalikan pemindahan', 'error'),
                    })}>
                    {kembalikan.isPending ? 'Mengembalikan…' : `Ya, batalkan (${selesai.ok} jiwa)`}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={() => setKonfBatal(true)}><Undo2 size={15} />Batalkan pemindahan ini</Button>
              )
            )}
            <Button type="button" onClick={onClose}>Tutup</Button>
          </>
        }>
        <p style={{ margin: 0 }}><b>{selesai.ok} jiwa</b> dipindah ke <b>{labelTujuan}</b>. Tiap perubahan tercatat di Log aktivitas dan Riwayat penduduk.</p>
        {selesai.gagal.length > 0 && (
          <p className="a-err" role="alert" style={{ marginTop: 10 }}>
            {selesai.gagal.length} gagal dipindah: {selesai.gagal.slice(0, 5).join('; ')}{selesai.gagal.length > 5 ? '…' : ''}
          </p>
        )}
        {hasilBalik && <HasilBalik h={hasilBalik} />}
        <p className="a-hint" style={{ marginTop: 10 }}>
          Salah pindah? Pemindahan ini bisa dibatalkan sekarang atau nanti lewat &quot;Pemindahan sebelumnya&quot; di dialog ini.
        </p>
        <p className="a-hint" style={{ marginTop: 10 }}>
          Langkah berikutnya: daftarkan RT/RW baru dan atur dusunnya di bagian Dusun, RT, dan RW; RT lama yang sudah kosong bisa dihapus dari daftar.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      onClose={onClose}
      title="Pemekaran / pindah wilayah"
      sub="Pindahkan seluruh atau sebagian keluarga ke RT/RW lain"
      icon={<Split className="i" />}
      width={560}
      foot={
        <>
          <Button type="button" variant="outline" onClick={konfirmasi ? () => setKonfirmasi(false) : onClose} disabled={jalankan.isPending}>
            {konfirmasi ? 'Kembali' : 'Batal'}
          </Button>
          {konfirmasi ? (
            <Button type="button" variant="destructive" onClick={proses} disabled={jalankan.isPending}>
              {jalankan.isPending ? 'Memindahkan…' : `Ya, pindahkan ${rencana.length} jiwa`}
            </Button>
          ) : (
            <Button type="button" onClick={() => setKonfirmasi(true)} disabled={!!galat || rencana.length === 0}>
              Lanjut ({rencana.length} jiwa)
            </Button>
          )}
        </>
      }
    >
      <div className="pmk-grid">
        <Field label="RT asal" htmlFor="pmk-rt-asal">
          <InBox>
            <select id="pmk-rt-asal" value={rtAsal} onChange={(e) => ubahAsal(e.target.value)}>
              {rtOpsi.length === 0 && <option value="">Belum ada penduduk</option>}
              {rtOpsi.map((r) => <option key={r} value={r}>RT {r} · {rtPakai[r]} jiwa</option>)}
            </select>
          </InBox>
        </Field>
        <Field label="RW asal" htmlFor="pmk-rw-asal">
          <InBox>
            <select id="pmk-rw-asal" value={rwAsal} onChange={(e) => { setRwAsal(e.target.value); setTerpilih(new Set()); setKonfirmasi(false) }}>
              <option value="">Semua RW</option>
              {rwOpsi.map((r) => <option key={r} value={r}>RW {r}</option>)}
            </select>
          </InBox>
        </Field>
        <Field label="RT tujuan" htmlFor="pmk-rt-tujuan" hint="Kosongkan bila RT tidak berubah">
          <InBox><input id="pmk-rt-tujuan" inputMode="numeric" maxLength={3} placeholder="mis. 012" value={rtTujuan}
            onChange={(e) => { setRtTujuan(e.target.value.replace(/\D/g, '')); setKonfirmasi(false) }} /></InBox>
        </Field>
        <Field label="RW tujuan" htmlFor="pmk-rw-tujuan" hint="Kosongkan bila RW tidak berubah">
          <InBox><input id="pmk-rw-tujuan" inputMode="numeric" maxLength={3} placeholder="mis. 004" value={rwTujuan}
            onChange={(e) => { setRwTujuan(e.target.value.replace(/\D/g, '')); setKonfirmasi(false) }} /></InBox>
        </Field>
      </div>

      <div className="pmk-mode" role="radiogroup" aria-label="Cakupan">
        <label><input type="radio" name="pmk-mode" checked={mode === 'semua'} onChange={() => { setMode('semua'); setKonfirmasi(false) }} /> Semua keluarga di RT{rwAsal ? `/RW ${rwAsal}` : ''} ini ({keluarga.length} keluarga)</label>
        <label><input type="radio" name="pmk-mode" checked={mode === 'pilih'} onChange={() => { setMode('pilih'); setKonfirmasi(false) }} /> Pilih keluarga tertentu (sebagian)</label>
      </div>

      {mode === 'pilih' && (
        <div className="pmk-list">
          <div className="a-in srch"><input type="text" placeholder="Cari kepala keluarga atau No. KK" aria-label="Cari keluarga" value={cari} onChange={(e) => setCari(e.target.value)} /></div>
          <div className="pmk-rows" role="group" aria-label="Daftar keluarga">
            {tampil.map((k) => (
              <label key={k.kunci} className="pmk-row">
                <input type="checkbox" checked={terpilih.has(k.kunci)} onChange={() => toggle(k.kunci)} />
                <span><b>{k.kepala}</b><small>{k.noKk || 'tanpa No. KK'} · {k.jumlah} jiwa · RW {k.rw || '—'}</small></span>
              </label>
            ))}
            {tampil.length === 0 && <p className="a-hint" style={{ margin: 8 }}>Tidak ada keluarga.</p>}
          </div>
          <div className="pmk-pilih">
            <button type="button" className="a-link" onClick={() => { setTerpilih(new Set(tampil.map((k) => k.kunci))); setKonfirmasi(false) }}>Pilih semua yang tampil</button>
            <button type="button" className="a-link" onClick={() => { setTerpilih(new Set()); setKonfirmasi(false) }}>Kosongkan</button>
          </div>
        </div>
      )}

      <div className="dsn-note" style={{ marginTop: 12, marginBottom: 0 }} data-testid="ringkasan-pemekaran">
        {galat
          ? <>{galat}</>
          : <><b>{rencana.length} jiwa</b> ({jumlahKel} keluarga) dari RT {rt3(rtAsal)}{rwAsal ? `/RW ${rt3(rwAsal)}` : ''} <ArrowRight size={13} aria-hidden style={{ verticalAlign: '-2px' }} /> <b>{labelTujuan}</b>.</>}
        {!galat && tujuanBaru && <> RT {rt3(rtTujuan)} belum terdaftar di dusun mana pun; daftarkan di bagian Dusun, RT, dan RW agar dusunnya benar.</>}
      </div>

      {konfirmasi && (
        <div className="dsn-note warn" role="alert" style={{ marginTop: 10, marginBottom: 0 }}>
          <TriangleAlert size={14} aria-hidden style={{ verticalAlign: '-2px', marginRight: 6 }} />
          <b>Ini mengubah RT/RW {rencana.length} penduduk sekaligus.</b> Setiap perubahan dicatat di Log aktivitas dan Riwayat penduduk (nilai lama tertulis). Disarankan Ekspor data penduduk lebih dulu sebagai cadangan.
        </div>
      )}
      <RiwayatPemindahan />
    </Modal>
  )
}
