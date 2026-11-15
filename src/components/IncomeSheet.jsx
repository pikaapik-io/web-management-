import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { hapusPemasukan, simpanPemasukan } from '../actions'
import { useApp } from '../context'
import { hitungAnggaran } from '../lib/budget'
import { SUMBER } from '../lib/constants'
import { rupiah } from '../lib/format'
import TanggalInput from './TanggalInput'
import { Button, Field, inputCls, MoneyInput, PilihanGrid, Sheet } from './ui'

export default function IncomeSheet({ open, onClose, awal = {} }) {
  const { data, today, toast } = useApp()
  const edit = Boolean(awal.id)
  const [nominal, setNominal] = useState(awal.nominal || 0)
  const [sumber, setSumber] = useState(awal.sumber || null)
  const [tanggal, setTanggal] = useState(awal.tanggal || today)
  const [catatan, setCatatan] = useState(awal.catatan || '')
  const [error, setError] = useState('')

  const simpan = async () => {
    if (!nominal) return setError('Isi nominalnya dulu ya')
    if (!sumber) return setError('Pilih sumbernya dulu')
    const rec = { tanggal, nominal, sumber, catatan: catatan.trim() }
    if (awal.recurringId) rec.recurringId = awal.recurringId
    const id = await simpanPemasukan(edit ? { ...awal, ...rec } : rec)
    onClose()
    const lain = data.incomes.filter((i) => i.id !== id)
    const a = hitungAnggaran({ ...data, incomes: [...lain, { ...rec, id }] }, today)
    toast(`Pemasukan dicatat 💰 Jatah harianmu sekarang ${rupiah(a.jatah)}`)
  }

  const hapus = async () => {
    if (!confirm('Hapus pemasukan ini?')) return
    await hapusPemasukan(awal.id)
    onClose()
    toast('Pemasukan dihapus', { aksi: { label: 'Batalkan', onClick: () => simpanPemasukan(awal) } })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={edit ? 'Ubah pemasukan' : 'Catat pemasukan'}
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
        <MoneyInput value={nominal} onChange={(v) => (setNominal(v), setError(''))} autoFocus={!edit && !awal.nominal} />
        <Field grup label="Sumber">
          <PilihanGrid items={SUMBER} value={sumber} onChange={(s) => (setSumber(s), setError(''))} />
        </Field>
        <Field grup label="Tanggal">
          <TanggalInput value={tanggal} onChange={setTanggal} today={today} />
        </Field>
        <Field label="Catatan (opsional)">
          <input className={inputCls} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Misal: gaji November" />
        </Field>
        {error && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </Sheet>
  )
}
