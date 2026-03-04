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
}

export default function TaskCard({ task, onComplete }: TaskCardProps) {
  const [completing, setCompleting] = useState(false)

  const handleComplete = () => {
    if (completing) return
    setCompleting(true)
    onComplete(task.id)
  }

  if (completing) return null

  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <GlassCard className="p-4 flex items-center gap-3">
        <button
          onClick={handleComplete}
          className="w-6 h-6 min-w-[24px] rounded-full border-2 border-border flex-shrink-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label={`Mark "${task.title}" as done`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-primary truncate">{task.title}</p>
          {task.mentionCount > 1 && (
            <p className="text-xs text-muted">mentioned {task.mentionCount}×</p>
          )}
        </div>
        <span className={`text-xs font-medium flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
      </GlassCard>
    </motion.div>
  )
}
