import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GlassCard from './GlassCard'

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard><span>hello</span></GlassCard>)
    expect(screen.getByText('hello')).toBeTruthy()
  })

  it('applies glass-card class', () => {
    const { container } = render(<GlassCard>content</GlassCard>)
    expect(container.firstChild).toHaveClass('glass-card')
  })

  it('forwards additional className', () => {
    const { container } = render(<GlassCard className="p-4">content</GlassCard>)
    expect(container.firstChild).toHaveClass('p-4')
  })
})
