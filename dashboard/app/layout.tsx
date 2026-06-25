import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stok Kontrol',
  description: 'Stok Yönetim Paneli',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
