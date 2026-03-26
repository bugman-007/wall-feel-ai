import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from './contexts/ThemeContext'

export const metadata: Metadata = {
  title: 'Wallfeel AI Visualizer',
  description: 'Visualize wallpaper designs on your walls with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
