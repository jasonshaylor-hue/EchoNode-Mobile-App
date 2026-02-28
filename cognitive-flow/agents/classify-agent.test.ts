import { describe, it, expect, vi } from 'vitest'

vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: { category: 'Task' }
  })
}))

vi.mock('@/lib/groq', () => ({
  groq: vi.fn().mockReturnValue('mocked-groq-model'),
  FAST_MODEL: 'llama-3.1-8b-instant',
}))

import { classifyAgent } from './classify-agent'

describe('classifyAgent', () => {
  it('returns a valid ThoughtCategory', async () => {
    const result = await classifyAgent('Schedule team meeting', 'User wants to organize a kickoff')
    expect(['Task', 'Idea', 'Reference']).toContain(result.category)
  })

  it('returns Task for action-oriented thoughts', async () => {
    const result = await classifyAgent('Schedule team meeting', 'User wants to organize a kickoff')
    expect(result.category).toBe('Task')
  })
})
