'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VoiceCapture from '@/components/ui/adhd-optimized/VoiceCapture'
import ThoughtCard from '@/components/ui/adhd-optimized/ThoughtCard'
import { saveThought, getThoughts } from '@/memory/session'
import type { CapturedThought } from '@/types/thought'

const listVariants = {
  show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1,  y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
}

export default function HomePage() {
  const [thoughts, setThoughts] = useState<CapturedThought[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setThoughts(getThoughts())
  }, [])

  const handleCapture = useCallback(async (rawText: string) => {
    setIsProcessing(true)
    setError(null)
    const sessionId = sessionStorage.getItem('cf_session_id') ?? (() => {
      const id = crypto.randomUUID?.() ??
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
        })
      sessionStorage.setItem('cf_session_id', id)
      return id
    })()

    try {
      const res = await fetch('/api/process-thought', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, sessionId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Processing failed')
      }
      const thought: CapturedThought = await res.json()
      saveThought(thought)
      setThoughts(prev => [thought, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Your text is saved — please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const filtered = search.trim()
    ? thoughts.filter(t =>
        t.cleanedText.toLowerCase().includes(search.toLowerCase())
      )
    : thoughts

  return (
    <main className="flex flex-col h-full pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-primary">Cognitive Flow</h1>
      </header>

      {/* Search bar — sticky below header */}
      <div className="px-4 py-2 border-b border-border flex-shrink-0">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search thoughts…"
          aria-label="Search thoughts"
          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Thoughts list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filtered.length === 0 && !isProcessing && (
          <p className="text-muted text-sm text-center mt-8">
            {search ? 'No thoughts match your search' : 'Your captured thoughts will appear here'}
          </p>
        )}
        <motion.div
          className="flex flex-col gap-3"
          initial="hidden"
          animate="show"
          variants={listVariants}
        >
          <AnimatePresence>
            {filtered.map((thought) => (
              <motion.div
                key={thought.id}
                variants={itemVariants}
                exit={{ opacity: 0, y: -4 }}
              >
                <ThoughtCard thought={thought} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-surface border-t border-border flex-shrink-0">
          <p className="text-sm text-muted">{error}</p>
        </div>
      )}

      {/* Voice capture — thumb zone */}
      <div className="flex-shrink-0 border-t border-border py-4">
        <VoiceCapture onCapture={handleCapture} isProcessing={isProcessing} />
      </div>
    </main>
  )
}
