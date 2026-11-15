import Dexie from 'dexie'
import { DEFAULT_SETTINGS, SEED_LOANS } from './lib/constants'
import { today } from './lib/today'

// Nama database & penanda backup sengaja tetap 'cicilan-hemat' (nama lama aplikasi):
// kalau diganti, data yang sudah tersimpan di browser dan file backup lama tidak terbaca lagi.
export const db = new Dexie('cicilan-hemat')

db.version(1).stores({
  loans: '++id',
  incomes: '++id, tanggal',
  recurringIncomes: '++id',
  fixedNeeds: '++id',
  expenses: '++id, tanggal',
  categoryBudgets: 'kategori',
  wishlist: '++id, status',
  savings: '++id, tanggal',
  settings: 'key',
})

// Dijalankan sekali saat database pertama kali dibuat di HP ini.
db.on('populate', (tx) => {
  tx.table('loans').bulkAdd(SEED_LOANS)
  tx.table('settings').bulkAdd([
    { key: 'mulaiPakai', value: today() },
    ...Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })),
  ])
})

/** Ambil semua data sekaligus (dipakai oleh useLiveQuery di App). */
export async function muatSemua() {
  const [loans, incomes, recurringIncomes, fixedNeeds, expenses, categoryBudgets, wishlist, savings, settingRows] =
    await Promise.all([
      db.loans.toArray(),
      db.incomes.toArray(),
      db.recurringIncomes.toArray(),
      db.fixedNeeds.toArray(),
      db.expenses.toArray(),
      db.categoryBudgets.toArray(),
      db.wishlist.toArray(),
      db.savings.toArray(),
      db.settings.toArray(),
    ])
  const settings = { ...DEFAULT_SETTINGS, mulaiPakai: today() }
  for (const s of settingRows) settings[s.key] = s.value
  return { loans, incomes, recurringIncomes, fixedNeeds, expenses, categoryBudgets, wishlist, savings, settings }
}

export const simpanSetting = (key, value) => db.settings.put({ key, value })

// ---------- Backup ----------

const TABEL = ['loans', 'incomes', 'recurringIncomes', 'fixedNeeds', 'expenses', 'categoryBudgets', 'wishlist', 'savings', 'settings']

export async function eksporData() {
  const data = {}
  for (const t of TABEL) data[t] = await db.table(t).toArray()
  return { app: 'cicilan-hemat', versi: 1, dibuat: new Date().toISOString(), data }
}

/** Ganti semua data di HP dengan isi file backup. Melempar Error kalau formatnya salah. */
export async function imporData(json) {
  if (!json || json.app !== 'cicilan-hemat' || typeof json.data !== 'object' || !Array.isArray(json.data.loans)) {
    throw new Error('File ini bukan backup Management Money.')
  }
  for (const t of TABEL) {
    if (json.data[t] !== undefined && !Array.isArray(json.data[t])) throw new Error(`Bagian "${t}" di file backup rusak.`)
  }
  await db.transaction('rw', TABEL.map((t) => db.table(t)), async () => {
    for (const t of TABEL) {
      await db.table(t).clear()
      if (json.data[t]?.length) await db.table(t).bulkPut(json.data[t])
    }
  })
}
