import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SettingsPage from './page'
import { ThemeProvider } from '@/lib/theme'

// Minimal mocks for localStorage + matchMedia
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })
Object.defineProperty(window, 'matchMedia', {
  value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  writable: true,
})

describe('SettingsPage', () => {
  beforeEach(() => localStorageMock.clear())

  it('renders the Dark Mode toggle', () => {
    render(<ThemeProvider><SettingsPage /></ThemeProvider>)
    expect(screen.getByRole('switch', { name: /dark mode/i })).toBeInTheDocument()
  })

  it('toggle changes theme', () => {
    render(<ThemeProvider><SettingsPage /></ThemeProvider>)
    const toggle = screen.getByRole('switch', { name: /dark mode/i })
    // starts dark → toggle → light
    fireEvent.click(toggle)
    expect(localStorageMock.getItem('cf_theme')).toBe('light')
  })
})
