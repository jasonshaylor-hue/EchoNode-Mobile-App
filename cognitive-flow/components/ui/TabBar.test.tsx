import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
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
    expect(screen.getByText('Capture')).toBeInTheDocument()
    expect(screen.getByText('Focus')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('marks active tab with aria-current="page"', () => {
    render(<TabBar />)
    const captureLink = screen.getByText('Capture').closest('a')
    expect(captureLink).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark inactive tabs with aria-current', () => {
    render(<TabBar />)
    const focusLink = screen.getByText('Focus').closest('a')
    expect(focusLink).not.toHaveAttribute('aria-current')
  })
})
