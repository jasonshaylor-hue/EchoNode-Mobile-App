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
