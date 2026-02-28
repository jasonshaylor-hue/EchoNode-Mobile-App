'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VoiceCapture from '@/components/ui/adhd-optimized/VoiceCapture'
import ThoughtCard from '@/components/ui/adhd-optimized/ThoughtCard'
import { saveThought, getThoughts } from '@/memory/session'
import type { CapturedThought } from '@/types/thought'

export default function HomePage() {
  const [thoughts, setThoughts] = useState<CapturedThought[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setThoughts(getThoughts())
  }, [])

  const handleCapture = useCallback(async (rawText: string) => {
    setIsProcessing(true)
    setError(null)
    const sessionId = sessionStorage.getItem('cf_session_id') ?? (() => {
      const id = crypto.randomUUID()
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
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Your text is saved — please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return (
    <main className="flex flex-col h-screen pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-primary">Cognitive Flow</h1>
      </header>

      {/* Thoughts list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {thoughts.length === 0 && !isProcessing && (
          <p className="text-muted text-sm text-center mt-8">
            Your captured thoughts will appear here
          </p>
        )}
        <AnimatePresence>
          {thoughts.map((thought) => (
            <motion.div
              key={thought.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <ThoughtCard thought={thought} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-surface border-t border-border">
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
