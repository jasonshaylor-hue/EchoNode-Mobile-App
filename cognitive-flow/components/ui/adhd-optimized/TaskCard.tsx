'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '@/components/ui/GlassCard'
import type { Task } from '@/types/thought'

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  high:   'text-accent',
  medium: 'text-primary',
  low:    'text-muted',
}

interface TaskCardProps {
  task: Task
  onComplete: (taskId: string) => void
  completed?: boolean
}

export default function TaskCard({ task, onComplete, completed = false }: TaskCardProps) {
  const [completing, setCompleting] = useState(false)

  const handleComplete = () => {
    if (completing || completed) return
    setCompleting(true)
    onComplete(task.id)
  }

  if (completing) return null

  return (
    <motion.div
      whileHover={completed ? undefined : { scale: 1.015 }}
      whileTap={completed ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <GlassCard className={`p-4 flex items-center gap-3 ${completed ? 'opacity-60' : ''}`}>
        {completed ? (
          <div className="w-6 h-6 min-w-[24px] rounded-full border-2 border-success/50 flex-shrink-0 flex items-center justify-center bg-success/10">
            <span className="text-success text-xs leading-none">✓</span>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            className="w-6 h-6 min-w-[24px] rounded-full border-2 border-border flex-shrink-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label={`Mark "${task.title}" as done`}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${completed ? 'text-muted line-through' : 'text-primary'}`}>
            {task.title}
          </p>
          {task.mentionCount > 1 && (
            <p className="text-xs text-muted">mentioned {task.mentionCount}×</p>
          )}
        </div>
        <span className={`text-xs font-medium flex-shrink-0 ${completed ? 'text-muted' : PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
      </GlassCard>
    </motion.div>
  )
}
