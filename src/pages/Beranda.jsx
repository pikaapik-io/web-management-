import { ArrowUpRight, CalendarClock, Check, ChevronDown, Flame, Hourglass, Minus, MoreHorizontal, PiggyBank, Plus, Receipt, ShoppingBag, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarBulanan, Donut } from '../components/charts'
import KartuUtang from '../components/KartuUtang'
import { BayarSheet } from '../components/LoanSheets'
import { Banner, Button, Card, CardTitle, Chip, cx, Empty, kartuCls, ProgressBar } from '../components/ui'
import { useApp } from '../context'
import { usePengingat } from '../hooks/usePengingat'
import { hitungAnggaran, jumlah } from '../lib/budget'
import { KATEGORI } from '../lib/constants'
import { addMonths, diffDays, monthKey } from '../lib/dates'
import { BULAN_PENDEK, hitungMundur, namaBulan, rupiah, tanggal } from '../lib/format'
import { belumDibayar, rekapBulanAktif, rekapPerBulan, ringkasanUtang, semuaJadwal } from '../lib/loans'
import { hitungStreak } from '../lib/streak'
import { unduhICS } from '../lib/unduh'
import { PesanSemangat } from './Cicilan'

const sapaan = (jam) => (jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam')
const bulanPendek = (mk) => BULAN_PENDEK[Number(mk.slice(5, 7)) - 1]

export default function Beranda() {
  const { data, today, now, buka } = useApp()
  const pengingat = usePengingat()
  const [bayarId, setBayarId] = useState(null)

  const a = useMemo(() => hitungAnggaran(data, today), [data, today])
  const utang = ringkasanUtang(data.loans)
  const belumAdaPemasukan = data.incomes.length === 0
  const nama = data.settings.nama?.trim()
  const loanBayar = bayarId ? data.loans.find((l) => l.id === bayarId) : null

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight lg:text-4xl">
          {sapaan(now.getHours())}
          {nama ? `, ${nama}` : ''} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {tanggal(today, { hari: true })} · Pantau cicilan, jatah harian, dan progres lunasmu.
        </p>
      </header>

      {belumAdaPemasukan && <Onboarding />}

      {(pengingat.length > 0 || (!belumAdaPemasukan && (a.kurangCicilan > 0 || a.kurangPokok > 0))) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {!belumAdaPemasukan && a.kurangCicilan > 0 && (
            <Banner tone="danger" icon="⚠️" title={`Uangmu kurang ${rupiah(a.kurangCicilan)} buat cicilan`}>
              Ada {rupiah(a.kunciCicilan)} cicilan yang jatuh tempo sebelum {tanggal(a.periode.berikut, { pendek: true, tahun: false })},
              uangmu sekarang {rupiah(Math.max(0, a.uangSekarang))}. Tahan jajan dulu ya, atau cari pemasukan tambahan. Kamu bisa! 💪
            </Banner>
          )}
          {!belumAdaPemasukan && a.kurangPokok > 0 && (
            <Banner tone="warn" icon="🧺" title={`Cicilan aman, tapi dana kebutuhan pokok kurang ${rupiah(a.kurangPokok)}`}>
              Coba cek lagi pengeluaran yang bisa ditunda minggu ini.
            </Banner>
          )}
          {pengingat.map((p) => (
            <Banner key={p.id} tone={p.tone} icon={p.icon} title={p.title} actions={p.actions}>
              {p.body}
            </Banner>
          ))}
        </div>
      )}

      {/* Urutan DOM = urutan laptop; `order-*` mengatur prioritas di HP. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        <KartuJatah a={a} belumAdaPemasukan={belumAdaPemasukan} className="order-1 md:col-span-2 lg:order-none lg:col-span-8" />
        <KartuHemat className="order-4 lg:order-none lg:col-span-4" />
        <KartuTerdekat onBayar={setBayarId} className="order-3 lg:order-none lg:col-span-4" />
        <KartuPengeluaran className="order-7 lg:order-none lg:col-span-4" />
        <KartuCicilanBulan className="order-5 lg:order-none lg:col-span-4" />
        <KartuArus utang={utang} className="order-8 md:col-span-2 lg:order-none lg:col-span-8 lg:row-span-2" />
        <KartuProgres utang={utang} className="order-6 lg:order-none lg:col-span-4" />
        <KartuMauBeli className="order-2 lg:order-none lg:col-span-4" onClick={buka.mauBeli} />
      </div>

      {loanBayar && <BayarSheet loan={loanBayar} onClose={() => setBayarId(null)} />}
    </div>
  )
}

function Onboarding() {
  const { buka, goTo } = useApp()
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-forest p-5 text-white sm:p-6 dark:bg-[linear-gradient(120deg,#2a2a4a,#1b1c26)] dark:ring-1 dark:ring-white/10">
      <Bintang className="pointer-events-none absolute -top-8 -right-8 size-40 text-brand-300/15" />
      <p className="text-lg font-semibold">Mulai dari sini, yuk 👇</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-white/80">
        <li>Catat uang yang kamu pegang sekarang sebagai pemasukan (sumber "Lainnya", catatan "Saldo awal").</li>
        <li>Atur pemasukan rutin (misal gaji tiap tgl 25) dan kebutuhan pokok di Pengaturan.</li>
        <li>Catat pengeluaran tiap hari. Jatah harianmu dihitung otomatis.</li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => buka.pemasukan({ sumber: 'Lainnya', catatan: 'Saldo awal' })}>
          Catat saldo awal
        </Button>
        <Button size="sm" variant="plain" className="bg-white/10 text-white hover:bg-white/20" onClick={() => goTo('pengaturan')}>
          Ke Pengaturan
        </Button>
      </div>
    </section>
  )
}

/** Kartu utama: jatah aman hari ini. Putih di mode terang, gradasi hijau-kuning di mode gelap. */
function KartuJatah({ a, belumAdaPemasukan, className }) {
  const { buka, goTo } = useApp()
  const [rincian, setRincian] = useState(false)
  const pakai = a.jatah > 0 ? a.terpakai / a.jatah : a.terpakai > 0 ? 1.01 : 0
  const lewat = a.sisaJatah < 0
  const redup = 'text-zinc-500 dark:text-ink/65'

  return (
    <section
      className={cx(
        kartuCls,
        'relative overflow-hidden p-5 sm:p-6',
        'dark:bg-[linear-gradient(120deg,#3fd3a4_0%,#a2e27a_55%,#eaee7c_100%)] dark:text-ink dark:ring-0',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="inline-flex rounded-full bg-zinc-100 p-1 text-xs font-semibold whitespace-nowrap dark:bg-black/10">
          <span className="rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-ink dark:text-white">Hari ini</span>
          <span className={cx('px-3 py-1.5', redup)}>
            {a.sisaHari} hari s/d {tanggal(a.hariTerakhir, { pendek: true, tahun: false })}
          </span>
        </div>
        <div className="sm:text-right">
          <p className={cx('text-xs', redup)}>Uang kamu sekarang</p>
          <p className="font-semibold">{rupiah(a.uangSekarang)}</p>
        </div>
      </div>

      <p className={cx('mt-6 text-sm', redup)}>Jatah aman hari ini</p>
      <p
        className={cx(
          'text-5xl font-medium tracking-tight sm:text-6xl',
          a.jatah === 0 && !belumAdaPemasukan && 'text-rose-600 dark:text-rose-800',
        )}
      >
        {rupiah(a.jatah)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {lewat ? (
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-900 dark:text-white">
            Lewat {rupiah(-a.sisaJatah)}
          </span>
        ) : (
          <span className="rounded-full bg-brand-300 px-2.5 py-0.5 text-xs font-semibold text-ink dark:bg-ink dark:text-brand-300">
            Sisa {rupiah(a.sisaJatah)}
          </span>
        )}
        <span className={redup}>
          Terpakai {rupiah(a.terpakai)}
          {a.periode.sumber ? ` · ${a.periode.sumber.nama} masuk ${tanggal(a.periode.berikut, { pendek: true, tahun: false })}` : ''}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-black/10">
        <div
          className={cx(
            'h-full rounded-full transition-[width] duration-500',
            pakai > 1 ? 'bg-rose-500' : pakai >= 0.8 ? 'bg-amber-500' : 'bg-brand-400 dark:bg-ink',
          )}
          style={{ width: `${Math.min(1, pakai) * 100}%` }}
        />
      </div>

      {rincian && (
        <dl className="tabular mt-4 grid gap-1.5 rounded-2xl bg-zinc-50 p-3 text-sm dark:bg-white/40">
          <Baris label="Uang kamu sekarang" value={rupiah(a.uangSekarang)} />
          <Baris label={`Dikunci buat cicilan (${a.cicilanDikunci.length})`} value={`− ${rupiah(a.kunciCicilan)}`} />
          {a.totalPokok > 0 && <Baris label="Dana kebutuhan pokok" value={`− ${rupiah(a.kunciPokok)}`} />}
          <div className="border-t border-zinc-200 pt-1.5 dark:border-ink/15">
            <Baris label="Bebas dipakai" value={rupiah(a.bebas)} tebal />
          </div>
          {a.jatahBesok != null && (
            <p className="pt-1 text-xs text-zinc-500 dark:text-ink/70">
              Kalau pengeluaran hari ini berhenti di sini, jatah besok jadi <b>{rupiah(a.jatahBesok)}</b>.
            </p>
          )}
        </dl>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Button
          variant="plain"
          className="bg-forest px-3 text-sm text-white hover:bg-forest/90 sm:px-5 sm:text-base dark:bg-ink dark:hover:bg-ink/85"
          onClick={() => buka.pengeluaran()}
        >
          <Minus size={18} /> Pengeluaran
        </Button>
        <Button
          variant="plain"
          className="px-3 text-sm text-zinc-800 ring-1 ring-zinc-300 ring-inset hover:bg-zinc-50 sm:px-5 sm:text-base dark:bg-white dark:text-ink dark:ring-0 dark:hover:bg-white/80"
          onClick={() => buka.pemasukan()}
        >
          <Plus size={18} /> Pemasukan
        </Button>
        </div>
        <button
          type="button"
          onClick={() => setRincian((v) => !v)}
          aria-expanded={rincian}
          className={cx('inline-flex h-12 items-center gap-1 rounded-full px-3 text-sm font-semibold', redup, 'hover:text-zinc-900 dark:hover:text-ink')}
        >
          Rincian <ChevronDown size={16} className={cx('transition', rincian && 'rotate-180')} />
        </button>
        <button
          type="button"
          onClick={() => goTo('catat')}
          aria-label="Lihat catatan hari ini"
          className="ml-auto grid size-14 place-items-center rounded-full bg-brand-300 text-ink transition hover:bg-brand-400 active:scale-95 dark:bg-white"
        >
          <ArrowUpRight size={24} />
        </button>
      </div>
    </section>
  )
}

function Baris({ label, value, tebal }) {
  return (
    <div className={cx('flex justify-between gap-3', tebal && 'font-semibold')}>
      <dt className={tebal ? '' : 'text-zinc-500 dark:text-ink/70'}>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function Bintang({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M50 0C54 36 64 46 100 50 64 54 54 64 50 100 46 64 36 54 0 50 36 46 46 36 50 0Z" fill="currentColor" />
    </svg>
  )
}

/** Kartu lime: uang diselamatkan, streak, wishlist. */
function KartuHemat({ className }) {
  const { data, today, goTo } = useApp()
  const total = jumlah(data.savings, (s) => s.harga)
  const bulanIni = jumlah(data.savings.filter((s) => monthKey(s.tanggal) === monthKey(today)), (s) => s.harga)
  const streak = hitungStreak(data.expenses, data.settings.mulaiPakai, today)
  const menunggu = data.wishlist.filter((w) => w.status === 'menunggu' || w.status === 'boleh beli').length

  return (
    <section
      className={cx(
        'relative isolate overflow-hidden rounded-[1.75rem] bg-brand-300 p-5 text-ink sm:p-6',
        'dark:bg-zinc-900/80 dark:text-zinc-100 dark:ring-1 dark:ring-white/[0.08] dark:backdrop-blur-xl',
        className,
      )}
    >
      <Bintang className="pointer-events-none absolute -top-10 -right-10 -z-10 size-52 text-brand-200 dark:text-lav-500/15" />
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-forest py-1 pr-1 pl-3.5 text-xs font-semibold tracking-wider text-brand-200 uppercase dark:bg-brand-300 dark:text-ink">
          Hemat
          <span className="grid size-6 place-items-center rounded-full bg-brand-300 text-ink dark:bg-ink dark:text-brand-300">
            <PiggyBank size={14} />
          </span>
        </span>
        <button
          type="button"
          aria-label="Buka wishlist"
          onClick={() => goTo('wishlist')}
          className="grid size-9 place-items-center rounded-full bg-white/50 hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <p className="mt-6 text-sm opacity-75">Uang berhasil diselamatkan</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-4xl font-medium tracking-tight">{rupiah(total)}</p>
        {bulanIni > 0 && (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-300/15 dark:text-brand-300">
            +{rupiah(bulanIni)} bulan ini
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/50 p-3 dark:bg-white/[0.05]">
          <p className="flex items-center gap-1.5 text-xs opacity-75">
            <Flame size={14} /> Streak hemat
          </p>
          <p className="mt-1 text-xl font-semibold">{streak.sekarang} hari</p>
          <p className="text-[11px] opacity-70">{streak.hariIniPengen ? 'Besok mulai lagi ya!' : `Terbaik ${streak.terbaik} hari`}</p>
        </div>
        <button type="button" onClick={() => goTo('wishlist')} className="rounded-2xl bg-white/50 p-3 text-left hover:bg-white/70 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]">
          <p className="flex items-center gap-1.5 text-xs opacity-75">
            <Hourglass size={14} /> Wishlist
          </p>
          <p className="mt-1 text-xl font-semibold">{menunggu} barang</p>
          <p className="text-[11px] opacity-70">lagi ditunda</p>
        </button>
      </div>
    </section>
  )
}

/** Daftar cicilan terdekat; item pertama bisa langsung ditandai lunas. */
function KartuTerdekat({ onBayar, className }) {
  const { data, today, goTo } = useApp()
  const list = belumDibayar(data.loans).slice(0, 5)
  const [pertama, ...lain] = list
  const nadaHari = (h) => (h < 0 ? 'text-rose-600 dark:text-rose-400' : h <= 3 ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400')
  const Avatar = () => (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200">
      SP
    </span>
  )

  return (
    <Card className={className}>
      <CardTitle
        icon={<CalendarClock size={18} />}
        right={
          <button
            type="button"
            aria-label="Semua cicilan"
            onClick={() => goTo('cicilan')}
            className="grid size-9 place-items-center rounded-full ring-1 ring-zinc-200 hover:bg-zinc-50 dark:ring-white/15 dark:hover:bg-white/5"
          >
            <MoreHorizontal size={18} />
          </button>
        }
      >
        Jatuh tempo terdekat
      </CardTitle>
      {!pertama ? (
        <Empty emoji="🎉" title="Semua cicilan lunas!" />
      ) : (
        <>
          {(() => {
            const h = diffDays(pertama.due, today)
            return (
              <div
                className={cx(
                  'flex items-center gap-3 rounded-2xl p-3 ring-1',
                  h < 0
                    ? 'bg-rose-50 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-500/30'
                    : h <= 3
                      ? 'bg-amber-50 ring-amber-200 dark:bg-amber-400/10 dark:ring-amber-400/30'
                      : 'bg-zinc-50 ring-zinc-200 dark:bg-white/[0.04] dark:ring-white/10',
                )}
              >
                <Avatar />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {pertama.nama} <span className="font-medium">{rupiah(pertama.nominal)}</span>
                  </p>
                  <p className={cx('truncate text-xs font-medium', nadaHari(h))}>
                    {tanggal(pertama.due, { pendek: true, tahun: false })} · {hitungMundur(h)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Sudah bayar ${pertama.nama}`}
                  title="Sudah bayar"
                  onClick={() => onBayar(pertama.loanId)}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-300 text-ink transition hover:bg-brand-400 active:scale-95"
                >
                  <Check size={20} strokeWidth={2.6} />
                </button>
              </div>
            )
          })()}
          <ul className="mt-1 divide-y divide-zinc-100 dark:divide-white/[0.06]">
            {lain.map((i) => {
              const h = diffDays(i.due, today)
              return (
                <li key={`${i.loanId}-${i.ke}`} className="flex items-center gap-3 py-2.5">
                  <Avatar />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{i.nama}</p>
                    <p className={cx('truncate text-xs', nadaHari(h))}>
                      {tanggal(i.due, { pendek: true, tahun: false })} · {hitungMundur(h)}
                    </p>
                  </div>
                  <span className="tabular text-sm font-semibold">−{rupiah(i.nominal)}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}

/** Donut pengeluaran per kategori bulan ini. */
function KartuPengeluaran({ className }) {
  const { data, today } = useApp()
  const bulan = monthKey(today)
  const bulanLalu = addMonths(bulan, -1)
  const diBulan = data.expenses.filter((e) => monthKey(e.tanggal) === bulan)
  const total = jumlah(diBulan)
  const totalLalu = jumlah(data.expenses.filter((e) => monthKey(e.tanggal) === bulanLalu))
  const pengen = jumlah(diBulan.filter((e) => e.jenis === 'pengen'))
  const items = KATEGORI.map((k) => ({
    id: k.id,
    label: k.id,
    warna: k.warna,
    nilai: jumlah(diBulan.filter((e) => e.kategori === k.id)),
  }))
  const delta = totalLalu ? ((total - totalLalu) / totalLalu) * 100 : null

  return (
    <Card className={className}>
      <CardTitle icon={<Receipt size={18} />} right={<Chip>{namaBulan(bulan, { pendek: true })}</Chip>}>
        Pengeluaran
      </CardTitle>
      {total === 0 ? (
        <Empty emoji="🌤️" title="Belum ada pengeluaran bulan ini" />
      ) : (
        <>
          <Donut
            items={items}
            total={total}
            bawahTengah={
              delta != null && (
                <span className={cx('text-xs font-semibold', delta > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-brand-700 dark:text-brand-300')}>
                  {delta > 0 ? '+' : ''}
                  {Math.round(delta)}% vs {bulanPendek(bulanLalu)}
                </span>
              )
            }
          />
          <p className="mt-4 rounded-full bg-zinc-50 px-3 py-1.5 text-center text-xs text-zinc-600 ring-1 ring-zinc-200 dark:bg-white/[0.04] dark:text-zinc-300 dark:ring-white/10">
            ✨ Yang "pengen" <b>{Math.round((pengen / total) * 100)}%</b> dari pengeluaran bulan ini
          </p>
        </>
      )}
    </Card>
  )
}

/** Cicilan bulan aktif, dibagi per minggu jatuh tempo. */
function KartuCicilanBulan({ className }) {
  const { data, today } = useApp()
  const r = rekapBulanAktif(data.loans, today)
  if (!r) return null
  const cicilan = semuaJadwal(data.loans).filter((i) => i.bulan === r.bulan)
  const tglHariIni = monthKey(today) === r.bulan ? Number(today.slice(8)) : null
  const blok = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, 31],
  ].map(([dari, sampai]) => {
    const isi = cicilan.filter((i) => {
      const d = Number(i.due.slice(8))
      return d >= dari && d <= sampai
    })
    return {
      label: `Tgl ${dari}–${sampai === 31 ? 'akhir' : sampai}`,
      total: jumlah(isi),
      dibayar: jumlah(isi.filter((i) => i.paid)),
      sekarang: tglHariIni != null && tglHariIni >= dari && tglHariIni <= sampai,
    }
  })

  return (
    <Card className={className}>
      <CardTitle
        icon={<Wallet size={18} />}
        right={
          <span className="border-b-2 border-orange-500 pb-0.5 text-sm font-semibold">
            {r.jumlahDibayar}/{r.jumlah} lunas
          </span>
        }
      >
        Cicilan {namaBulan(r.bulan, { pendek: true })}
      </CardTitle>
      <p className="text-3xl font-medium tracking-tight">{rupiah(r.dibayar)}</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        sudah dibayar dari <b className="font-semibold text-zinc-700 dark:text-zinc-200">{rupiah(r.total)}</b>
      </p>
      <div className="mt-4 space-y-3">
        {blok.map((b) => {
          const rasio = b.total ? b.dibayar / b.total : 0
          return (
            <div key={b.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className={b.sekarang ? 'font-semibold' : 'text-zinc-500 dark:text-zinc-400'}>{b.label}</span>
                <span className="tabular text-zinc-500 dark:text-zinc-400">{b.total ? rupiah(b.total) : '—'}</span>
              </div>
              <div className="relative h-2 rounded-full bg-zinc-100 dark:bg-white/10">
                <div className="h-full rounded-full bg-brand-400 dark:bg-brand-300" style={{ width: `${rasio * 100}%` }} />
                {b.sekarang && b.total > 0 && (
                  <span
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-forest px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-white dark:text-ink"
                    style={{ left: `clamp(1.25rem, ${rasio * 100}%, calc(100% - 1.25rem))` }}
                  >
                    {Math.round(rasio * 100)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/** Grafik batang: cicilan / pengeluaran / pemasukan per bulan. */
function KartuArus({ utang, className }) {
  const { data, today } = useApp()
  const [mode, setMode] = useState('cicilan')

  const { seri, aktif, angka, keterangan } = useMemo(() => {
    const bulanIni = monthKey(today)
    if (mode === 'cicilan') {
      const rekap = rekapPerBulan(data.loans)
      return {
        seri: rekap.map((r) => ({
          key: r.bulan,
          label: bulanPendek(r.bulan),
          labelPanjang: namaBulan(r.bulan),
          nilai: r.total,
          sub: `${r.jumlahDibayar}/${r.jumlah} lunas`,
        })),
        aktif: rekapBulanAktif(data.loans, today)?.bulan,
        angka: utang.sisa,
        keterangan: 'Sisa cicilan yang harus dibayar',
      }
    }
    const sumber = mode === 'pengeluaran' ? data.expenses : data.incomes
    const bulan = Array.from({ length: 6 }, (_, i) => addMonths(bulanIni, i - 5))
    const seri = bulan.map((b) => ({
      key: b,
      label: bulanPendek(b),
      labelPanjang: namaBulan(b),
      nilai: jumlah(sumber.filter((x) => monthKey(x.tanggal) === b)),
    }))
    return {
      seri,
      aktif: bulanIni,
      angka: jumlah(seri),
      keterangan: `Total ${mode} 6 bulan terakhir`,
    }
  }, [mode, data, today, utang.sisa])

  return (
    <Card className={cx('flex flex-col', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Arus uang</h2>
          <p className="mt-1 text-3xl font-medium tracking-tight">{rupiah(angka)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{keterangan}</p>
        </div>
        <div className="w-full sm:w-auto">
          <SegmentedKecil
            value={mode}
            onChange={setMode}
            options={[
              { value: 'cicilan', label: 'Cicilan' },
              { value: 'pengeluaran', label: 'Pengeluaran' },
              { value: 'pemasukan', label: 'Pemasukan' },
            ]}
          />
        </div>
      </div>
      <BarBulanan key={mode} data={seri} aktif={aktif} judul={`Arus uang: ${mode} per bulan`} className="flex-1" isi />
    </Card>
  )
}

function SegmentedKecil({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-white/[0.06]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-8 flex-1 rounded-full px-3 text-xs font-semibold transition sm:flex-none',
            value === o.value ? 'bg-white text-ink shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Kartu progres utang + aksi. */
function KartuProgres({ utang, className }) {
  const { data, today, goTo, toast } = useApp()
  const ekspor = () => {
    const n = unduhICS(data.loans, today)
    toast(n ? `File kalender diunduh (${n} jadwal) 📅` : 'Tidak ada jadwal cicilan ke depan')
  }
  return (
    <Card className={className}>
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
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={() => goTo('cicilan')}>Bayar cicilan</Button>
        <Button variant="secondary" onClick={ekspor}>
          Ke kalender
        </Button>
      </div>
    </Card>
  )
}

/** CTA besar "Mau beli sesuatu?". */
function KartuMauBeli({ className, onClick }) {
  return (
    <section className={cx(kartuCls, 'relative isolate overflow-hidden p-5 sm:p-6', className)}>
      <Bintang className="pointer-events-none absolute -right-6 -bottom-8 -z-10 size-32 text-brand-100 dark:text-brand-300/10" />
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-800 dark:bg-brand-300/15 dark:text-brand-300">
          <ShoppingBag size={24} />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Mau beli sesuatu?</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cek dulu dampaknya ke cicilan & jatah harianmu sebelum bayar.</p>
        </div>
      </div>
      <Button size="lg" className="mt-5 w-full" onClick={onClick}>
        Cek dampaknya dulu
      </Button>
    </section>
  )
}
