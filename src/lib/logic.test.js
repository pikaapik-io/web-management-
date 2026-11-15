import { describe, expect, it } from 'vitest'
import { hitungAnggaran, jatahSetelahBeli, periode, statusBudget } from './budget'
import { SEED_LOANS } from './constants'
import { addMonths, dateInMonth, diffDays, startOfWeek } from './dates'
import { hitungMundur, parseAngka, rupiah, tanggal } from './format'
import { buatICS } from './ics'
import {
  batalBayarTerakhir,
  rekapPerBulan,
  ringkasanUtang,
  statusCicilan,
  tandaiBayar,
} from './loans'
import { hitungStreak } from './streak'

const LOANS = SEED_LOANS.map((l, i) => ({ ...l, id: i + 1 }))

describe('data awal cicilan cocok dengan brief', () => {
  it('total per bulan', () => {
    const rekap = rekapPerBulan(LOANS).map((r) => [r.bulan, r.jumlah, r.total])
    expect(rekap).toEqual([
      ['2026-12', 26, 2625660],
      ['2027-01', 25, 2432484],
      ['2027-02', 24, 2297261],
      ['2027-03', 19, 1801089],
      ['2027-04', 11, 878584],
      ['2027-05', 4, 241608],
    ])
  })

  it('total sisa utang & perkiraan lunas', () => {
    const r = ringkasanUtang(LOANS)
    expect(r.sisa).toBe(10276686)
    expect(r.lunasBulan).toBe('2027-05')
    expect(r.aktif).toBe(26)
  })
})

describe('tanggal', () => {
  it('tanggal 29–31 digeser ke akhir bulan pendek', () => {
    expect(dateInMonth('2027-02', 31)).toBe('2027-02-28')
    expect(dateInMonth('2028-02', 30)).toBe('2028-02-29')
    expect(dateInMonth('2027-04', 31)).toBe('2027-04-30')
    expect(dateInMonth('2027-01', 31)).toBe('2027-01-31')
  })
  it('tambah bulan lintas tahun', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2027-01', -1)).toBe('2026-12')
  })
  it('selisih hari & awal minggu (Senin)', () => {
    expect(diffDays('2026-12-01', '2026-11-16')).toBe(15)
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16') // Senin
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16') // Minggu
  })
})

describe('format', () => {
  it('rupiah', () => {
    expect(rupiah(1250000)).toBe('Rp1.250.000')
    expect(rupiah(0)).toBe('Rp0')
    expect(rupiah(-5000)).toBe('-Rp5.000')
    expect(parseAngka('Rp1.250.000')).toBe(1250000)
  })
  it('tanggal Indonesia', () => {
    expect(tanggal('2026-12-01')).toBe('1 Desember 2026')
    expect(tanggal('2026-12-01', { hari: true })).toBe('Selasa, 1 Desember 2026')
    expect(tanggal('2026-11-16', { pendek: true, tahun: false })).toBe('16 Nov')
    expect(hitungMundur(5)).toBe('5 hari lagi')
    expect(hitungMundur(-2)).toBe('Telat 2 hari')
  })
})

describe('status & pembayaran cicilan', () => {
  const loan = LOANS[0] // tgl 1, Rp153.751, 5x mulai Des 2026
  it('status sebelum & sesudah jatuh tempo', () => {
    expect(statusCicilan(loan, '2026-11-16').kode).toBe('belum')
    expect(statusCicilan(loan, '2026-11-28').kode).toBe('dekat')
    expect(statusCicilan(loan, '2026-12-01').label).toBe('Jatuh tempo hari ini')
    expect(statusCicilan(loan, '2026-12-03')).toMatchObject({ kode: 'telat', hari: -2 })
  })
  it('tandai bayar lalu batalkan', () => {
    const dibayar = tandaiBayar(loan, { tanggalBayar: '2026-11-30', nominal: 153751 })
    expect(dibayar.tenorTerbayar).toBe(1)
    expect(dibayar.riwayatBayar).toEqual([{ bulan: '2026-12', tanggalBayar: '2026-11-30', nominal: 153751 }])
    expect(statusCicilan(dibayar, '2026-12-05').kode).toBe('sudah')
    expect(statusCicilan(dibayar, '2026-12-05').next.due).toBe('2027-01-01')
    const batal = batalBayarTerakhir(dibayar)
    expect(batal.tenorTerbayar).toBe(0)
    expect(batal.riwayatBayar).toEqual([])
  })
  it('lunas semua', () => {
    let l = LOANS[8] // 1x
    l = tandaiBayar(l, { tanggalBayar: '2026-12-07', nominal: l.nominalPerBulan })
    expect(statusCicilan(l, '2026-12-08').kode).toBe('lunas')
  })
})

