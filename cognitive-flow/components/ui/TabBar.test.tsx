import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ usePathname: vi.fn().mockReturnValue('/') }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import TabBar from '@/components/ui/TabBar'

describe('TabBar', () => {
  it('renders both tabs', () => {
    render(<TabBar />)
    expect(screen.getByText('Capture')).toBeInTheDocument()
    expect(screen.getByText('Focus')).toBeInTheDocument()
  })

  it('marks active tab with aria-current', () => {
    render(<TabBar />)
    const captureLink = screen.getByText('Capture').closest('a')
    expect(captureLink).toHaveAttribute('aria-current', 'page')
  })
})
