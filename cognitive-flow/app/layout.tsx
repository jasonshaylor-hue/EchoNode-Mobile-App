import type { Metadata, Viewport } from 'next'
import './globals.css'
import TabBar from '@/components/ui/TabBar'

export const metadata: Metadata = {
  title: 'Cognitive Flow',
  description: 'Voice-first ADHD productivity',
}

export const viewport: Viewport = {
  themeColor: '#0F0F0F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-primary h-dvh flex flex-col">
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
        <TabBar />
      </body>
    </html>
  )
}
