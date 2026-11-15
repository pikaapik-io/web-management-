import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { catatDiselamatkan, hapusWishlist, simpanPengeluaran, tambahWishlist, ubahWishlist } from '../actions'
import { pesanSetelahCatat } from '../components/ExpenseSheet'
import { Button, Card, CardTitle, Chip, cx, Empty, Field, inputCls, MoneyInput, PilihanGrid, ProgressBar, Sheet } from '../components/ui'
import { useApp } from '../context'
import { hitungAnggaran, jatahSetelahBeli, jumlah } from '../lib/budget'
import { KATEGORI, kategoriInfo } from '../lib/constants'
import { addDays, diffDays } from '../lib/dates'
import { rupiah, tanggal } from '../lib/format'

export default function Wishlist() {
  const { data, today, toast } = useApp()
  const [tambah, setTambah] = useState(false)
  const [lihatRiwayat, setLihatRiwayat] = useState(false)
  const tunggu = Number(data.settings.wishlistTunggu) || 0
  const anggaran = useMemo(() => hitungAnggaran(data, today), [data, today])

  const bolehTanggal = (w) => addDays(w.tanggalDitambah, tunggu)
  const menunggu = data.wishlist.filter((w) => w.status === 'menunggu')
  const waktunya = menunggu.filter((w) => bolehTanggal(w) <= today)
  const masihTunggu = menunggu.filter((w) => bolehTanggal(w) > today).sort((a, b) => bolehTanggal(a).localeCompare(bolehTanggal(b)))
  const bolehBeli = data.wishlist.filter((w) => w.status === 'boleh beli')
  const riwayat = data.wishlist
    .filter((w) => w.status === 'dibeli' || w.status === 'batal')
    .sort((a, b) => (b.tanggalSelesai || '').localeCompare(a.tanggalSelesai || ''))
  const hematWishlist = jumlah(data.savings.filter((s) => s.sumber === 'wishlist'), (s) => s.harga)

  const masihButuh = async (w) => {
    await ubahWishlist(w.id, { status: 'boleh beli' })
    toast('Oke, sekarang boleh dibeli. Tetap bijak ya 🙂')
  }
  const gakJadi = async (w) => {
    await ubahWishlist(w.id, { status: 'batal', tanggalSelesai: today })
    await catatDiselamatkan({ tanggal: today, nama: w.nama, harga: w.harga, kategori: w.kategori, sumber: 'wishlist', wishlistId: w.id })
    toast(`Keren! ${rupiah(w.harga)} berhasil diselamatkan 🎉`)
  }
  const beli = async (w) => {
    const rec = { tanggal: today, nominal: w.harga, kategori: w.kategori, jenis: 'pengen', catatan: w.nama }
    const id = await simpanPengeluaran(rec)
    await ubahWishlist(w.id, { status: 'dibeli', tanggalSelesai: today })
    const { pesan, tone } = pesanSetelahCatat(data, today, { ...rec, id })
    toast(pesan, { tone })
  }
  const hapus = async (w) => {
    if (!confirm(`Hapus "${w.nama}" dari wishlist? (Tidak dihitung sebagai uang diselamatkan)`)) return
    await hapusWishlist(w.id)
  }

  const kosong = !menunggu.length && !bolehBeli.length

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight lg:text-4xl">Wishlist</h1>
        <Button size="sm" variant="soft" onClick={() => setTambah(true)}>
          <Plus size={16} /> Tambah
        </Button>
      </header>

      <Card className="bg-sky-50 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-900">
        <p className="text-sm text-sky-950 dark:text-sky-100">
          ⏳ Barang yang ditunda harus nunggu <b>{tunggu} hari</b> dulu. Kalau setelah itu masih kepikiran, baru boleh beli. Sering kali
          rasa pengennya hilang sendiri 😉
        </p>
        {hematWishlist > 0 && (
          <p className="mt-2 text-sm font-semibold text-sky-950 dark:text-sky-100">Dari wishlist kamu udah hemat {rupiah(hematWishlist)} 🎉</p>
        )}
      </Card>

      {kosong && (
        <Card>
          <Empty emoji="🧘" title="Wishlist kosong">
            Pas ada yang pengen dibeli, pakai tombol "Mau beli sesuatu?" di Beranda lalu pilih "Tunda ke Wishlist".
          </Empty>
        </Card>
      )}

      {waktunya.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <h2 className="px-1 text-sm font-semibold md:col-span-2 xl:col-span-3">🤔 Waktunya mikir lagi</h2>
          {waktunya.map((w) => (
            <Item key={w.id} w={w} onHapus={hapus}>
              <p className="mb-2 text-sm font-semibold">Masih butuh?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" onClick={() => masihButuh(w)}>
                  Masih butuh
                </Button>
                <Button size="sm" onClick={() => gakJadi(w)}>
                  Gak jadi 🎉
                </Button>
              </div>
            </Item>
          ))}
        </section>
      )}

      {bolehBeli.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <h2 className="px-1 text-sm font-semibold md:col-span-2 xl:col-span-3">✅ Boleh beli</h2>
          {bolehBeli.map((w) => (
            <Item key={w.id} w={w} onHapus={hapus}>
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                Kalau beli hari ini, jatah harianmu jadi {rupiah(jatahSetelahBeli(anggaran, w.harga))} sampai{' '}
                {tanggal(anggaran.hariTerakhir, { pendek: true, tahun: false })}.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" onClick={() => beli(w)}>
                  Beli sekarang
                </Button>
                <Button size="sm" onClick={() => gakJadi(w)}>
                  Gak jadi 🎉
                </Button>
              </div>
            </Item>
          ))}
        </section>
      )}

      {masihTunggu.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <h2 className="px-1 text-sm font-semibold md:col-span-2 xl:col-span-3">⏳ Masih menunggu</h2>
          {masihTunggu.map((w) => {
            const sisa = diffDays(bolehTanggal(w), today)
            const lewat = diffDays(today, w.tanggalDitambah)
            return (
              <Item key={w.id} w={w} onHapus={hapus}>
                <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Boleh beli {tanggal(bolehTanggal(w), { pendek: true, tahun: false })}</span>
                  <span className="font-semibold">{sisa} hari lagi</span>
                </div>
                <ProgressBar value={tunggu ? lewat / tunggu : 1} tone="neutral" className="mb-2" />
                <Button size="sm" variant="ghost" className="w-full" onClick={() => gakJadi(w)}>
                  Udah nggak pengen, gak jadi 🎉
                </Button>
              </Item>
            )
          })}
        </section>
      )}

      {riwayat.length > 0 && (
        <Card>
          <button type="button" className="flex w-full items-center justify-between font-semibold" onClick={() => setLihatRiwayat((v) => !v)}>
            <span>Riwayat ({riwayat.length})</span>
            <ChevronDown size={18} className={cx('transition', lihatRiwayat && 'rotate-180')} />
          </button>
          {lihatRiwayat && (
            <ul className="mt-2 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {riwayat.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 truncate">
                    {kategoriInfo(w.kategori).emoji} {w.nama}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular">{rupiah(w.harga)}</span>
                    <Chip tone={w.status === 'batal' ? 'ok' : 'neutral'}>{w.status === 'batal' ? 'Gak jadi' : 'Dibeli'}</Chip>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tambah && <TambahWishlist onClose={() => setTambah(false)} />}
    </div>
  )
}

function Item({ w, onHapus, children }) {
  return (
    <Card>
      <div className="mb-3 flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-zinc-100 text-2xl dark:bg-zinc-800">{kategoriInfo(w.kategori).emoji}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{w.nama}</p>
          <p className="tabular text-sm text-zinc-500 dark:text-zinc-400">
            {rupiah(w.harga)} · ditambah {tanggal(w.tanggalDitambah, { pendek: true, tahun: false })}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Hapus ${w.nama}`}
          className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => onHapus(w)}
        >
          <Trash2 size={16} />
        </button>
      </div>
      {children}
    </Card>
  )
}

function TambahWishlist({ onClose }) {
  const { data, today, toast } = useApp()
  const [nama, setNama] = useState('')
  const [harga, setHarga] = useState(0)
  const [kategori, setKategori] = useState('Belanja Barang')
  const [error, setError] = useState('')
  const tunggu = Number(data.settings.wishlistTunggu) || 0

  const simpan = async () => {
    if (!nama.trim()) return setError('Kasih nama barangnya dulu')
    if (!harga) return setError('Isi perkiraan harganya')
    await tambahWishlist({ nama: nama.trim(), harga, kategori, tanggalDitambah: today })
    onClose()
    toast(`Masuk wishlist ⏳ Kita tanya lagi ${tanggal(addDays(today, tunggu), { pendek: true, tahun: false })} ya`)
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Tambah ke wishlist"
      footer={
        <Button className="w-full" size="lg" onClick={simpan}>
          Simpan
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Nama barang">
          <input className={inputCls} value={nama} autoFocus onChange={(e) => (setNama(e.target.value), setError(''))} placeholder="Misal: headphone" />
        </Field>
        <Field label="Perkiraan harga">
          <MoneyInput value={harga} onChange={(v) => (setHarga(v), setError(''))} />
        </Field>
        <Field grup label="Kategori">
          <PilihanGrid items={KATEGORI} value={kategori} onChange={setKategori} />
        </Field>
        {error && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </Sheet>
  )
}
