import { describe, it, expect, expectTypeOf } from 'vitest'
import type { CapturedThought, NextTaskResult, ProjectNode, Task, ThoughtCategory } from './thought'

describe('CapturedThought types', () => {
  it('ThoughtCategory is a union of three strings', () => {
    expectTypeOf<ThoughtCategory>().toEqualTypeOf<'Task' | 'Idea' | 'Reference'>()
  })

  it('ProjectNode can be nested recursively', () => {
    const node: ProjectNode = {
      title: 'Project',
      type: 'project',
      priority: 'high',
      children: [
        { title: 'Sub', type: 'task', priority: 'low' }
      ]
    }
    expectTypeOf(node).toMatchTypeOf<ProjectNode>()
  })

  it('CapturedThought has all required fields', () => {
    expectTypeOf<CapturedThought>().toHaveProperty('id')
    expectTypeOf<CapturedThought>().toHaveProperty('rawText')
    expectTypeOf<CapturedThought>().toHaveProperty('cleanedText')
    expectTypeOf<CapturedThought>().toHaveProperty('category')
    expectTypeOf<CapturedThought>().toHaveProperty('hierarchy')
    expectTypeOf<CapturedThought>().toHaveProperty('sessionId')
    expectTypeOf<CapturedThought>().toHaveProperty('intent')
    expectTypeOf<CapturedThought>().toHaveProperty('createdAt')
  })

  it('Task has required fields', () => {
    const task: Task = {
      id: 'abc',
      sessionId: 'sess',
      thoughtId: 'th1',
      title: 'Write tests',
      priority: 'high',
      status: 'open',
      mentionCount: 1,
      createdAt: new Date().toISOString(),
    }
    expect(task.status).toBe('open')
    expect(task.completedAt).toBeUndefined()
  })

  it('NextTaskResult allows null task', () => {
    const result: NextTaskResult = { task: null, rationale: 'No tasks.' }
    expect(result.task).toBeNull()
  })
})
