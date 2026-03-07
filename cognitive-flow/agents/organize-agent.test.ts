import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

vi.mock('@/lib/groq', () => ({
  groq: vi.fn().mockReturnValue('mocked-groq-model'),
  FAST_MODEL: 'llama-3.3-70b-versatile',
}))

import { generateText } from 'ai'
import { organizeAgent } from './organize-agent'

const HIERARCHY_JSON = '{"hierarchy": {"title": "Plan Team Meeting", "type": "project", "priority": "high", "children": [{"title": "Schedule the meeting", "type": "task", "priority": "high"}, {"title": "Send invites", "type": "subtask", "priority": "medium"}]}}'
const EVAL_PASS = '{"pass": true, "feedback": "ok"}'
const EVAL_FAIL = '{"pass": false, "feedback": "Two high-priority items at same level"}'

beforeEach(() => {
  vi.mocked(generateText).mockReset()
})

describe('organizeAgent', () => {
  it('returns a hierarchy with a title and type', async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce({ text: HIERARCHY_JSON } as any)
      .mockResolvedValueOnce({ text: EVAL_PASS } as any)
    const result = await organizeAgent('Schedule team meeting', 'Task')
    expect(result.hierarchy).toHaveProperty('title')
    expect(result.hierarchy).toHaveProperty('type')
    expect(result.hierarchy).toHaveProperty('priority')
  })

  it('hierarchy root type is project, task, or note', async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce({ text: HIERARCHY_JSON } as any)
      .mockResolvedValueOnce({ text: EVAL_PASS } as any)
    const result = await organizeAgent('Schedule team meeting', 'Task')
    expect(['project', 'task', 'subtask', 'note']).toContain(result.hierarchy.type)
  })

  it('children is an array when present', async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce({ text: HIERARCHY_JSON } as any)
      .mockResolvedValueOnce({ text: EVAL_PASS } as any)
    const result = await organizeAgent('Schedule team meeting', 'Task')
    if (result.hierarchy.children) {
      expect(Array.isArray(result.hierarchy.children)).toBe(true)
    }
  })
})

describe('evaluator-optimizer loop', () => {
  it('returns result immediately when evaluator passes on first attempt', async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce({ text: HIERARCHY_JSON } as any)
      .mockResolvedValueOnce({ text: EVAL_PASS } as any)

    const result = await organizeAgent('Schedule team meeting', 'Task')

    expect(vi.mocked(generateText)).toHaveBeenCalledTimes(2)
    expect(result.hierarchy).toHaveProperty('title')
  })

  it('retries once when evaluator fails then passes', async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce({ text: HIERARCHY_JSON } as any) // 1st organize
      .mockResolvedValueOnce({ text: EVAL_FAIL } as any)       // 1st eval - fail
      .mockResolvedValueOnce({ text: HIERARCHY_JSON } as any) // 2nd organize
      .mockResolvedValueOnce({ text: EVAL_PASS } as any)       // 2nd eval - pass

    const result = await organizeAgent('Schedule team meeting', 'Task')

    expect(vi.mocked(generateText)).toHaveBeenCalledTimes(4)
    expect(result.hierarchy).toHaveProperty('title')

    // Second organize call prompt should contain the feedback
    const secondOrganizeCall = vi.mocked(generateText).mock.calls[2][0] as any
    expect(secondOrganizeCall.prompt).toContain('Two high-priority items at same level')
  })

  it('returns last result after max retries even if evaluator still fails', async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce({ text: HIERARCHY_JSON } as any) // 1st organize
      .mockResolvedValueOnce({ text: EVAL_FAIL } as any)       // 1st eval
      .mockResolvedValueOnce({ text: HIERARCHY_JSON } as any) // 2nd organize
      .mockResolvedValueOnce({ text: EVAL_FAIL } as any)       // 2nd eval
      .mockResolvedValueOnce({ text: HIERARCHY_JSON } as any) // 3rd organize
      .mockResolvedValueOnce({ text: EVAL_FAIL } as any)       // 3rd eval

    const result = await organizeAgent('Schedule team meeting', 'Task')

    expect(vi.mocked(generateText)).toHaveBeenCalledTimes(6)
    expect(result.hierarchy).toHaveProperty('title')
  })

  it('evaluator call receives the hierarchy as JSON in the prompt', async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce({ text: HIERARCHY_JSON } as any)
      .mockResolvedValueOnce({ text: EVAL_PASS } as any)

    await organizeAgent('Schedule team meeting', 'Task')

    const evalCall = vi.mocked(generateText).mock.calls[1][0] as any
    expect(evalCall.prompt).toContain('"title":"Plan Team Meeting"')
  })
})
