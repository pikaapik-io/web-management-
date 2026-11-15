import { Pencil, Trash2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { batalBayar, bayarCicilan, hapusCicilan, simpanCicilan } from '../actions'
import { useApp } from '../context'
import { addMonths, diffDays, monthKey } from '../lib/dates'
import { hitungMundur, namaBulan, rupiah, tanggal } from '../lib/format'
import { cicilanBerikutnya, jadwal, statusCicilan } from '../lib/loans'
import TanggalInput from './TanggalInput'
import { Button, Chip, cx, Field, inputCls, MoneyInput, NumberInput, ProgressBar, Sheet } from './ui'

export const TONE_STATUS = { lunas: 'ok', sudah: 'ok', belum: 'neutral', dekat: 'warn', telat: 'danger' }

/** Konfirmasi "Sudah bayar" untuk cicilan berikutnya. */
export function BayarSheet({ loan, onClose }) {
  const { today, toast } = useApp()
  const next = cicilanBerikutnya(loan)
  const [nominal, setNominal] = useState(loan.nominalPerBulan)
  const [tanggalBayar, setTanggalBayar] = useState(today)
  if (!next) return null

  const simpan = async () => {
    await bayarCicilan(loan.id, { tanggalBayar, nominal: nominal || loan.nominalPerBulan })
    onClose()
    const terakhir = next.ke === loan.tenorTotal
    toast(
      terakhir
        ? `🎉 ${loan.nama} LUNAS! Satu beban hilang, keren banget!`
        : `Mantap! ${loan.nama} bulan ${namaBulan(next.bulan)} beres ✅`,
      { aksi: { label: 'Batalkan', onClick: () => batalBayar(loan.id) } },
    )
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Bayar ${loan.nama}`}
      footer={
        <Button className="w-full" size="lg" onClick={simpan}>
          ✅ Tandai sudah bayar
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">
          <p className="font-semibold">
            Cicilan ke-{next.ke} dari {loan.tenorTotal} · {namaBulan(next.bulan)}
          </p>
          <p className="text-zinc-500 dark:text-zinc-400">
            Jatuh tempo {tanggal(next.due)} ({hitungMundur(diffDays(next.due, today)).toLowerCase()})
          </p>
        </div>
        <Field label="Nominal yang dibayar" hint="Ubah kalau ada denda atau biaya admin.">
          <MoneyInput value={nominal} onChange={setNominal} />
        </Field>
        <Field grup label="Tanggal bayar">
          <TanggalInput value={tanggalBayar} onChange={setTanggalBayar} today={today} max={today} />
        </Field>
      </div>
    </Sheet>
  )
}

/** Detail cicilan: jadwal lengkap, riwayat bayar, edit/hapus. */
export function DetailSheet({ loan, onClose, onBayar, onEdit }) {
  const { today, toast } = useApp()
  const list = jadwal(loan)
  const status = statusCicilan(loan, today)
  const sisa = (loan.tenorTotal - loan.tenorTerbayar) * loan.nominalPerBulan

  const hapus = async () => {
    if (!confirm(`Hapus ${loan.nama}? Riwayat bayarnya juga ikut terhapus.`)) return
    await hapusCicilan(loan.id)
    onClose()
    toast(`${loan.nama} dihapus`, { aksi: { label: 'Batalkan', onClick: () => simpanCicilan(loan) } })
  }

  const batal = async () => {
    const bulan = namaBulan(addMonths(loan.mulaiBulan, loan.tenorTerbayar - 1))
    if (!confirm(`Batalkan tanda bayar ${loan.nama} untuk ${bulan}?`)) return
    await batalBayar(loan.id)
    toast(`Tanda bayar ${bulan} dibatalkan`)
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={loan.nama}
      footer={
        <div className="flex gap-2">
          <Button variant="dangerSoft" onClick={hapus} aria-label="Hapus cicilan">
            <Trash2 size={18} />
          </Button>
          <Button variant="secondary" onClick={onEdit} className="flex-1">
            <Pencil size={18} /> Ubah
          </Button>
          {status.next && (
            <Button onClick={onBayar} className="flex-1">
              Sudah bayar
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info label="Per bulan" value={rupiah(loan.nominalPerBulan)} />
          <Info label="Jatuh tempo" value={`Tiap tgl ${loan.tanggalJatuhTempo}`} />
          <Info label="Sisa utang" value={rupiah(sisa)} />
          <Info label="Lunas" value={namaBulan(addMonths(loan.mulaiBulan, loan.tenorTotal - 1))} />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-semibold">
              {loan.tenorTerbayar} dari {loan.tenorTotal} cicilan lunas
            </span>
            <Chip tone={TONE_STATUS[status.kode]}>{status.label}</Chip>
          </div>
          <ProgressBar value={loan.tenorTerbayar / loan.tenorTotal} />
        </div>
        {loan.catatan && (
          <p className="rounded-2xl bg-amber-50 p-3 text-sm whitespace-pre-line text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            📝 {loan.catatan}
          </p>
        )}
        <div>
          <h3 className="mb-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Jadwal</h3>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {list.map((i) => {
              const telat = !i.paid && i.due < today
              return (
                <li key={i.ke} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-6 text-center text-zinc-400">{i.ke}</span>
                  <div className="flex-1">
                    <p className="font-medium">{namaBulan(i.bulan)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {i.paid
                        ? i.payment
                          ? `Dibayar ${tanggal(i.payment.tanggalBayar, { pendek: true })}${i.payment.nominal !== i.nominal ? ` · ${rupiah(i.payment.nominal)}` : ''}`
                          : 'Lunas'
                        : `Jatuh tempo ${tanggal(i.due, { pendek: true })}`}
                    </p>
                  </div>
                  <span className={cx('text-lg', telat && 'animate-pulse')}>{i.paid ? '✅' : telat ? '🔴' : '⏳'}</span>
                </li>
              )
            })}
          </ul>
        </div>
        {loan.tenorTerbayar > 0 && (
          <Button variant="ghost" size="sm" onClick={batal} className="w-full">
            <Undo2 size={16} /> Batalkan tanda bayar terakhir
          </Button>
        )}
      </div>
    </Sheet>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="tabular font-bold">{value}</p>
    </div>
  )
}

/** Tambah / ubah cicilan. */
export function FormCicilanSheet({ loan, onClose }) {
  const { today, toast } = useApp()
  const edit = Boolean(loan?.id)
  const [f, setF] = useState(() => ({
    nama: loan?.nama || '',
    nominalPerBulan: loan?.nominalPerBulan || 0,
    tanggalJatuhTempo: loan?.tanggalJatuhTempo || '',
    tenorTotal: loan?.tenorTotal || '',
    tenorTerbayar: loan?.tenorTerbayar ?? 0,
    mulaiBulan: loan?.mulaiBulan || monthKey(today),
    catatan: loan?.catatan || '',
  }))
  const [error, setError] = useState('')
  const set = (k) => (v) => {
    setF((x) => ({ ...x, [k]: v }))
    setError('')
  }

  const valid = f.tenorTotal >= 1 && f.mulaiBulan
  const simpan = async () => {
    if (!f.nama.trim()) return setError('Kasih nama pinjamannya dulu')
    if (!f.nominalPerBulan) return setError('Isi nominal per bulan')
    if (!(f.tanggalJatuhTempo >= 1 && f.tanggalJatuhTempo <= 31)) return setError('Tanggal jatuh tempo harus 1–31')
    if (!(f.tenorTotal >= 1)) return setError('Jumlah tenor minimal 1')
    if (f.tenorTerbayar === '' || f.tenorTerbayar > f.tenorTotal) return setError('Tenor yang sudah dibayar tidak boleh lebih dari total tenor')
    if (!f.mulaiBulan) return setError('Pilih bulan cicilan pertama')
    await simpanCicilan({ ...(loan || {}), ...f, nama: f.nama.trim(), catatan: f.catatan.trim() })
    onClose()
    toast(edit ? 'Perubahan disimpan ✅' : `${f.nama.trim()} ditambahkan ✅`)
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={edit ? `Ubah ${loan.nama}` : 'Tambah cicilan'}
      footer={
        <Button className="w-full" size="lg" onClick={simpan}>
          Simpan
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Nama pinjaman">
          <input className={inputCls} value={f.nama} onChange={(e) => set('nama')(e.target.value)} placeholder="Misal: SPinjam" />
        </Field>
        <Field label="Nominal per bulan">
          <MoneyInput value={f.nominalPerBulan} onChange={set('nominalPerBulan')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jatuh tempo (tgl)" hint="Tgl 29–31 otomatis geser ke akhir bulan kalau bulannya pendek.">
            <NumberInput value={f.tanggalJatuhTempo} onChange={set('tanggalJatuhTempo')} min={1} max={31} placeholder="1–31" />
          </Field>
          <Field label="Cicilan ke-1 bulan">
            <input type="month" className={inputCls} value={f.mulaiBulan} onChange={(e) => set('mulaiBulan')(e.target.value)} />
          </Field>
          <Field label="Total tenor (x)">
            <NumberInput value={f.tenorTotal} onChange={set('tenorTotal')} min={1} max={120} placeholder="Misal: 6" />
          </Field>
          <Field label="Sudah dibayar (x)">
            <NumberInput value={f.tenorTerbayar} onChange={set('tenorTerbayar')} min={0} max={120} />
          </Field>
        </div>
        {valid && f.nominalPerBulan > 0 && (
          <p className="rounded-2xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">
            Sisa utang <b>{rupiah(f.nominalPerBulan * Math.max(0, f.tenorTotal - (f.tenorTerbayar || 0)))}</b>, lunas{' '}
            <b>{namaBulan(addMonths(f.mulaiBulan, f.tenorTotal - 1))}</b>.
          </p>
        )}
        <Field label="Catatan (opsional)">
          <textarea
            className={cx(inputCls, 'h-auto min-h-20 py-3')}
            value={f.catatan}
            onChange={(e) => set('catatan')(e.target.value)}
            placeholder="Misal: denda telat 1%/hari"
          />
        </Field>
        {error && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </Sheet>
  )
}
