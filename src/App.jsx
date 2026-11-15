import { useLiveQuery } from 'dexie-react-hooks'
import { Bell, Heart, House, NotebookPen, Settings, UserRound, Wallet } from 'lucide-react'
import { Component, useCallback, useEffect, useMemo, useState } from 'react'
import ExpenseSheet from './components/ExpenseSheet'
import IncomeSheet from './components/IncomeSheet'
import MauBeliSheet from './components/MauBeliSheet'
import { cx } from './components/ui'
import { AppContext, useApp } from './context'
import { muatSemua, simpanSetting } from './db'
import { usePengingat } from './hooks/usePengingat'
import { addDays, toYMD } from './lib/dates'
import { statusCicilan } from './lib/loans'
import Beranda from './pages/Beranda'
import Catat from './pages/Catat'
import Cicilan from './pages/Cicilan'
import Pengaturan from './pages/Pengaturan'
import Wishlist from './pages/Wishlist'

const TABS = [
  { id: 'beranda', label: 'Beranda', icon: House, Page: Beranda },
  { id: 'cicilan', label: 'Cicilan', icon: Wallet, Page: Cicilan },
  { id: 'catat', label: 'Catat', icon: NotebookPen, Page: Catat },
  { id: 'wishlist', label: 'Wishlist', icon: Heart, Page: Wishlist },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings, Page: Pengaturan },
]
const TAB_IDS = TABS.map((t) => t.id)
const tabDariHash = () => {
  const h = location.hash.slice(1)
  return TAB_IDS.includes(h) ? h : 'beranda'
}

/** Waktu sekarang, diperbarui tiap menit dan saat aplikasi dibuka lagi. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const t = setInterval(tick, 60_000)
    const onVis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return now
}

/**
 * Tab disimpan di hash URL. Dari Beranda ke tab lain menambah satu riwayat,
 * jadi tombol "kembali" di Android membawa ke Beranda dulu sebelum keluar aplikasi.
 */
function useTab() {
  const [tab, setTab] = useState(tabDariHash)
  useEffect(() => {
    const onPop = () => setTab(tabDariHash())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const goTo = useCallback((next) => {
    const cur = tabDariHash()
    window.scrollTo(0, 0)
    if (next === cur) return
    if (cur === 'beranda') history.pushState({ tab: next }, '', `#${next}`)
    else if (next === 'beranda' && history.state?.tab) return history.back()
    else history.replaceState({ tab: next }, '', next === 'beranda' ? location.pathname + location.search : `#${next}`)
    setTab(next)
  }, [])
  return [tab, goTo]
}

function useTema(tema) {
  useEffect(() => {
    try {
      localStorage.setItem('tema', tema)
    } catch {
      /* mode privat: abaikan */
    }
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const terapkan = () => {
      const gelap = tema === 'gelap' || (tema !== 'terang' && mq.matches)
      document.documentElement.classList.toggle('dark', gelap)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', gelap ? '#0b0c12' : '#e9e9e6')
    }
    terapkan()
    mq.addEventListener('change', terapkan)
    return () => mq.removeEventListener('change', terapkan)
  }, [tema])
}

function useToast() {
  const [toasts, setToasts] = useState([])
  const tutup = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback(
    (pesan, opsi = {}) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((t) => [...t.slice(-1), { id, pesan, ...opsi }])
      setTimeout(() => tutup(id), opsi.durasi || (opsi.aksi ? 5000 : 3500))
    },
    [tutup],
  )
  return { toasts, toast, tutup }
}

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="mb-3 text-5xl">😵</div>
        <h1 className="text-lg font-bold">Waduh, ada yang error</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Coba tutup lalu buka lagi aplikasinya. Kalau dibuka di mode penyamaran/incognito, penyimpanan data bisa diblokir browser.
        </p>
        <pre className="mt-4 overflow-auto rounded-xl bg-zinc-200 p-3 text-left text-xs dark:bg-zinc-800">{String(this.state.error?.message || this.state.error)}</pre>
        <button className="mt-4 rounded-full bg-brand-300 px-5 py-3 font-semibold text-ink" onClick={() => location.reload()}>
          Muat ulang
        </button>
      </div>
    )
  }
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="size-9 rounded-xl" />
      <span className="text-lg font-semibold tracking-tight whitespace-nowrap">Management Money</span>
    </span>
  )
}

/** Header: logo, tab pil (laptop), lonceng pengingat, avatar. */
function Header({ tab, goTo, titik }) {
  const { data } = useApp()
  const jumlahPengingat = usePengingat().length
  const nama = data.settings.nama?.trim()
  const tombolBulat =
    'relative grid size-10 place-items-center rounded-full bg-white ring-1 ring-black/[0.05] transition hover:bg-zinc-50 dark:bg-white/[0.06] dark:ring-white/10 dark:hover:bg-white/10'

  return (
    <header className="flex items-center gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] lg:px-0 lg:pt-0">
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => goTo('beranda')} aria-label="Ke Beranda" className="text-left">
          <Logo />
        </button>
      </div>

      <nav aria-label="Menu utama" className="hidden rounded-full bg-white p-1 ring-1 ring-black/[0.05] lg:flex dark:bg-white/[0.06] dark:ring-white/10">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => goTo(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={cx(
              'relative h-9 rounded-full px-4 text-sm font-medium transition',
              tab === id
                ? 'bg-brand-300 text-ink dark:bg-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
            )}
          >
            {label}
            {titik[id] && <span className={cx('absolute top-1.5 right-1.5 size-2 rounded-full', titik[id])} />}
          </button>
        ))}
      </nav>

      <div className="flex shrink-0 items-center justify-end gap-2 lg:flex-1">
        <button
          type="button"
          className={tombolBulat}
          aria-label={jumlahPengingat ? `${jumlahPengingat} pengingat` : 'Tidak ada pengingat'}
          onClick={() => goTo('beranda')}
        >
          <Bell size={18} />
          {jumlahPengingat > 0 && (
            <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#e9e9e6] lg:ring-[#f4f4f1] dark:ring-zinc-950">
              {jumlahPengingat}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => goTo('pengaturan')}
          aria-label="Pengaturan profil"
          className="grid size-10 place-items-center rounded-full bg-brand-300 text-sm font-bold text-ink ring-2 ring-white transition hover:bg-brand-400 dark:ring-white/10"
        >
          {nama ? nama[0].toUpperCase() : <UserRound size={18} />}
        </button>
      </div>
    </header>
  )
}

