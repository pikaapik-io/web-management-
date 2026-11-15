import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { hapusPengeluaran, simpanPengeluaran } from '../actions'
import { useApp } from '../context'
import { hitungAnggaran, pemakaianMingguan } from '../lib/budget'
import { KATEGORI, kategoriInfo } from '../lib/constants'
import { startOfWeek } from '../lib/dates'
import { rupiah } from '../lib/format'
import TanggalInput from './TanggalInput'
import { Button, Field, inputCls, MoneyInput, PilihanGrid, Segmented, Sheet } from './ui'

export const JENIS_OPSI = [
  { value: 'butuh', label: '✅ Butuh' },
  { value: 'pengen', label: '✨ Pengen' },
]

/**
 * Pesan setelah pengeluaran disimpan: peringatan budget kategori (80% / lewat)
 * atau sisa jatah hari ini.
 */
export function pesanSetelahCatat(data, today, rec) {
  const lain = data.expenses.filter((e) => e.id !== rec.id)
  const batas = data.categoryBudgets.find((b) => b.kategori === rec.kategori)?.batasMingguan
  if (batas && startOfWeek(rec.tanggal) === startOfWeek(today)) {
    const sesudah = pemakaianMingguan(lain, rec.kategori, rec.tanggal) + rec.nominal
    if (sesudah > batas) {
      return { pesan: `Budget ${rec.kategori} minggu ini lewat ${rupiah(sesudah - batas)}. Gapapa, minggu depan pelan-pelan ya 🙏`, tone: 'warn' }
    }
    if (sesudah >= 0.8 * batas) {
      return { pesan: `Budget ${rec.kategori} minggu ini tinggal ${rupiah(batas - sesudah)}. Hati-hati ya ☝️`, tone: 'warn' }
    }
  }
  if (rec.tanggal === today) {
    const a = hitungAnggaran({ ...data, expenses: [...lain, rec] }, today)
    if (a.sisaJatah >= 0) return { pesan: `Dicatat ✅ Sisa jatah hari ini ${rupiah(a.sisaJatah)}` }
    return { pesan: `Dicatat. Hari ini lewat jatah ${rupiah(-a.sisaJatah)}, besok kita atur lagi ya 🙂` }
  }
  return { pesan: 'Pengeluaran dicatat ✅' }
}

export default function ExpenseSheet({ open, onClose, awal = {} }) {
  const { data, today, toast } = useApp()
  const edit = Boolean(awal.id)
  const [nominal, setNominal] = useState(awal.nominal || 0)
  const [kategori, setKategori] = useState(awal.kategori || null)
  const [jenis, setJenis] = useState(awal.jenis || 'butuh')
  const [jenisDiubah, setJenisDiubah] = useState(edit)
  const [tanggal, setTanggal] = useState(awal.tanggal || today)
  const [catatan, setCatatan] = useState(awal.catatan || '')
  const [error, setError] = useState('')

  const pilihKategori = (k) => {
    setKategori(k)
    if (!jenisDiubah) setJenis(kategoriInfo(k).jenis)
    setError('')
  }

  const simpan = async () => {
    if (!nominal) return setError('Isi nominalnya dulu ya')
    if (!kategori) return setError('Pilih kategorinya dulu')
    const rec = { tanggal, nominal, kategori, jenis, catatan: catatan.trim() }
    const id = await simpanPengeluaran(edit ? { ...rec, id: awal.id } : rec)
    const { pesan, tone } = pesanSetelahCatat(data, today, { ...rec, id })
    onClose()
    toast(pesan, { tone })
  }

  const hapus = async () => {
    if (!confirm('Hapus pengeluaran ini?')) return
    await hapusPengeluaran(awal.id)
    onClose()
    toast('Pengeluaran dihapus', { aksi: { label: 'Batalkan', onClick: () => simpanPengeluaran(awal) } })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={edit ? 'Ubah pengeluaran' : 'Catat pengeluaran'}
      footer={
        <div className="flex gap-2">
          {edit && (
            <Button variant="dangerSoft" onClick={hapus} aria-label="Hapus">
              <Trash2 size={18} />
            </Button>
          )}
          <Button className="flex-1" size="lg" onClick={simpan}>
            Simpan
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <MoneyInput value={nominal} onChange={(v) => (setNominal(v), setError(''))} autoFocus={!edit} />
        <PilihanGrid items={KATEGORI} value={kategori} onChange={pilihKategori} />
        <Field grup label="Ini butuh atau pengen?">
          <Segmented
            options={JENIS_OPSI}
            value={jenis}
            onChange={(v) => {
              setJenis(v)
              setJenisDiubah(true)
            }}
          />
        </Field>
        <Field grup label="Tanggal">
          <TanggalInput value={tanggal} onChange={setTanggal} today={today} max={today} />
        </Field>
        <Field label="Catatan (opsional)">
          <input className={inputCls} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Misal: makan siang" />
        </Field>
        {error && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </Sheet>
  )
}
