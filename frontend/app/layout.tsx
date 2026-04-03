import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wallfeel AI Visualizer',
  description: 'Visualize wallpaper designs on your walls with AI',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
