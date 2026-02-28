import { describe, it, expect, vi } from 'vitest'

const mockInsert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
    }),
  },
}))

import { persistThought } from './supabase'
import type { CapturedThought } from '@/types/thought'

const mockThought: CapturedThought = {
  id: 'test-123',
  rawText: 'raw',
  cleanedText: 'cleaned',
  category: 'Task',
  intent: 'test intent',
  hierarchy: { title: 'Test', type: 'task', priority: 'medium' },
  createdAt: new Date().toISOString(),
  sessionId: 'session-abc',
}

describe('persistThought', () => {
  it('calls supabase insert with mapped fields', async () => {
    await persistThought(mockThought)
    expect(mockInsert).toHaveBeenCalledWith({
      id: 'test-123',
      session_id: 'session-abc',
      raw_text: 'raw',
      cleaned_text: 'cleaned',
      category: 'Task',
      intent: 'test intent',
      hierarchy: mockThought.hierarchy,
    })
  })

  it('does not throw when supabase returns no error', async () => {
    await expect(persistThought(mockThought)).resolves.not.toThrow()
  })
})