describe('periode & jatah harian', () => {
  const gaji = [{ id: 1, nama: 'Gaji', sumber: 'Gaji', tanggalTiapBulan: 25 }]

  it('periode tanpa pemasukan rutin = bulan kalender', () => {
    expect(periode('2026-11-16', [])).toMatchObject({ mulai: '2026-11-01', berikut: '2026-12-01' })
  })
  it('periode dengan gaji tgl 25', () => {
    expect(periode('2026-11-16', gaji)).toMatchObject({ mulai: '2026-10-25', berikut: '2026-11-25' })
    expect(periode('2026-11-25', gaji)).toMatchObject({ mulai: '2026-11-25', berikut: '2026-12-25' })
  })

  it('mengunci cicilan sebelum gaji berikutnya & membagi sisa', () => {
    const data = {
      loans: LOANS,
      recurringIncomes: gaji,
      incomes: [{ tanggal: '2026-11-25', nominal: 4000000 }],
      expenses: [],
      fixedNeeds: [{ nama: 'Kos', nominal: 600000 }],
    }
    const a = hitungAnggaran(data, '2026-11-25')
    // Cicilan Des yang jatuh tempo sebelum 25 Des (tgl 1–21) dikunci; tgl 26 & 28 belum
    const desSebelum25 = LOANS.filter((l) => l.tanggalJatuhTempo < 25).reduce((s, l) => s + l.nominalPerBulan, 0)
    expect(a.kunciCicilan).toBe(desSebelum25)
    expect(a.kunciPokok).toBe(600000)
    expect(a.sisaHari).toBe(30)
    expect(a.jatah).toBe(Math.floor((4000000 - desSebelum25 - 600000) / 30))
  })

  it('jatah stabil sepanjang hari, pengeluaran mengurangi jatah besok', () => {
    const base = {
      loans: [],
      recurringIncomes: gaji,
      incomes: [{ tanggal: '2026-11-16', nominal: 900000 }],
      fixedNeeds: [],
    }
    const a0 = hitungAnggaran({ ...base, expenses: [] }, '2026-11-16')
    expect(a0.sisaHari).toBe(9) // 16..24
    expect(a0.jatah).toBe(100000)
    const a1 = hitungAnggaran({ ...base, expenses: [{ tanggal: '2026-11-16', nominal: 180000, kategori: 'Makan' }] }, '2026-11-16')
    expect(a1.jatah).toBe(100000)
    expect(a1.terpakai).toBe(180000)
    expect(a1.sisaJatah).toBe(-80000)
    expect(a1.jatahBesok).toBe(90000) // (900000-180000)/8
    expect(jatahSetelahBeli(a0, 90000)).toBe(90000)
  })

  it('bayar kos dari dana pokok tidak memotong jatah harian', () => {
    const data = {
      loans: [],
      recurringIncomes: gaji,
      incomes: [{ tanggal: '2026-11-16', nominal: 1500000 }],
      fixedNeeds: [{ nama: 'Kos', nominal: 600000 }],
      expenses: [{ tanggal: '2026-11-16', nominal: 600000, kategori: 'Kebutuhan Pokok' }],
    }
    const a = hitungAnggaran(data, '2026-11-16')
    expect(a.jatah).toBe(100000)
    expect(a.terpakai).toBe(0)
    expect(a.kunciPokok).toBe(0)
    expect(a.jatahBesok).toBe(Math.floor(900000 / 8))
  })

  it('peringatan uang kurang untuk cicilan', () => {
    const data = {
      loans: LOANS,
      recurringIncomes: [],
      incomes: [{ tanggal: '2026-12-01', nominal: 1000000 }],
      expenses: [],
      fixedNeeds: [],
    }
    const a = hitungAnggaran(data, '2026-12-01')
    expect(a.kunciCicilan).toBe(2625660)
    expect(a.kurangCicilan).toBe(1625660)
    expect(a.jatah).toBe(0)
  })

  it('membayar cicilan hari ini tidak mengubah jatah hari ini', () => {
    const loan = { ...LOANS[0] }
    const sebelum = { loans: [loan], recurringIncomes: [], incomes: [{ tanggal: '2026-12-01', nominal: 1000000 }], expenses: [], fixedNeeds: [] }
    const sesudah = { ...sebelum, loans: [tandaiBayar(loan, { tanggalBayar: '2026-12-01', nominal: 153751 })] }
    const a = hitungAnggaran(sebelum, '2026-12-01')
    const b = hitungAnggaran(sesudah, '2026-12-01')
    expect(b.jatah).toBe(a.jatah)
    expect(b.kunciCicilan).toBe(0)
    expect(b.uangSekarang).toBe(1000000 - 153751)
  })
})

describe('budget, streak, ics', () => {
  it('status budget kategori', () => {
    expect(statusBudget(50000, 100000).kode).toBe('aman')
    expect(statusBudget(80000, 100000).kode).toBe('hampir')
    expect(statusBudget(120000, 100000)).toMatchObject({ kode: 'lewat', sisa: -20000 })
  })
  it('streak hari tanpa "pengen"', () => {
    const exp = [
      { tanggal: '2026-11-17', jenis: 'pengen' },
      { tanggal: '2026-11-18', jenis: 'butuh' },
    ]
    expect(hitungStreak(exp, '2026-11-14', '2026-11-20')).toEqual({ sekarang: 3, terbaik: 3, hariIniPengen: false })
    expect(hitungStreak(exp, '2026-11-14', '2026-11-17').sekarang).toBe(0)
  })
  it('ics berisi acara per tanggal dengan pengingat H-3 & H-1', () => {
    const { isi, jumlahAcara } = buatICS(LOANS, '2026-11-16', new Date('2026-11-16T00:00:00Z'))
    expect(isi.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(jumlahAcara).toBeGreaterThan(0)
    expect(isi).toContain('DTSTART:20261201T090000')
    expect(isi).toContain('TRIGGER:-P3D')
    expect(isi).toContain('TRIGGER:-P1D')
    expect(isi.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })
})
