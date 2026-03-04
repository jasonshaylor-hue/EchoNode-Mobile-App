import { describe, it, expect, beforeEach } from 'vitest'
import { saveThought, getThoughts, clearThoughts, updateThought } from './session'
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

describe('session storage', () => {
  beforeEach(() => {
    clearThoughts()
  })

  it('saves and retrieves a thought', () => {
    saveThought(mockThought)
    const thoughts = getThoughts()
    expect(thoughts).toHaveLength(1)
    expect(thoughts[0].id).toBe('test-123')
  })

  it('returns empty array when nothing saved', () => {
    expect(getThoughts()).toEqual([])
  })

  it('preserves multiple thoughts in order', () => {
    saveThought({ ...mockThought, id: 'a' })
    saveThought({ ...mockThought, id: 'b' })
    const thoughts = getThoughts()
    expect(thoughts).toHaveLength(2)
    expect(thoughts[0].id).toBe('a')
    expect(thoughts[1].id).toBe('b')
  })

  it('clearThoughts empties the store', () => {
    saveThought(mockThought)
    clearThoughts()
    expect(getThoughts()).toEqual([])
  })
})

const makeThought = (id: string): CapturedThought => ({
  id,
  rawText: 'raw',
  cleanedText: 'clean',
  category: 'Task',
  intent: 'test',
  hierarchy: { title: 'T', type: 'project', priority: 'low' },
  createdAt: new Date().toISOString(),
  sessionId: 's1',
})

describe('updateThought', () => {
  beforeEach(() => sessionStorage.clear())

  it('updates tags on an existing thought', () => {
    const t = makeThought('abc')
    saveThought(t)
    updateThought('abc', { tags: ['important', 'work'] })
    const stored = getThoughts()
    expect(stored[0].tags).toEqual(['important', 'work'])
  })

  it('does nothing when id not found', () => {
    saveThought(makeThought('abc'))
    updateThought('nonexistent', { tags: ['x'] })
    expect(getThoughts()[0].tags).toBeUndefined()
  })
})
