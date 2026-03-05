'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TaskCard from '@/components/ui/adhd-optimized/TaskCard'
import SwipeableTaskCard from '@/components/ui/adhd-optimized/SwipeableTaskCard'
import type { Task, NextTaskResult } from '@/types/thought'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem('cf_session_id') ?? ''
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

type View = 'active' | 'completed'

export default function FocusPage() {
  const [view, setView] = useState<View>('active')
  const [focusTasks, setFocusTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [nextTaskResult, setNextTaskResult] = useState<NextTaskResult | null>(null)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const completedLoadedRef = useRef(false)

  useEffect(() => {
    const sessionId = getSessionId()
    if (!sessionId) return
    const today = getToday()
    Promise.all([
      fetch(`/api/daily-focus?sessionId=${sessionId}&date=${today}`).then(r => r.json()),
      fetch(`/api/open-tasks?sessionId=${sessionId}`).then(r => r.json()),
    ]).then(([focusRes, tasksRes]) => {
      setFocusTasks(focusRes.tasks ?? [])
      setAllTasks(tasksRes.tasks ?? [])
    }).catch(() => setError('Could not load tasks.'))
  }, [])

  const loadCompletedTasks = useCallback(async () => {
    const sessionId = getSessionId()
    if (!sessionId) return
    setIsLoadingCompleted(true)
    try {
      const res = await fetch(`/api/completed-tasks?sessionId=${sessionId}`)
      const data = await res.json()
      setCompletedTasks(data.tasks ?? [])
      completedLoadedRef.current = true
    } catch {
      setError('Could not load completed tasks.')
    } finally {
      setIsLoadingCompleted(false)
    }
  }, [])

  const handleTabChange = useCallback((tab: View) => {
    setView(tab)
    if (tab === 'completed' && !completedLoadedRef.current) loadCompletedTasks()
  }, [loadCompletedTasks])

  const handleComplete = useCallback(async (taskId: string) => {
    const completed = [...focusTasks, ...allTasks].find(t => t.id === taskId)
    setFocusTasks(prev => prev.filter(t => t.id !== taskId))
    setAllTasks(prev => prev.filter(t => t.id !== taskId))
    setNextTaskResult(prev => prev?.task?.id === taskId ? null : prev)
    if (completed) {
      setCompletedTasks(prev => [
        { ...completed, status: 'done' as const, completedAt: new Date().toISOString() },
        ...prev,
      ])
    }
    try {
      const res = await fetch('/api/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setError("Couldn't save — tap to retry")
    }
  }, [focusTasks, allTasks])

  const handleDelete = useCallback(async (taskId: string) => {
    setFocusTasks(prev => prev.filter(t => t.id !== taskId))
    setAllTasks(prev => prev.filter(t => t.id !== taskId))
    setNextTaskResult(prev => prev?.task?.id === taskId ? null : prev)
    try {
      await fetch('/api/delete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
    } catch {
      setError("Couldn't delete — please try again")
    }
  }, [])

  const handleNextTask = useCallback(async () => {
    setIsLoadingNext(true)
    setNextTaskResult(null)
    try {
      const res = await fetch('/api/next-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: getSessionId() }),
      })
      const data: NextTaskResult = await res.json()
      setNextTaskResult(data)
    } catch {
      setError('Could not determine next task.')
    } finally {
      setIsLoadingNext(false)
    }
  }, [])

  const focusIds = new Set(focusTasks.map(t => t.id))
  const remaining = allTasks.filter(t => !focusIds.has(t.id))
  const high = remaining.filter(t => t.priority === 'high')
  const medium = remaining.filter(t => t.priority === 'medium')
  const low = remaining.filter(t => t.priority === 'low')

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
      {/* Tab toggle */}
      <div className="flex rounded-xl bg-surface border border-border p-0.5 gap-0.5">
        {(['active', 'completed'] as View[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            aria-current={view === tab ? 'true' : undefined}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors duration-200 ${
              view === tab
                ? 'bg-accent text-white'
                : 'text-muted hover:text-primary'
            }`}
          >
            {tab === 'active' ? 'Active' : 'Completed'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'active' ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            {/* Today's Focus */}
            {focusTasks.length > 0 && (
              <section>
                <h2 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Today's Focus</h2>
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {focusTasks.map(task => (
                      <motion.div key={task.id} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                        <SwipeableTaskCard task={task} onComplete={handleComplete} onDelete={handleDelete} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* What do I do next */}
            <section>
              <motion.button
                onClick={handleNextTask}
                disabled={isLoadingNext}
                whileTap={{ scale: 0.97 }}
                className="w-full min-h-[56px] bg-accent text-white rounded-xl font-medium text-base disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-accent/50"
                aria-label="What do I do next?"
              >
                {isLoadingNext ? 'Thinking...' : 'What do I do next? ↗'}
              </motion.button>
              <AnimatePresence>
                {nextTaskResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 flex flex-col gap-2"
                  >
                    {nextTaskResult.task && (
                      <SwipeableTaskCard task={nextTaskResult.task} onComplete={handleComplete} onDelete={handleDelete} />
                    )}
                    <p className="text-xs text-muted px-1">{nextTaskResult.rationale}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* All Open Tasks */}
            {remaining.length > 0 && (
              <section>
                <h2 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">All Open Tasks</h2>
                {[{ label: 'HIGH', tasks: high }, { label: 'MEDIUM', tasks: medium }, { label: 'LOW', tasks: low }]
                  .filter(g => g.tasks.length > 0)
                  .map(group => (
                    <div key={group.label} className="mb-3">
                      <p className="text-xs text-muted mb-1">{group.label}</p>
                      <div className="flex flex-col gap-2">
                        <AnimatePresence>
                          {group.tasks.map(task => (
                            <motion.div key={task.id} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                              <SwipeableTaskCard task={task} onComplete={handleComplete} onDelete={handleDelete} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
              </section>
            )}

            {focusTasks.length === 0 && remaining.length === 0 && !isLoadingNext && (
              <div className="flex flex-col items-center mt-12 gap-2">
                <p className="text-muted text-sm text-center">No open tasks yet</p>
                <p className="text-muted text-xs text-center">Capture a thought to get started ↓</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="completed"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-2"
          >
            {isLoadingCompleted && (
              <p className="text-muted text-sm text-center mt-8">Loading...</p>
            )}
            {!isLoadingCompleted && completedTasks.length === 0 && (
              <div className="flex flex-col items-center mt-12 gap-2">
                <p className="text-muted text-sm text-center">No completed tasks yet</p>
                <p className="text-muted text-xs text-center">Complete a task to see it here</p>
              </div>
            )}
            <AnimatePresence>
              {completedTasks.map(task => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <TaskCard task={task} onComplete={() => {}} completed />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="px-4 py-2 bg-surface border border-border rounded-xl">
          <p className="text-sm text-muted">{error}</p>
        </div>
      )}
    </div>
  )
}
