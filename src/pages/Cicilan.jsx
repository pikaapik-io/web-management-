import { CalendarDays, ChevronDown, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarBulanan } from '../components/charts'
import KartuUtang from '../components/KartuUtang'
import { BayarSheet, DetailSheet, FormCicilanSheet, TONE_STATUS } from '../components/LoanSheets'
import { Button, Card, Chip, cx, Empty, ProgressBar } from '../components/ui'
import { useApp } from '../context'
import { diffDays } from '../lib/dates'
import { BULAN_PENDEK, hitungMundur, namaBulan, persen, rupiah, tanggal } from '../lib/format'
import { rekapBulanAktif, rekapPerBulan, ringkasanUtang, statusCicilan } from '../lib/loans'
import { unduhICS } from '../lib/unduh'

export function PesanSemangat({ persen: p }) {
  const teks =
    p >= 100
      ? 'Semua cicilan lunas! Kamu hebat banget 🎉'
      : p >= 75
        ? `Dikit lagi! Udah lunas ${persen(p)}, garis finish udah kelihatan 🏁`
        : p >= 40
          ? `Pelan-pelan, kamu udah lunas ${persen(p)}! 💪`
          : p > 0
            ? `Udah lunas ${persen(p)}. Langkah kecil tetap langkah maju 🌱`
            : 'Perjalanan dimulai. Satu cicilan dulu, pelan-pelan pasti lunas 🌱'
  return <p className="text-sm text-zinc-600 dark:text-zinc-300">{teks}</p>
}

