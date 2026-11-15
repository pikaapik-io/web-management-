import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import App from './App'

// Minta browser supaya data IndexedDB tidak dihapus otomatis saat memori penuh.
navigator.storage?.persist?.().catch(() => {})

// Simpan event "pasang aplikasi" (Android Chrome) supaya tombolnya bisa ditampilkan di Pengaturan.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__promptPasang = e
  window.dispatchEvent(new Event('bisa-pasang'))
})
window.addEventListener('appinstalled', () => {
  window.__promptPasang = null
})

// Catatan: sengaja tanpa <StrictMode>, karena efek ganda di mode dev mengacaukan
// riwayat tombol "kembali" yang dipakai untuk menutup sheet.
createRoot(document.getElementById('root')).render(<App />)
