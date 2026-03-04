import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TagEditor from './TagEditor'

// Mock updateThought so tests don't need sessionStorage
vi.mock('@/memory/session', () => ({
  updateThought: vi.fn(),
}))

describe('TagEditor', () => {
  it('renders existing tags as badges', () => {
    render(<TagEditor thoughtId="1" initialTags={['work', 'urgent']} />)
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('urgent')).toBeInTheDocument()
  })

  it('adds a tag on Enter key', () => {
    render(<TagEditor thoughtId="1" initialTags={[]} />)
    const input = screen.getByPlaceholderText('Add tag…')
    fireEvent.change(input, { target: { value: 'newtag' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('newtag')).toBeInTheDocument()
  })

  it('does not add duplicate tags', () => {
    render(<TagEditor thoughtId="1" initialTags={['work']} />)
    const input = screen.getByPlaceholderText('Add tag…')
    fireEvent.change(input, { target: { value: 'work' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getAllByText('work')).toHaveLength(1)
  })

  it('removes a tag when × is clicked', () => {
    render(<TagEditor thoughtId="1" initialTags={['work']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove work tag' }))
    expect(screen.queryByText('work')).not.toBeInTheDocument()
  })
})
