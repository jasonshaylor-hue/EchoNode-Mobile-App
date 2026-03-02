export type ThoughtCategory = 'Task' | 'Idea' | 'Reference'

export interface ProjectNode {
  title: string
  type: 'project' | 'task' | 'subtask' | 'note'
  priority: 'high' | 'medium' | 'low'
  children?: ProjectNode[]
}

export interface CapturedThought {
  id: string
  rawText: string
  cleanedText: string
  category: ThoughtCategory
  intent: string
  hierarchy: ProjectNode
  createdAt: string
  sessionId: string
}

export interface Task {
  id: string
  sessionId: string
  thoughtId: string
  title: string
  priority: 'high' | 'medium' | 'low'
  status: 'open' | 'done'
  mentionCount: number
  createdAt: string
  completedAt?: string
}

export interface NextTaskResult {
  task: Task | null
  rationale: string
}
