import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, whileFocus, initial, animate, exit, transition, variants, ...props }: any) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/memory/session', () => ({
  updateThought: vi.fn(),
}))

import ThoughtCard from './ThoughtCard'
import type { CapturedThought } from '@/types/thought'

const mockThought: CapturedThought = {
  id: '1',
  rawText: 'um schedule a meeting',
  cleanedText: 'Schedule kickoff meeting',
  category: 'Task',
  intent: 'User wants a kickoff meeting',
  hierarchy: {
    title: 'Kickoff Meeting',
    type: 'project',
    priority: 'high',
    children: [{ title: 'Send invites', type: 'task', priority: 'high' }]
  },
  createdAt: new Date().toISOString(),
  sessionId: 'sess-1',
}

describe('ThoughtCard', () => {
  it('displays the cleaned text', () => {
    render(<ThoughtCard thought={mockThought} />)
    expect(screen.getByText('Schedule kickoff meeting')).toBeDefined()
  })

  it('displays the category badge', () => {
    render(<ThoughtCard thought={mockThought} />)
    expect(screen.getByText('Task')).toBeDefined()
  })

  it('displays the hierarchy title', () => {
    render(<ThoughtCard thought={mockThought} />)
    expect(screen.getByText('Kickoff Meeting')).toBeDefined()
  })
})
