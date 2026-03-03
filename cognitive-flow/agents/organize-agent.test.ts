import { describe, it, expect, vi } from 'vitest'

const mockHierarchy = vi.hoisted(() => ({
  title: 'Project Kickoff',
  type: 'project',
  priority: 'high',
  children: [
    { title: 'Schedule meeting', type: 'task', priority: 'high' },
    { title: 'Send invites', type: 'subtask', priority: 'medium' },
  ]
}))

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: '{"hierarchy": {"title": "Project Kickoff", "type": "project", "priority": "high", "children": [{"title": "Schedule meeting", "type": "task", "priority": "high"}, {"title": "Send invites", "type": "subtask", "priority": "medium"}]}}',
  }),
}))

vi.mock('@/lib/groq', () => ({
  groq: vi.fn().mockReturnValue('mocked-groq-model'),
  FAST_MODEL: 'llama-3.3-70b-versatile',
}))

import { organizeAgent } from './organize-agent'

describe('organizeAgent', () => {
  it('returns a hierarchy with a title and type', async () => {
    const result = await organizeAgent('Schedule team meeting', 'Task')
    expect(result.hierarchy).toHaveProperty('title')
    expect(result.hierarchy).toHaveProperty('type')
    expect(result.hierarchy).toHaveProperty('priority')
  })

  it('hierarchy root type is project, task, or note', async () => {
    const result = await organizeAgent('Schedule team meeting', 'Task')
    expect(['project', 'task', 'subtask', 'note']).toContain(result.hierarchy.type)
  })

  it('children is an array when present', async () => {
    const result = await organizeAgent('Schedule team meeting', 'Task')
    if (result.hierarchy.children) {
      expect(Array.isArray(result.hierarchy.children)).toBe(true)
    }
  })
})