export default function Cicilan() {
  const { data, today, toast } = useApp()
  const [sheet, setSheet] = useState(null) // { jenis: 'detail' | 'bayar' | 'form', id? }
  const [lihatLunas, setLihatLunas] = useState(false)

  const utang = ringkasanUtang(data.loans)
  const bulan = rekapBulanAktif(data.loans, today)
  const seri = rekapPerBulan(data.loans).map((r) => ({
    key: r.bulan,
    label: BULAN_PENDEK[Number(r.bulan.slice(5)) - 1],
    labelPanjang: namaBulan(r.bulan),
    nilai: r.total,
    sub: `${r.jumlahDibayar}/${r.jumlah} lunas`,
  }))

  const { grup, lunas } = useMemo(() => {
    const items = data.loans.map((loan) => ({ loan, status: statusCicilan(loan, today) }))
    const aktif = items
      .filter((x) => x.status.next)
      .sort((a, b) => a.status.next.due.localeCompare(b.status.next.due) || a.loan.id - b.loan.id)
    const grup = []
    for (const x of aktif) {
      const g = grup[grup.length - 1]
      if (g && g.due === x.status.next.due) g.items.push(x)
      else grup.push({ due: x.status.next.due, items: [x] })
    }
    return { grup, lunas: items.filter((x) => !x.status.next) }
  }, [data.loans, today])

  const loanSheet = sheet?.id ? data.loans.find((l) => l.id === sheet.id) : null
  const tutup = () => setSheet(null)

  const ekspor = () => {
    const n = unduhICS(data.loans, today)
    toast(n ? `File kalender diunduh (${n} jadwal) 📅 Buka file-nya buat impor ke kalender` : 'Tidak ada jadwal cicilan ke depan')
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight lg:text-4xl">Cicilan</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{utang.aktif} cicilan aktif · tandai "Sudah bayar" setiap selesai bayar.</p>
        </div>
        <div className="flex gap-2">
          {grup.length > 0 && (
            <Button size="sm" variant="secondary" onClick={ekspor} className="hidden sm:inline-flex">
              <CalendarDays size={16} /> Ke kalender
            </Button>
          )}
          <Button size="sm" onClick={() => setSheet({ jenis: 'form' })}>
            <Plus size={16} /> Tambah
          </Button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Kolom kiri: ringkasan */}
        <div className="space-y-4 lg:col-span-5 xl:col-span-4">
          <Card>
            <KartuUtang utang={utang} />
            <div className="mt-4 mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-semibold">Lunas {Math.floor(utang.persen)}%</span>
              <span className="tabular text-xs text-zinc-500 dark:text-zinc-400">
                {rupiah(utang.dibayar)} / {rupiah(utang.total)}
              </span>
            </div>
            <ProgressBar value={utang.persen / 100} />
            <div className="mt-2">
              <PesanSemangat persen={utang.persen} />
            </div>
          </Card>

          {bulan && (
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Cicilan per bulan</h2>
                  <p className="mt-1 text-2xl font-medium tracking-tight">
                    {rupiah(bulan.dibayar)} <span className="text-base text-zinc-500 dark:text-zinc-400">/ {rupiah(bulan.total)}</span>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {namaBulan(bulan.bulan)} · {bulan.jumlahDibayar} dari {bulan.jumlah} sudah dibayar
                  </p>
                </div>
              </div>
              <BarBulanan data={seri} aktif={bulan.bulan} judul="Total cicilan per bulan" />
            </Card>
          )}
        </div>

        {/* Kolom kanan: daftar */}
        <div className="space-y-4 lg:col-span-7 xl:col-span-8">
          {grup.length === 0 && lunas.length === 0 && (
            <Card>
              <Empty emoji="🗒️" title="Belum ada cicilan">
                Tambahkan cicilan pertamamu lewat tombol Tambah di atas.
              </Empty>
            </Card>
          )}

          <div className="grid items-start gap-4 xl:grid-cols-2">
            {grup.map((g) => {
              const hari = diffDays(g.due, today)
              const total = g.items.reduce((s, x) => s + x.loan.nominalPerBulan, 0)
              return (
                <Card key={g.due} className="p-3 sm:p-4">
                  <div className="mb-1 flex items-center justify-between gap-2 px-1">
                    <span className="text-sm font-semibold">
                      {tanggal(g.due, { hari: true, pendek: true, tahun: false })}{' '}
                      <span
                        className={cx(
                          'font-medium',
                          hari < 0 ? 'text-rose-600 dark:text-rose-400' : hari <= 3 ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400',
                        )}
                      >
                        · {hitungMundur(hari)}
                      </span>
                    </span>
                    <span className="tabular text-sm font-semibold">{rupiah(total)}</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
                    {g.items.map(({ loan, status }) => (
                      <div key={loan.id} className="flex items-center gap-2 py-2">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 text-left hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-white/[0.04]"
                          onClick={() => setSheet({ jenis: 'detail', id: loan.id })}
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200">
                            SP
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-semibold">{loan.nama}</span>
                              <Chip tone={TONE_STATUS[status.kode]}>{status.label}</Chip>
                            </span>
                            <span className="tabular block text-sm text-zinc-500 dark:text-zinc-400">
                              {rupiah(loan.nominalPerBulan)} · ke-{status.next.ke} dari {loan.tenorTotal}
                            </span>
                          </span>
                        </button>
                        <Button
                          size="sm"
                          variant={status.kode === 'telat' ? 'danger' : status.kode === 'dekat' ? 'primary' : 'soft'}
                          onClick={() => setSheet({ jenis: 'bayar', id: loan.id })}
                        >
                          Sudah bayar
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>

          {lunas.length > 0 && (
            <Card>
              <button type="button" className="flex w-full items-center justify-between font-semibold" onClick={() => setLihatLunas((v) => !v)}>
                <span>🎉 Sudah lunas ({lunas.length})</span>
                <ChevronDown size={18} className={cx('transition', lihatLunas && 'rotate-180')} />
              </button>
              {lihatLunas && (
                <ul className="mt-2 divide-y divide-zinc-100 dark:divide-white/[0.06]">
                  {lunas.map(({ loan }) => (
                    <li key={loan.id}>
                      <button
                        type="button"
                        className="flex w-full justify-between py-2 text-left text-sm"
                        onClick={() => setSheet({ jenis: 'detail', id: loan.id })}
                      >
                        <span>{loan.nama}</span>
                        <span className="tabular text-zinc-500">{rupiah(loan.nominalPerBulan * loan.tenorTotal)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {grup.length > 0 && (
            <Button variant="secondary" className="w-full sm:hidden" onClick={ekspor}>
              <CalendarDays size={18} /> Ekspor jadwal ke Kalender (.ics)
            </Button>
          )}
        </div>
      </div>

      {sheet?.jenis === 'detail' && loanSheet && (
        <DetailSheet
          loan={loanSheet}
          onClose={tutup}
          onBayar={() => setSheet({ jenis: 'bayar', id: loanSheet.id })}
          onEdit={() => setSheet({ jenis: 'form', id: loanSheet.id })}
        />
      )}
      {sheet?.jenis === 'bayar' && loanSheet && <BayarSheet loan={loanSheet} onClose={tutup} />}
      {sheet?.jenis === 'form' && <FormCicilanSheet loan={loanSheet} onClose={tutup} />}
    </div>
  )
}
