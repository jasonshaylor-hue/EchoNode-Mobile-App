import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))
vi.mock('@/components/ui/adhd-optimized/TaskCard', () => ({
  default: ({ task }: any) => <div data-testid="task-card">{task.title}</div>,
}))

// Mock fetch globally
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ tasks: [] }),
})

import FocusPage from '@/app/focus/page'

describe('FocusPage', () => {
  it('renders the What do I do next button', () => {
    render(<FocusPage />)
    expect(screen.getByRole('button', { name: /what do i do next/i })).toBeInTheDocument()
  })
})
