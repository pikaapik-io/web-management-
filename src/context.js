import { createContext, useContext } from 'react'

export const AppContext = createContext(null)

/**
 * { data, today, now, goTo, buka: { pengeluaran, pemasukan, mauBeli }, toast, setSetting }
 */
export const useApp = () => useContext(AppContext)
