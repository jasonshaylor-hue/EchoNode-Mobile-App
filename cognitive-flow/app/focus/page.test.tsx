import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, whileTap, whileHover, initial, animate, exit, transition, variants, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/components/ui/adhd-optimized/TaskCard', () => ({
  default: ({ task, completed }: any) => (
    <div data-testid={completed ? 'completed-card' : 'task-card'}>{task.title}</div>
  ),
}))

vi.mock('@/components/ui/adhd-optimized/SwipeableTaskCard', () => ({
  default: ({ task }: any) => <div data-testid="swipeable-card">{task.title}</div>,
}))

const mockOpenTask = {
  id: 'task-1', title: 'Open task', priority: 'high',
  status: 'open', mentionCount: 1, sessionId: 'sess', thoughtId: 'th1',
  createdAt: new Date().toISOString(),
}

const mockDoneTask = {
  id: 'task-2', title: 'Done task', priority: 'low',
  status: 'done', mentionCount: 1, sessionId: 'sess', thoughtId: 'th1',
  createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
}

beforeEach(() => {
  sessionStorage.setItem('cf_session_id', 'test-session')
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('completed-tasks')) {
      return Promise.resolve({ ok: true, json: async () => ({ tasks: [mockDoneTask] }) })
    }
    return Promise.resolve({ ok: true, json: async () => ({ tasks: [mockOpenTask] }) })
  })
})

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

import FocusPage from '@/app/focus/page'

describe('FocusPage', () => {
  it('renders the Active/Completed tab toggle', () => {
    render(<FocusPage />)
    expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument()
  })

  it('renders the What do I do next button', () => {
    render(<FocusPage />)
    expect(screen.getByRole('button', { name: /what do i do next/i })).toBeInTheDocument()
  })

  it('shows swipeable cards in Active tab after loading', async () => {
    render(<FocusPage />)
    await waitFor(() => expect(screen.queryAllByTestId('swipeable-card').length).toBeGreaterThan(0))
  })

  it('switches to Completed tab and shows completed tasks', async () => {
    render(<FocusPage />)
    fireEvent.click(screen.getByRole('button', { name: /completed/i }))
    await waitFor(() => expect(screen.queryAllByTestId('completed-card').length).toBeGreaterThan(0))
  })
})
