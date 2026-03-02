import type { ProjectNode } from '@/types/thought'

export interface ExtractedTask {
  title: string
  priority: 'high' | 'medium' | 'low'
}

export function extractTasks(node: ProjectNode, tasks: ExtractedTask[] = []): ExtractedTask[] {
  if (node.type === 'task' || node.type === 'subtask') {
    tasks.push({ title: node.title, priority: node.priority })
  }
  for (const child of node.children ?? []) {
    extractTasks(child, tasks)
  }
  return tasks
}
