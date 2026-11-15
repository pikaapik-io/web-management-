import { useMemo, useState } from 'react'
import { catatDiselamatkan, simpanPengeluaran, tambahWishlist } from '../actions'
import { useApp } from '../context'
import { hitungAnggaran, jatahSetelahBeli, pemakaianMingguan } from '../lib/budget'
import { KATEGORI, kategoriInfo } from '../lib/constants'
import { addDays } from '../lib/dates'
import { namaBulan, rupiah, tanggal } from '../lib/format'
import { rekapBulanAktif } from '../lib/loans'
import { JENIS_OPSI, pesanSetelahCatat } from './ExpenseSheet'
import { Button, cx, Field, inputCls, MoneyInput, PilihanGrid, Segmented, Sheet } from './ui'

const TONE = {
  info: 'bg-zinc-50 dark:bg-zinc-800/60',
  warn: 'bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
  danger: 'bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100',
  ide: 'bg-brand-50 text-brand-950 dark:bg-brand-950/40 dark:text-brand-100',
}

const angka1 = (x) => (x < 10 ? x.toFixed(1).replace('.', ',').replace(',0', '') : String(Math.round(x)))

/** Daftar dampak pembelian, dalam bahasa santai. */
function hitungDampak({ data, today, harga, kategori }) {
  const a = hitungAnggaran(data, today)
  const out = []
  const sampai = tanggal(a.hariTerakhir, { pendek: true, tahun: false })

  const rekap = rekapBulanAktif(data.loans, today)
  if (rekap?.total) {
    const pct = (harga / rekap.total) * 100
    out.push({
      icon: '💳',
      teks: `Ini setara ${pct < 1 ? 'kurang dari 1' : Math.round(pct)}% total cicilan ${namaBulan(rekap.bulan)} (${rupiah(rekap.total)}).`,
    })
  }

  if (a.jatah > 0) {
    const baru = jatahSetelahBeli(a, harga)
    if (harga / a.jatah >= 0.1) out.push({ icon: '📅', teks: `Setara ${angka1(harga / a.jatah)} hari jatah harianmu.` })
    out.push({
      icon: '📉',
      teks: `Kalau beli, jatah harianmu turun dari ${rupiah(a.jatah)} jadi ${rupiah(baru)} sampai ${sampai}.`,
      tone: baru < a.jatah * 0.5 ? 'warn' : 'info',
    })
    const sisa = a.sisaJatah - harga
    out.push(
      sisa >= 0
        ? { icon: '👛', teks: `Sisa jatah hari ini tinggal ${rupiah(sisa)}.` }
        : { icon: '👛', teks: `Hari ini jadi lewat jatah ${rupiah(-sisa)}.`, tone: 'warn' },
    )
  }

  if (kategori) {
    const batas = data.categoryBudgets.find((b) => b.kategori === kategori)?.batasMingguan
    if (batas) {
      const sisa = batas - pemakaianMingguan(data.expenses, kategori, today)
      const sesudah = sisa - harga
      out.push({
        icon: '🎯',
        teks:
          `Budget ${kategori} minggu ini tinggal ${rupiah(Math.max(0, sisa))}` +
          (sesudah < 0 ? `, kalau beli jadi lewat ${rupiah(-sesudah)}.` : `, kalau beli sisa ${rupiah(sesudah)}.`),
        tone: sesudah < 0 ? 'danger' : sesudah < batas * 0.2 ? 'warn' : 'info',
      })
    }
  }

  if (harga > a.bebas) {
    const yangKepakai = a.kunciCicilan > 0 ? 'uang buat cicilan' : 'uang kebutuhan pokok'
    out.push({
      icon: '🚨',
      teks: `Uang bebasmu sekarang ${rupiah(Math.max(0, a.bebas))}. Kalau beli, ${yangKepakai} ikut kepakai.`,
      tone: 'danger',
    })
  }

  if (kategori) out.push({ icon: '💡', teks: `Ide lain: ${kategoriInfo(kategori).ide}`, tone: 'ide' })
  return out
}

export default function MauBeliSheet({ open, onClose }) {
  const { data, today, toast } = useApp()
  const [harga, setHarga] = useState(0)
  const [kategori, setKategori] = useState(null)
  const [jenis, setJenis] = useState('pengen')
  const [nama, setNama] = useState('')
  const [error, setError] = useState('')

  const dampak = useMemo(() => (harga > 0 ? hitungDampak({ data, today, harga, kategori }) : []), [data, today, harga, kategori])
  const siap = harga > 0 && kategori
  const tunggu = Number(data.settings.wishlistTunggu) || 3

  const pilihKategori = (k) => {
    setKategori(k)
    setJenis(kategoriInfo(k).jenis)
    setError('')
  }

  const tetapBeli = async () => {
    const rec = { tanggal: today, nominal: harga, kategori, jenis, catatan: nama.trim() }
    const id = await simpanPengeluaran(rec)
    onClose()
    const { pesan, tone } = pesanSetelahCatat(data, today, { ...rec, id })
    toast(pesan, { tone })
  }

  const tunda = async () => {
    if (!nama.trim()) return setError('Kasih nama barangnya dulu ya, biar gampang diingat di wishlist')
    await tambahWishlist({ nama: nama.trim(), harga, kategori, tanggalDitambah: today })
    onClose()
    toast(`Masuk wishlist ⏳ Kita tanya lagi ${tanggal(addDays(today, tunggu), { pendek: true, tahun: false })} ya`)
  }

  const gakJadi = async () => {
    await catatDiselamatkan({ tanggal: today, nama: nama.trim() || kategori, harga, kategori, sumber: 'mau-beli' })
    onClose()
    toast(`Mantap! ${rupiah(harga)} berhasil diselamatkan 🎉`)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Mau beli sesuatu? 🤔"
      footer={
        <div className="space-y-2">
          <Button className="w-full" size="lg" disabled={!siap} onClick={gakJadi}>
            🎉 Gak jadi, simpan uangnya
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="soft" disabled={!siap} onClick={tunda}>
              ⏳ Tunda ke Wishlist
            </Button>
            <Button variant="secondary" disabled={!siap} onClick={tetapBeli}>
              Tetap beli
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Ketik harganya, nanti kita lihat dampaknya bareng-bareng.</p>
        <MoneyInput value={harga} onChange={setHarga} autoFocus label="Harga" />
        <PilihanGrid items={KATEGORI} value={kategori} onChange={pilihKategori} />

        {dampak.length > 0 && (
          <div className="space-y-2" aria-live="polite">
            {dampak.map((d, i) => (
              <div key={i} className={cx('flex gap-3 rounded-2xl p-3 text-sm', TONE[d.tone || 'info'])}>
                <span className="text-lg leading-none">{d.icon}</span>
                <span>{d.teks}</span>
              </div>
            ))}
          </div>
        )}

        {siap && (
          <>
            <Field label="Nama barang (opsional, wajib kalau ditunda)">
              <input
                className={inputCls}
                value={nama}
                onChange={(e) => (setNama(e.target.value), setError(''))}
                placeholder="Misal: sepatu lari"
              />
            </Field>
            <Field grup label="Kalau tetap beli, ini termasuk...">
              <Segmented options={JENIS_OPSI} value={jenis} onChange={setJenis} />
            </Field>
          </>
        )}
        {error && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </Sheet>
  )
}
