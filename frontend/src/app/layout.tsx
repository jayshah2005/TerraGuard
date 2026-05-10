import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TerraGuard',
  description: 'AI-powered plant and crop climate outlook for farms and home gardens',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
