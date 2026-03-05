'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import TaskCard from './TaskCard'
import type { Task } from '@/types/thought'

const DELETE_THRESHOLD = -80

interface SwipeableTaskCardProps {
  task: Task
  onComplete: (id: string) => void
  onDelete: (id: string) => void
}

export default function SwipeableTaskCard({ task, onComplete, onDelete }: SwipeableTaskCardProps) {
  const x = useMotionValue(0)
  const deleteOpacity = useTransform(x, [-80, -20], [1, 0])
  const deleteScale = useTransform(x, [-80, -20], [1, 0.7])

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < DELETE_THRESHOLD) {
      onDelete(task.id)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete reveal background */}
      <motion.div
        style={{ opacity: deleteOpacity }}
        role="presentation"
        className="absolute inset-0 bg-red-500/80 flex items-center justify-end pr-5 rounded-2xl"
      >
        <motion.div style={{ scale: deleteScale }}>
          <Trash2 size={20} className="text-white" />
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragDirectionLock
        style={{ x }}
        onDragEnd={handleDragEnd}
      >
        <TaskCard task={task} onComplete={onComplete} />
      </motion.div>
    </div>
  )
}
