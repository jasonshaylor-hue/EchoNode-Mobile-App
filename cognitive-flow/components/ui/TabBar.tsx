'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, CheckSquare, Settings } from 'lucide-react'

const TABS = [
  { href: '/',         label: 'Capture',  Icon: Inbox },
  { href: '/focus',    label: 'Focus',    Icon: CheckSquare },
  { href: '/settings', label: 'Settings', Icon: Settings },
]

interface TabBarProps {
  className?: string
}

export default function TabBar({ className = '' }: TabBarProps) {
  const pathname = usePathname()
  return (
    <nav
      className={`flex-shrink-0 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] min-h-[49px] md:hidden ${className}`}
      aria-label="Main navigation"
    >
      {TABS.map(({ href, label, Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors duration-200 ${
              isActive ? 'text-accent' : 'text-muted'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              size={20}
              aria-hidden="true"
              strokeWidth={isActive ? 2.5 : 1.8}
              className="transition-all duration-200"
            />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
