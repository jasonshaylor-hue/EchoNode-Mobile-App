'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, CheckSquare, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',         label: 'Capture',  Icon: Inbox },
  { href: '/focus',    label: 'Focus',    Icon: CheckSquare },
  { href: '/settings', label: 'Settings', Icon: Settings },
]

export default function SideNav() {
  const pathname = usePathname()
  return (
    <aside
      className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-border bg-surface pt-6 pb-[env(safe-area-inset-bottom)]"
      aria-label="Sidebar navigation"
    >
      <div className="px-4 mb-8">
        <h1 className="text-base font-bold text-primary">Cognitive Flow</h1>
        <p className="text-xs text-muted mt-0.5">ADHD productivity</p>
      </div>

      <nav className="flex flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-primary hover:bg-accent/5'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={18}
                aria-hidden="true"
                strokeWidth={isActive ? 2.5 : 1.8}
                className="flex-shrink-0"
              />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
