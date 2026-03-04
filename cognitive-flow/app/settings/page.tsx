'use client'

import { useTheme } from '@/lib/theme'

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <main className="flex flex-col h-full pt-[env(safe-area-inset-top)]">
      <header className="px-4 py-3 border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-primary">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
        <section aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
            Appearance
          </h2>

          <div className="flex items-center justify-between glass-card rounded-2xl px-4 py-4">
            <div>
              <p className="text-sm font-medium text-primary">Dark Mode</p>
              <p className="text-xs text-muted mt-0.5">
                {isDark ? 'Using dark theme' : 'Using light theme'}
              </p>
            </div>

            <button
              role="switch"
              aria-checked={isDark}
              aria-label="Dark mode"
              onClick={toggleTheme}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
                isDark ? 'bg-accent' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                  isDark ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
              <span className="sr-only">{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