/** Navigasi bawah mengambang (HP). */
function NavBawah({ tab, goTo, titik }) {
  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-[1.75rem] bg-white/90 p-1.5 shadow-lg shadow-black/10 ring-1 ring-black/5 backdrop-blur-xl lg:hidden dark:bg-zinc-900/90 dark:shadow-black/40 dark:ring-white/10"
    >
      <div className="grid grid-cols-5 gap-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const aktif = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => goTo(id)}
              aria-current={aktif ? 'page' : undefined}
              className={cx(
                'relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-[1.35rem] text-[10.5px] font-semibold transition',
                aktif ? 'bg-brand-300 text-ink dark:bg-white' : 'text-zinc-500 dark:text-zinc-400',
              )}
            >
              <Icon size={20} strokeWidth={aktif ? 2.4 : 2} />
              {label}
              {titik[id] && <span className={cx('absolute top-2 right-[calc(50%-1rem)] size-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900', titik[id])} />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function Aplikasi() {
  const data = useLiveQuery(muatSemua, [])
  const now = useNow()
  const today = toYMD(now)
  const [tab, goTo] = useTab()
  const { toasts, toast, tutup } = useToast()
  const [sheet, setSheet] = useState(null)
  useTema(data?.settings.tema || 'sistem')

  const buka = useMemo(
    () => ({
      pengeluaran: (awal) => setSheet({ jenis: 'pengeluaran', awal }),
      pemasukan: (awal) => setSheet({ jenis: 'pemasukan', awal }),
      mauBeli: () => setSheet({ jenis: 'mauBeli' }),
    }),
    [],
  )
  const tutupSheet = useCallback(() => setSheet(null), [])

  const ctx = useMemo(
    () => data && { data, today, now, goTo, buka, toast, setSetting: simpanSetting },
    [data, today, now, goTo, buka, toast],
  )

  // Titik penanda di menu
  const titik = useMemo(() => {
    if (!data) return {}
    const status = data.loans.map((l) => statusCicilan(l, today).kode)
    const tunggu = Number(data.settings.wishlistTunggu) || 0
    return {
      cicilan: status.includes('telat') ? 'bg-rose-500' : status.includes('dekat') ? 'bg-amber-500' : null,
      wishlist: data.wishlist.some((w) => w.status === 'menunggu' && addDays(w.tanggalDitambah, tunggu) <= today) ? 'bg-sky-500' : null,
    }
  }, [data, today])

  if (!ctx) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="size-16 animate-pulse" />
      </div>
    )
  }

  const { Page } = TABS.find((t) => t.id === tab)

  return (
    <AppContext.Provider value={ctx}>
      <div className="min-h-dvh lg:p-5 xl:p-8">
        <div className="mx-auto max-w-[88rem] lg:rounded-[2.5rem] lg:bg-[#f4f4f1] lg:p-7 lg:ring-1 lg:ring-black/[0.04] lg:dark:bg-white/[0.025] lg:dark:ring-white/[0.07] lg:dark:backdrop-blur-sm">
          <Header tab={tab} goTo={goTo} titik={titik} />
          <main className="mx-auto max-w-2xl px-4 pt-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:max-w-none lg:px-0 lg:pt-8 lg:pb-0">
            <Page key={tab} />
          </main>
        </div>
      </div>

      <NavBawah tab={tab} goTo={goTo} titik={titik} />

      <div className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-[60] mx-auto flex max-w-md flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx(
              'pointer-events-auto flex animate-toast items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg',
              t.tone === 'warn' ? 'bg-amber-400 text-amber-950' : 'bg-ink text-white dark:bg-white dark:text-ink',
            )}
          >
            <span className="flex-1">{t.pesan}</span>
            {t.aksi && (
              <button
                type="button"
                className="shrink-0 font-bold text-brand-300 underline underline-offset-2 dark:text-forest"
                onClick={() => {
                  t.aksi.onClick()
                  tutup(t.id)
                }}
              >
                {t.aksi.label}
              </button>
            )}
          </div>
        ))}
      </div>

      {sheet?.jenis === 'pengeluaran' && <ExpenseSheet open onClose={tutupSheet} awal={sheet.awal} />}
      {sheet?.jenis === 'pemasukan' && <IncomeSheet open onClose={tutupSheet} awal={sheet.awal} />}
      {sheet?.jenis === 'mauBeli' && <MauBeliSheet open onClose={tutupSheet} />}
    </AppContext.Provider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Aplikasi />
    </ErrorBoundary>
  )
}
