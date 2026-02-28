import { describe, it, expectTypeOf } from 'vitest'
import type { CapturedThought, ProjectNode, ThoughtCategory } from './thought'

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
  })
})
