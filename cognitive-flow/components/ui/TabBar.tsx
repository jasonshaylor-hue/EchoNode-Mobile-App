'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: 'Capture', icon: '📥' },
  { href: '/focus', label: 'Focus', icon: '✓' },
]

export default function TabBar() {
  const pathname = usePathname()
  return (
    <nav
      className="flex-shrink-0 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
      style={{ minHeight: '49px' }}
      aria-label="Main navigation"
    >
      {TABS.map(tab => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-accent' : 'text-muted'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span aria-hidden="true" className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
