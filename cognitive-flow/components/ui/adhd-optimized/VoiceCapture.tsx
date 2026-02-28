'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

interface VoiceCaptureProps {
  onCapture: (text: string) => void
  isProcessing: boolean
}

export default function VoiceCapture({ onCapture, isProcessing }: VoiceCaptureProps) {
  const [isListening, setIsListening] = useState(false)
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true)
  const [textInput, setTextInput] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setHasSpeechSupport(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      onCapture(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    return () => {
      recognition.abort()
      recognitionRef.current = null
    }
  }, [onCapture])

  const handleMicPress = useCallback(() => {
    if (!recognitionRef.current || isProcessing) return
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }, [isListening, isProcessing])

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return
    onCapture(textInput.trim())
    setTextInput('')
  }, [textInput, onCapture])

  if (!hasSpeechSupport) {
    return (
      <div className="w-full px-4 pb-[env(safe-area-inset-bottom)]">
        <textarea
          className="w-full min-h-[120px] bg-surface border border-border rounded-xl p-4 text-primary placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="What's on your mind?"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleTextSubmit())}
          aria-label="Type your thought"
        />
        <button
          onClick={handleTextSubmit}
          disabled={isProcessing || !textInput.trim()}
          className="mt-2 w-full min-h-[48px] bg-accent text-white rounded-xl font-medium disabled:opacity-40"
        >
          {isProcessing ? 'Processing...' : 'Capture Thought'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 pb-[env(safe-area-inset-bottom)] px-4">
      <motion.button
        onPointerDown={handleMicPress}
        disabled={isProcessing}
        animate={{ opacity: isProcessing ? [0.6, 1] : isListening ? [0.7, 1] : 1 }}
        transition={{ repeat: isProcessing || isListening ? Infinity : 0, duration: 1 }}
        className="min-h-[56px] min-w-[56px] w-20 h-20 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 focus:outline-none focus:ring-4 focus:ring-accent/50"
        aria-label={isProcessing ? 'Processing...' : isListening ? 'Listening — tap to stop' : 'Hold to Speak'}
        aria-pressed={isListening}
      >
        <span className="text-2xl" aria-hidden="true">
          {isProcessing ? '⏳' : isListening ? '🎙️' : '●'}
        </span>
      </motion.button>
      <p className="text-muted text-sm">
        {isProcessing ? 'Processing...' : isListening ? 'Listening...' : "What's on your mind?"}
      </p>
    </div>
  )
}
