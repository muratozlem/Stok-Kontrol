import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stok Kontrol — Yönetim Paneli',
  description: 'Stok Kontrol WMS Admin Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
