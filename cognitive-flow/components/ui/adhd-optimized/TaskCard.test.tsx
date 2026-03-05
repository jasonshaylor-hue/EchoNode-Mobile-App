import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, whileFocus, initial, animate, exit, transition, variants, ...props }: any) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import TaskCard from '@/components/ui/adhd-optimized/TaskCard'
import type { Task } from '@/types/thought'

const mockTask: Task = {
  id: 'task-1',
  sessionId: 'sess',
  thoughtId: 'th1',
  title: 'Write tests for new feature',
  priority: 'high',
  status: 'open',
  mentionCount: 3,
  createdAt: new Date().toISOString(),
}

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('Write tests for new feature')).toBeInTheDocument()
  })

  it('shows mention count when > 1', () => {
    render(<TaskCard task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText(/mentioned 3×/)).toBeInTheDocument()
  })

  it('does not show mention count when = 1', () => {
    render(<TaskCard task={{ ...mockTask, mentionCount: 1 }} onComplete={vi.fn()} />)
    expect(screen.queryByText(/mentioned/)).not.toBeInTheDocument()
  })

  it('calls onComplete when checkbox clicked', () => {
    const onComplete = vi.fn()
    render(<TaskCard task={mockTask} onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /Mark.*as done/i }))
    expect(onComplete).toHaveBeenCalledWith('task-1')
  })
})

describe('completed state', () => {
  it('shows checkmark icon when completed', () => {
    render(<TaskCard task={mockTask} onComplete={vi.fn()} completed />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('does not render checkbox button when completed', () => {
    render(<TaskCard task={mockTask} onComplete={vi.fn()} completed />)
    expect(screen.queryByRole('button', { name: /Mark.*as done/i })).not.toBeInTheDocument()
  })

  it('renders task title with line-through when completed', () => {
    render(<TaskCard task={mockTask} onComplete={vi.fn()} completed />)
    const title = screen.getByText('Write tests for new feature')
    expect(title).toHaveClass('line-through')
  })
})
