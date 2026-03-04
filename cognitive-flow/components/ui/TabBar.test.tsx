import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TabBar from './TabBar'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('TabBar', () => {
  it('renders all three tab labels', () => {
    render(<TabBar />)
    expect(screen.getByText('Capture')).toBeTruthy()
    expect(screen.getByText('Focus')).toBeTruthy()
    expect(screen.getByText('Settings')).toBeTruthy()
  })

  it('marks active tab with aria-current="page"', () => {
    render(<TabBar />)
    const captureLink = screen.getByText('Capture').closest('a')
    expect(captureLink?.getAttribute('aria-current')).toBe('page')
  })

  it('does not mark inactive tabs with aria-current', () => {
    render(<TabBar />)
    const focusLink = screen.getByText('Focus').closest('a')
    expect(focusLink?.getAttribute('aria-current')).toBeNull()
  })
})
