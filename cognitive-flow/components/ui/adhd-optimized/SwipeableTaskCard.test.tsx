import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'

let capturedDragEnd: ((_: unknown, info: { offset: { x: number } }) => void) | undefined

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onDragEnd, whileHover, whileTap, drag, dragConstraints,
            dragElastic, dragDirectionLock, style, ...props }: any) => {
      if (onDragEnd) capturedDragEnd = onDragEnd
      return <div {...props}>{children}</div>
    },
  },
  useMotionValue: () => ({ get: () => 0 }),
  useTransform: () => 0,
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/components/ui/adhd-optimized/TaskCard', () => ({
  default: ({ task }: any) => <div data-testid="task-card">{task.title}</div>,
}))

import SwipeableTaskCard from './SwipeableTaskCard'
import type { Task } from '@/types/thought'

const mockTask: Task = {
  id: 'task-1',
  sessionId: 'sess',
  thoughtId: 'th1',
  title: 'My task',
  priority: 'high',
  status: 'open',
  mentionCount: 1,
  createdAt: new Date().toISOString(),
}

describe('SwipeableTaskCard', () => {
  it('renders the task card', () => {
    render(<SwipeableTaskCard task={mockTask} onComplete={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('task-card')).toBeInTheDocument()
  })

  it('renders the delete background layer', () => {
    render(<SwipeableTaskCard task={mockTask} onComplete={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('presentation')).toBeInTheDocument()
  })

  it('calls onDelete when drag ends past threshold (-80px)', () => {
    const onDelete = vi.fn()
    capturedDragEnd = undefined
    render(<SwipeableTaskCard task={mockTask} onComplete={vi.fn()} onDelete={onDelete} />)
    act(() => capturedDragEnd?.({}, { offset: { x: -100 } }))
    expect(onDelete).toHaveBeenCalledWith('task-1')
  })

  it('does NOT call onDelete when drag ends before threshold', () => {
    const onDelete = vi.fn()
    capturedDragEnd = undefined
    render(<SwipeableTaskCard task={mockTask} onComplete={vi.fn()} onDelete={onDelete} />)
    act(() => capturedDragEnd?.({}, { offset: { x: -20 } }))
    expect(onDelete).not.toHaveBeenCalled()
  })
})
