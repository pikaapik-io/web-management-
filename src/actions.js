// Semua operasi tulis ke database dikumpulkan di sini.
import { db } from './db'
import { batalBayarTerakhir, rapikanRiwayat, tandaiBayar } from './lib/loans'

// ---------- Pengeluaran ----------
export const simpanPengeluaran = ({ id, ...e }) => (id ? db.expenses.put({ id, ...e }) : db.expenses.add(e))
export const hapusPengeluaran = (id) => db.expenses.delete(id)

// ---------- Pemasukan ----------
export const simpanPemasukan = ({ id, ...i }) => (id ? db.incomes.put({ id, ...i }) : db.incomes.add(i))
export const hapusPemasukan = (id) => db.incomes.delete(id)

// ---------- Cicilan ----------
export async function simpanCicilan(loan) {
  const rapi = rapikanRiwayat({ riwayatBayar: [], ...loan })
  return rapi.id ? db.loans.put(rapi) : db.loans.add(rapi)
}
export const hapusCicilan = (id) => db.loans.delete(id)

export async function bayarCicilan(id, pembayaran) {
  const loan = await db.loans.get(id)
  if (loan) await db.loans.put(tandaiBayar(loan, pembayaran))
}
export async function batalBayar(id) {
  const loan = await db.loans.get(id)
  if (loan) await db.loans.put(batalBayarTerakhir(loan))
}

// ---------- Uang diselamatkan ----------
export const catatDiselamatkan = (s) => db.savings.add(s)

// ---------- Wishlist ----------
export const tambahWishlist = (w) => db.wishlist.add({ status: 'menunggu', ...w })
export const ubahWishlist = (id, ubah) => db.wishlist.update(id, ubah)
export const hapusWishlist = (id) => db.wishlist.delete(id)

// ---------- Pengaturan ----------
export const simpanRutin = ({ id, ...r }) => (id ? db.recurringIncomes.put({ id, ...r }) : db.recurringIncomes.add(r))
export const hapusRutin = (id) => db.recurringIncomes.delete(id)
export const simpanPokok = ({ id, ...p }) => (id ? db.fixedNeeds.put({ id, ...p }) : db.fixedNeeds.add(p))
export const hapusPokok = (id) => db.fixedNeeds.delete(id)
export const simpanBudget = (kategori, batasMingguan) =>
  batasMingguan > 0 ? db.categoryBudgets.put({ kategori, batasMingguan }) : db.categoryBudgets.delete(kategori)
