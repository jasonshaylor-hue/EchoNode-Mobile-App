'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

interface VoiceCaptureProps {
  onCapture: (text: string) => void
  isProcessing: boolean
}

export default function VoiceCapture({ onCapture, isProcessing }: VoiceCaptureProps) {
  const [isListening, setIsListening] = useState(false)
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    setHasSpeechSupport(true)
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setTextInput(transcript)
      setIsListening(false)
      setSpeechError(null)
    }

    recognition.onerror = (e: any) => {
      setIsListening(false)
      if (e.error === 'not-allowed') {
        setSpeechError('Microphone access denied — type instead')
      } else if (e.error === 'no-speech') {
        setSpeechError('No speech detected — try again')
      } else {
        setSpeechError('Speech capture failed — type instead')
      }
    }

    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition

    return () => {
      recognition.abort()
      recognitionRef.current = null
    }
  }, [])

  const handleMicPress = useCallback(() => {
    if (!recognitionRef.current || isProcessing) return
    setSpeechError(null)
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      setIsListening(true)
      try {
        recognitionRef.current.start()
      } catch {
        setIsListening(false)
        setSpeechError('Speech capture failed — type instead')
      }
    }
  }, [isListening, isProcessing])

  const handleSubmit = useCallback(() => {
    if (!textInput.trim() || isProcessing) return
    onCapture(textInput.trim())
    setTextInput('')
  }, [textInput, isProcessing, onCapture])

  return (
    <div className="w-full px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex gap-2 items-end">
        <textarea
          className="flex-1 min-h-[80px] bg-surface border border-border rounded-xl p-3 text-primary placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          placeholder={isListening ? 'Listening...' : "What's on your mind?"}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
          aria-label="Type your thought"
          disabled={isProcessing}
        />
        {hasSpeechSupport && (
          <motion.button
            onPointerDown={handleMicPress}
            disabled={isProcessing}
            animate={{ opacity: isListening ? [0.7, 1] : 1 }}
            transition={{ repeat: isListening ? Infinity : 0, duration: 1 }}
            className="min-h-[48px] min-w-[48px] w-12 h-12 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-accent/50 flex-shrink-0"
            aria-label={isListening ? 'Listening — tap to stop' : 'Tap to speak'}
            aria-pressed={isListening}
          >
            <span className="text-xl" aria-hidden="true">
              {isListening ? '🎙️' : '●'}
            </span>
          </motion.button>
        )}
      </div>
      {speechError && (
        <p className="text-sm text-red-400 mt-1" role="alert">{speechError}</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={isProcessing || !textInput.trim()}
        className="mt-2 w-full min-h-[48px] bg-accent text-white rounded-xl font-medium disabled:opacity-40"
      >
        {isProcessing ? 'Processing...' : 'Capture Thought'}
      </button>
    </div>
  )
}
