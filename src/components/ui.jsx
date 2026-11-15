import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { parseAngka, ribuan } from '../lib/format'

export const cx = (...a) => a.filter(Boolean).join(' ')

/** Permukaan kartu: putih di mode terang, "kaca" biru-gelap di mode gelap. */
export const kartuCls = 'rounded-[1.75rem] bg-white ring-1 ring-black/[0.04] dark:bg-zinc-900/80 dark:ring-white/[0.08] dark:backdrop-blur-xl'

export function Card({ className, children, ...rest }) {
  return (
    <section className={cx(kartuCls, 'p-4 sm:p-5', className)} {...rest}>
      {children}
    </section>
  )
}

/** Judul kartu dengan ikon bulat di kiri (gaya "Spending", "Earning"). */
export function CardTitle({ children, right, icon }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <IconBulat>{icon}</IconBulat>}
        <h2 className="truncate text-base font-semibold">{children}</h2>
      </div>
      {right}
    </div>
  )
}

export function IconBulat({ children, className }) {
  return (
    <span
      className={cx(
        'grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-zinc-200 text-zinc-700 dark:text-zinc-200 dark:ring-white/15',
        className,
      )}
    >
      {children}
    </span>
  )
}

const BTN = {
  primary: 'bg-brand-300 text-ink hover:bg-brand-400',
  dark: 'bg-forest text-white hover:bg-forest/90 dark:bg-white dark:text-ink dark:hover:bg-zinc-200',
  outline: 'text-zinc-800 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 dark:text-zinc-100 dark:ring-white/20 dark:hover:bg-white/5',
  secondary: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-white/[0.07] dark:text-zinc-100 dark:hover:bg-white/[0.12]',
  soft: 'bg-brand-100 text-brand-900 hover:bg-brand-200 dark:bg-brand-300/15 dark:text-brand-200 dark:hover:bg-brand-300/25',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  dangerSoft: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25',
  ghost: 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.07]',
  card: 'bg-white text-zinc-800 ring-1 ring-black/[0.04] hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-100 dark:ring-white/[0.08] dark:hover:bg-zinc-800',
  plain: '', // warna diatur sendiri lewat className
}

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }) {
  const sz = size === 'lg' ? 'h-14 px-6 text-base' : size === 'sm' ? 'h-9 px-3.5 text-sm' : 'h-12 px-5'
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition select-none active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        sz,
        BTN[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

const TONE = {
  info: 'bg-sky-50 text-sky-950 ring-sky-200 dark:bg-sky-400/10 dark:text-sky-100 dark:ring-sky-400/20',
  ok: 'bg-brand-50 text-brand-950 ring-brand-200 dark:bg-brand-300/10 dark:text-brand-100 dark:ring-brand-300/20',
  warn: 'bg-amber-50 text-amber-950 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/25',
  danger: 'bg-rose-50 text-rose-950 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-100 dark:ring-rose-500/30',
}

export function Banner({ tone = 'info', icon, title, children, actions }) {
  return (
    <div className={cx('rounded-[1.25rem] p-3.5 ring-1', TONE[tone])} role={tone === 'danger' ? 'alert' : undefined}>
      <div className="flex gap-3">
        {icon && <div className="mt-0.5 shrink-0 text-xl leading-none">{icon}</div>}
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className="text-sm opacity-90">{children}</div>}
          {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  )
}

const BAR = {
  ok: 'bg-brand-400 dark:bg-brand-300',
  warn: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-zinc-400 dark:bg-lav-500',
  ink: 'bg-ink dark:bg-white',
}

export function ProgressBar({ value, tone = 'ok', className }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100
  return (
    <div className={cx('h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10', className)}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', BAR[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

const CHIP = {
  ok: 'bg-brand-100 text-brand-800 dark:bg-brand-300/15 dark:text-brand-300',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
  neutral: 'bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-300',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300',
  lime: 'bg-brand-300 text-ink',
}

export function Chip({ tone = 'neutral', children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', CHIP[tone], className)}>
      {children}
    </span>
  )
}

/*
 * Tombol "kembali" di Android menutup sheet paling atas (bukan keluar aplikasi).
 * Selama ada sheet terbuka, cukup ada SATU entri riwayat tambahan. Entri itu baru
 * dibuang (history.back) setelah semua sheet tertutup, dicek di tick berikutnya,
 * supaya sheet yang langsung diganti sheet lain (misal Detail -> Edit) tidak ikut tertutup.
 */
const tumpukanSheet = []
let entriAktif = false
let pendengarTerpasang = false

function pasangEntri() {
  if (entriAktif) return
  history.pushState({ ...history.state, sheet: true }, '')
  entriAktif = true
}

function saatKembali() {
  if (!entriAktif) return // bukan untuk sheet (misal pindah tab)
  entriAktif = false
  tumpukanSheet[tumpukanSheet.length - 1]?.tutup()
}

function daftarkanSheet(tutup) {
  const item = { tutup }
  tumpukanSheet.push(item)
  if (!pendengarTerpasang) {
    window.addEventListener('popstate', saatKembali)
    pendengarTerpasang = true
  }
  pasangEntri()
  return () => {
    const i = tumpukanSheet.indexOf(item)
    if (i >= 0) tumpukanSheet.splice(i, 1)
    if (tumpukanSheet.length) return pasangEntri()
    setTimeout(() => {
      if (!tumpukanSheet.length && entriAktif) {
        entriAktif = false
        history.back()
      }
    }, 0)
  }
}

/** Bottom sheet di HP, modal di tengah layar di laptop. */
export function Sheet({ open, onClose, title, children, footer }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const tutup = () => onCloseRef.current()
    const lepas = daftarkanSheet(tutup)
    // Escape hanya menutup sheet paling atas
    const onKey = (e) => e.key === 'Escape' && tumpukanSheet[tumpukanSheet.length - 1]?.tutup === tutup && tutup()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      lepas()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-md animate-sheet flex-col rounded-t-[2rem] bg-white shadow-2xl ring-1 ring-black/5 lg:max-h-[88vh] lg:max-w-lg lg:animate-pop lg:rounded-[2rem] dark:bg-zinc-900 dark:ring-white/10">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-zinc-300 lg:hidden dark:bg-zinc-700" />
        <div className="flex items-center justify-between px-5 pt-2 pb-2 lg:px-6 lg:pt-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="-mr-2 grid size-10 place-items-center rounded-full text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-100 dark:ring-white/15 dark:hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>
        <div className={cx('overflow-y-auto px-5 lg:px-6', footer ? 'pb-4' : 'pb-[calc(1.25rem+env(safe-area-inset-bottom))]')}>
          {children}
        </div>
        {footer && (
          <div className="border-t border-zinc-100 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:px-6 lg:pb-5 dark:border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function MoneyInput({ value, onChange, autoFocus, id, label = 'Nominal' }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-2xl bg-zinc-100 px-4 py-3 focus-within:ring-2 focus-within:ring-brand-400 dark:bg-zinc-800">
      <span className="text-xl font-semibold text-zinc-400">Rp</span>
      <input
        id={id}
        aria-label={label}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        enterKeyHint="done"
        value={value ? ribuan(value) : ''}
        placeholder="0"
        onChange={(e) => onChange(parseAngka(e.target.value))}
        className="w-full min-w-0 bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
      />
    </div>
  )
}

export const inputCls =
  'h-12 w-full rounded-2xl bg-zinc-100 px-4 text-base outline-none focus:ring-2 focus:ring-brand-400 dark:bg-zinc-800'

/**
 * Label + isian. Pakai `grup` kalau isinya beberapa tombol (pilihan, tanggal cepat),
 * supaya labelnya jadi nama grup, bukan menempel ke tombol pertama.
 */
export function Field({ label, hint, children, className, grup = false }) {
  const Tag = grup ? 'div' : 'label'
  return (
    <Tag className={cx('block', className)} role={grup ? 'group' : undefined} aria-label={grup ? label : undefined}>
      <span className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>}
    </Tag>
  )
}

/** Teks input angka biasa (tanpa format Rp), misal tanggal 1–31 atau jumlah tenor. */
export function NumberInput({ value, onChange, min, max, ...rest }) {
  return (
    <input
      inputMode="numeric"
      className={inputCls}
      value={value === '' || value == null ? '' : String(value)}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '')
        if (d === '') return onChange('')
        let n = Number(d)
        if (max != null) n = Math.min(n, max)
        onChange(n)
      }}
      onBlur={() => {
        if (min != null && value !== '' && value < min) onChange(min)
      }}
      {...rest}
    />
  )
}

/** Tab berbentuk pil (gaya "Income / Expense / Savings"). */
export function Segmented({ options, value, onChange, className }) {
  return (
    <div
      className={cx('grid gap-1 rounded-full bg-zinc-100 p-1 dark:bg-white/[0.06]', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cx(
            'h-9 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition',
            value === o.value
              ? 'bg-white text-ink shadow-sm dark:bg-white dark:text-ink'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Grid pilihan dengan emoji (kategori / sumber pemasukan). */
export function PilihanGrid({ items, value, onChange, cols = 3 }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((it) => {
        const aktif = value === it.id
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            aria-pressed={aktif}
            className={cx(
              'flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-center text-xs leading-tight font-semibold transition active:scale-[0.97]',
              aktif
                ? 'bg-brand-300 text-ink'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/[0.1]',
            )}
          >
            <span className="text-xl leading-none">{it.emoji}</span>
            <span>{it.label ?? it.id}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Empty({ emoji, title, children }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="mb-2 text-4xl">{emoji}</div>
      <p className="font-semibold">{title}</p>
      {children && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{children}</p>}
    </div>
  )
}

export function Row({ left, title, subtitle, right, onClick, className }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 py-2.5 text-left',
        onClick && '-mx-2 rounded-2xl px-2 hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-white/[0.04] dark:active:bg-white/[0.07]',
        className,
      )}
    >
      {left && <div className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-100 text-xl dark:bg-white/[0.07]">{left}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{title}</div>
        {subtitle && <div className="truncate text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </Tag>
  )
}
