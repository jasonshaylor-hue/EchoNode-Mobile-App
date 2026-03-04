import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SideNav from './SideNav'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('SideNav', () => {
  it('renders all three nav labels', () => {
    render(<SideNav />)
    expect(screen.getByText('Capture')).toBeInTheDocument()
    expect(screen.getByText('Focus')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('marks active route with aria-current="page"', () => {
    render(<SideNav />)
    const captureLink = screen.getByText('Capture').closest('a')
    expect(captureLink).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark inactive routes with aria-current', () => {
    render(<SideNav />)
    const focusLink = screen.getByText('Focus').closest('a')
    expect(focusLink).not.toHaveAttribute('aria-current')
  })
})
