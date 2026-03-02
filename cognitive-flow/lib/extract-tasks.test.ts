import { describe, it, expect } from 'vitest'
import { extractTasks } from '@/lib/extract-tasks'
import type { ProjectNode } from '@/types/thought'

describe('extractTasks', () => {
  it('extracts task nodes from hierarchy', () => {
    const node: ProjectNode = {
      title: 'Build feature',
      type: 'project',
      priority: 'high',
      children: [
        { title: 'Write tests', type: 'task', priority: 'high' },
        { title: 'Implement', type: 'task', priority: 'medium' },
      ],
    }
    const result = extractTasks(node)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Write tests')
    expect(result[0].priority).toBe('high')
  })

  it('extracts subtask nodes recursively', () => {
    const node: ProjectNode = {
      title: 'Project',
      type: 'project',
      priority: 'medium',
      children: [
        {
          title: 'Main task',
          type: 'task',
          priority: 'high',
          children: [{ title: 'Sub item', type: 'subtask', priority: 'low' }],
        },
      ],
    }
    const result = extractTasks(node)
    expect(result).toHaveLength(2)
    expect(result[1].title).toBe('Sub item')
  })

  it('ignores project and note type nodes', () => {
    const node: ProjectNode = {
      title: 'Big project',
      type: 'project',
      priority: 'high',
      children: [{ title: 'A note', type: 'note', priority: 'low' }],
    }
    expect(extractTasks(node)).toHaveLength(0)
  })

  it('returns empty array for a lone note node', () => {
    const node: ProjectNode = { title: 'Single note', type: 'note', priority: 'low' }
    expect(extractTasks(node)).toEqual([])
  })
})
