import type { CapturedThought, ProjectNode } from '@/types/thought'

const CATEGORY_COLORS: Record<string, string> = {
  Task: 'text-accent border-accent',
  Idea: 'text-success border-success',
  Reference: 'text-muted border-muted',
}

function NodeTree({ node, depth = 0 }: { node: ProjectNode; depth?: number }) {
  if (depth > 2) return null
  return (
    <div className={depth > 0 ? 'ml-3 border-l border-border pl-3' : ''}>
      <p className="text-sm text-primary truncate">{node.title}</p>
      {node.children?.map((child, i) => (
        <NodeTree key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

interface ThoughtCardProps {
  thought: CapturedThought
}

export default function ThoughtCard({ thought }: ThoughtCardProps) {
  const categoryStyle = CATEGORY_COLORS[thought.category] ?? 'text-muted border-muted'
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${categoryStyle}`}>
          {thought.category}
        </span>
        <p className="text-primary text-sm font-medium truncate flex-1">
          {thought.cleanedText}
        </p>
      </div>
      <div className="mt-1">
        <NodeTree node={thought.hierarchy} />
      </div>
    </div>
  )
}
