import { describe, it, expect, vi } from 'vitest'

vi.mock('ai', () => ({ generateText: vi.fn() }))
vi.mock('@/lib/groq', () => ({
  groq: vi.fn().mockReturnValue('mocked-groq-model'),
  FAST_MODEL: 'llama-3.3-70b-versatile',
}))

import { generateText } from 'ai'
import { nextTaskAgent } from '@/agents/next-task-agent'
import type { Task } from '@/types/thought'

const mockTask = (overrides = {}): Task => ({
  id: 'task-1',
  sessionId: 'sess',
  thoughtId: 'th1',
  title: 'Write tests',
  priority: 'high',
  status: 'open',
  mentionCount: 2,
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('nextTaskAgent', () => {
  it('returns null task when list is empty', async () => {
    const result = await nextTaskAgent([])
    expect(result.task).toBeNull()
    expect(result.rationale).toContain('No open tasks')
  })

  it('calls generateText and returns picked task', async () => {
    vi.mocked(generateText).mockResolvedValue({ text: '{"index": 1, "rationale": "High priority and repeated."}' } as any)
    const tasks = [mockTask()]
    const result = await nextTaskAgent(tasks)
    expect(result.task?.id).toBe('task-1')
    expect(result.rationale).toBe('High priority and repeated.')
  })

  it('strips markdown fences from AI response', async () => {
    vi.mocked(generateText).mockResolvedValue({ text: '```json\n{"index": 1, "rationale": "Do it."}\n```' } as any)
    const result = await nextTaskAgent([mockTask()])
    expect(result.task).not.toBeNull()
  })
})
