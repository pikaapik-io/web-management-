import { CalendarDays, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import MiniKalender from '../components/MiniKalender'
import { Banner, Button, Card, CardTitle, Chip, cx, Empty, ProgressBar, Row, Segmented } from '../components/ui'
import { useApp } from '../context'
import { butuhVsPengen, hitungAnggaran, jumlah, pemakaianMingguan, statusBudget } from '../lib/budget'
import { KATEGORI, kategoriInfo, sumberInfo } from '../lib/constants'
import { addDays, addMonths, endOfMonth, monthKey, startOfMonth, startOfWeek, toHM } from '../lib/dates'
import { labelHari, namaBulan, rupiah, tanggal } from '../lib/format'

export default function Catat() {
  const { data, today, now, buka, setSetting } = useApp()
  const [hari, setHari] = useState(today)
  const [bulanKal, setBulanKal] = useState(monthKey(today))
  const [lihatKalender, setLihatKalender] = useState(false)
  const [rentang, setRentang] = useState('minggu')
  const [bulanPemasukan, setBulanPemasukan] = useState(monthKey(today))

  const a = useMemo(() => hitungAnggaran(data, hari), [data, hari])
  const pengeluaran = data.expenses.filter((e) => e.tanggal === hari).sort((x, y) => (y.id || 0) - (x.id || 0))
  const pemasukanHari = data.incomes.filter((i) => i.tanggal === hari)
  const isHariIni = hari === today

  const pilihHari = (t) => {
    setHari(t)
    setBulanKal(monthKey(t))
  }

  const kunciMalam = `tutup:malam:${today}`
  const pengingatMalam =
    toHM(now) >= (data.settings.jamPengingat || '21:00') && !data.settings[kunciMalam] && !data.expenses.some((e) => e.tanggal === today)

  // Rekap
  const mulai = rentang === 'minggu' ? startOfWeek(hari) : startOfMonth(hari)
  const akhir = rentang === 'minggu' ? addDays(mulai, 6) : endOfMonth(hari)
  const bp = butuhVsPengen(data.expenses, mulai, akhir)
  const totalBp = bp.butuh + bp.pengen
  const budgets = data.categoryBudgets
    .filter((b) => b.batasMingguan > 0)
    .map((b) => {
      const terpakai = pemakaianMingguan(data.expenses, b.kategori, today)
      return { ...b, terpakai, st: statusBudget(terpakai, b.batasMingguan) }
    })

  const pemasukanBulan = data.incomes
    .filter((i) => monthKey(i.tanggal) === bulanPemasukan)
    .sort((x, y) => y.tanggal.localeCompare(x.tanggal) || (y.id || 0) - (x.id || 0))

  const lewat = a.terpakai > a.jatah
  const pakai = a.jatah > 0 ? a.terpakai / a.jatah : a.terpakai > 0 ? 1.01 : 0

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight lg:text-4xl">Catat</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Catat pemasukan & pengeluaran, lalu lihat rekap harianmu.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">

      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" variant="danger" onClick={() => buka.pengeluaran({ tanggal: hari })}>
          <Minus size={20} /> Pengeluaran
        </Button>
        <Button size="lg" onClick={() => buka.pemasukan({ tanggal: hari })}>
          <Plus size={20} /> Pemasukan
        </Button>
      </div>

      {pengingatMalam && (
        <Banner
          tone="info"
          icon="📝"
          title="Udah catat pengeluaran hari ini?"
          actions={
            <Button size="sm" variant="ghost" onClick={() => setSetting(kunciMalam, true)}>
              Hari ini nggak jajan 😎
            </Button>
          }
        />
      )}

      {/* Navigasi hari */}
      <Card className="p-2">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Hari sebelumnya" className="grid size-11 place-items-center rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => pilihHari(addDays(hari, -1))}>
            <ChevronLeft size={22} />
          </button>
          <button type="button" className="flex flex-col items-center rounded-xl px-3 py-1" onClick={() => setLihatKalender((v) => !v)}>
            <span className="flex items-center gap-1.5 font-semibold">
              {labelHari(hari, today)} <CalendarDays size={16} className="text-zinc-400 lg:hidden" />
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{tanggal(hari, { hari: true })}</span>
          </button>
          <button
            type="button"
            aria-label="Hari berikutnya"
            disabled={isHariIni}
            className="grid size-11 place-items-center rounded-2xl hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            onClick={() => pilihHari(addDays(hari, 1))}
          >
            <ChevronRight size={22} />
          </button>
        </div>
        {lihatKalender && (
          <div className="border-t border-zinc-100 p-2 pt-3 lg:hidden dark:border-zinc-800">
            <MiniKalender data={data} today={today} bulan={bulanKal} onBulan={setBulanKal} dipilih={hari} onPilih={pilihHari} />
          </div>
        )}
      </Card>

      {/* Rekap harian */}
      <Card>
        <p className="text-lg font-semibold">
          {isHariIni ? 'Hari ini' : labelHari(hari, today)} <span className="tabular">{rupiah(a.terpakai)}</span>{' '}
          <span className="font-medium text-zinc-500 dark:text-zinc-400">dari jatah {rupiah(a.jatah)}</span> {lewat ? '⚠️' : '✅'}
        </p>
        <ProgressBar value={pakai} tone={lewat ? 'danger' : pakai >= 0.8 ? 'warn' : 'ok'} className="my-2" />
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {lewat
            ? `Lewat ${rupiah(a.terpakai - a.jatah)}. Gapapa, jatah hari-hari berikutnya otomatis menyesuaikan 🙂`
            : isHariIni
              ? `Masih ada ${rupiah(a.sisaJatah)} buat hari ini.`
              : `Hemat ${rupiah(a.sisaJatah)} dari jatah. Mantap! 👏`}
        </p>
        {a.pokokDitanggung > 0 && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {rupiah(a.pokokDitanggung)} kebutuhan pokok diambil dari dana pokok, tidak memotong jatah.
          </p>
        )}

        <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
          {pengeluaran.length === 0 && pemasukanHari.length === 0 && (
            <Empty emoji={isHariIni ? '🌤️' : '📭'} title={isHariIni ? 'Belum ada catatan hari ini' : 'Tidak ada catatan'}>
              {isHariIni ? 'Ketuk "Pengeluaran" di atas buat mencatat.' : null}
            </Empty>
          )}
          {pemasukanHari.map((i) => (
            <Row
              key={`i${i.id}`}
              left={sumberInfo(i.sumber).emoji}
              title={i.catatan || i.sumber}
              subtitle={i.catatan ? i.sumber : 'Pemasukan'}
              right={<span className="tabular font-semibold text-brand-700 dark:text-brand-400">+{rupiah(i.nominal)}</span>}
              onClick={() => buka.pemasukan(i)}
            />
          ))}
          {pengeluaran.map((e) => (
            <Row
              key={e.id}
              left={kategoriInfo(e.kategori).emoji}
              title={e.catatan || e.kategori}
              subtitle={
                <span className="flex items-center gap-1.5">
                  {e.catatan ? e.kategori : null}
                  <Chip tone={e.jenis === 'pengen' ? 'warn' : 'info'} className="px-1.5 py-0 text-[10px]">
                    {e.jenis === 'pengen' ? 'Pengen' : 'Butuh'}
                  </Chip>
                </span>
              }
              right={<span className="tabular font-semibold">−{rupiah(e.nominal)}</span>}
              onClick={() => buka.pengeluaran(e)}
            />
          ))}
        </div>
      </Card>

      </div>

      <div className="space-y-4 lg:col-span-5">
      <Card className="hidden lg:block">
        <MiniKalender data={data} today={today} bulan={bulanKal} onBulan={setBulanKal} dipilih={hari} onPilih={pilihHari} />
      </Card>

      {/* Budget mingguan */}
      {budgets.length > 0 && (
        <Card>
          <CardTitle>Budget minggu ini</CardTitle>
          <div className="space-y-3">
            {budgets.map((b) => (
              <div key={b.kategori}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">
                    {kategoriInfo(b.kategori).emoji} {b.kategori}
                  </span>
                  <span className={cx('tabular', b.st.kode === 'lewat' && 'font-semibold text-rose-600 dark:text-rose-400')}>
                    {rupiah(b.terpakai)} / {rupiah(b.batasMingguan)}
                  </span>
                </div>
                <ProgressBar value={b.st.rasio} tone={b.st.kode === 'lewat' ? 'danger' : b.st.kode === 'hampir' ? 'warn' : 'ok'} />
                {b.st.kode !== 'aman' && (
                  <p className={cx('mt-1 text-xs', b.st.kode === 'lewat' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}>
                    {b.st.kode === 'lewat' ? `Lewat ${rupiah(-b.st.sisa)} dari batas` : `Tinggal ${rupiah(b.st.sisa)}, hati-hati ya`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Butuh vs Pengen */}
      <Card>
        <CardTitle>Butuh vs Pengen</CardTitle>
        <Segmented
          options={[
            { value: 'minggu', label: 'Minggu ini' },
            { value: 'bulan', label: 'Bulan ini' },
          ]}
          value={rentang}
          onChange={setRentang}
          className="mb-3"
        />
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          {rentang === 'minggu'
            ? `${tanggal(mulai, { pendek: true, tahun: false })} – ${tanggal(akhir, { pendek: true })}`
            : namaBulan(monthKey(hari))}
        </p>
        {totalBp === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Belum ada pengeluaran di periode ini.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div className="bg-sky-500" style={{ width: `${(bp.butuh / totalBp) * 100}%` }} />
              <div className="bg-amber-500" style={{ width: `${(bp.pengen / totalBp) * 100}%` }} />
            </div>
            <div className="tabular mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <span className="size-2.5 rounded-full bg-sky-500" /> Butuh
                </p>
                <p className="text-lg font-semibold">{rupiah(bp.butuh)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <span className="size-2.5 rounded-full bg-amber-500" /> Pengen
                </p>
                <p className="text-lg font-semibold">{rupiah(bp.pengen)}</p>
              </div>
            </div>
            <PerKategori expenses={data.expenses} mulai={mulai} akhir={akhir} />
          </>
        )}
      </Card>

      {/* Riwayat pemasukan */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">Pemasukan</h2>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Bulan sebelumnya" className="grid size-8 place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setBulanPemasukan((b) => addMonths(b, -1))}>
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-28 text-center text-sm font-semibold">{namaBulan(bulanPemasukan, { pendek: true })}</span>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              disabled={bulanPemasukan >= monthKey(today)}
              className="grid size-8 place-items-center rounded-full hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              onClick={() => setBulanPemasukan((b) => addMonths(b, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <p className="tabular mb-1 text-lg font-semibold text-brand-700 dark:text-brand-400">+{rupiah(jumlah(pemasukanBulan))}</p>
        {pemasukanBulan.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Belum ada pemasukan di bulan ini.</p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {pemasukanBulan.map((i) => (
              <Row
                key={i.id}
                left={sumberInfo(i.sumber).emoji}
                title={i.catatan || i.sumber}
                subtitle={`${tanggal(i.tanggal, { pendek: true, tahun: false })}${i.catatan ? ` · ${i.sumber}` : ''}`}
                right={<span className="tabular font-semibold">{rupiah(i.nominal)}</span>}
                onClick={() => buka.pemasukan(i)}
              />
            ))}
          </div>
        )}
      </Card>
      </div>
      </div>
    </div>
  )
}

function PerKategori({ expenses, mulai, akhir }) {
  const list = KATEGORI.map((k) => ({
    ...k,
    total: jumlah(expenses.filter((e) => e.kategori === k.id && e.tanggal >= mulai && e.tanggal <= akhir)),
  }))
    .filter((k) => k.total > 0)
    .sort((a, b) => b.total - a.total)
  const maks = list[0]?.total || 1
  return (
    <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      {list.map((k) => (
        <div key={k.id} className="flex items-center gap-2 text-sm">
          <span className="w-6 text-center">{k.emoji}</span>
          <span className="w-28 truncate">{k.id}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-zinc-400 dark:bg-zinc-500" style={{ width: `${(k.total / maks) * 100}%` }} />
          </div>
          <span className="tabular w-24 text-right font-semibold">{rupiah(k.total)}</span>
        </div>
      ))}
    </div>
  )
}
