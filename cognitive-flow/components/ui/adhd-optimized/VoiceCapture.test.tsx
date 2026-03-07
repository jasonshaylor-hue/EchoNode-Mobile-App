import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import VoiceCapture from './VoiceCapture'

vi.mock('framer-motion', () => ({
  motion: { button: ({ animate, transition, ...props }: any) => <button {...props} /> }
}))

let mockRecognitionInstance: any

class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = ''
  onresult: any = null
  onerror: any = null
  onend: any = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
  constructor() { mockRecognitionInstance = this }
}

describe('VoiceCapture', () => {
  const mockOnCapture = vi.fn()

  beforeEach(() => {
    mockOnCapture.mockClear()
    mockRecognitionInstance = null
    Object.defineProperty(window, 'SpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  it('always renders the textarea', () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    expect(screen.getByRole('textbox', { name: /type your thought/i })).toBeDefined()
  })

  it('always renders the textarea even when speech is not supported', async () => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, writable: true, configurable: true })
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, writable: true, configurable: true })
    await act(async () => {
      render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    })
    expect(screen.getByRole('textbox', { name: /type your thought/i })).toBeDefined()
  })

  it('renders the mic button when speech is supported', () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    expect(screen.getByRole('button', { name: /tap to speak/i })).toBeDefined()
  })

  it('disables the submit button when isProcessing is true', () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={true} />)
    const submitBtn = screen.getByRole('button', { name: /processing/i })
    expect(submitBtn).toHaveAttribute('disabled')
  })

  it('submits typed text when Capture Thought is clicked', () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'I need to call the doctor' } })
    fireEvent.click(screen.getByRole('button', { name: /capture thought/i }))
    expect(mockOnCapture).toHaveBeenCalledWith('I need to call the doctor')
  })

  it('populates textarea with speech result instead of auto-submitting', async () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    await act(async () => {
      mockRecognitionInstance.onresult({
        results: [[{ transcript: 'call the doctor' }]]
      })
    })
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('call the doctor')
    expect(mockOnCapture).not.toHaveBeenCalled()
  })

  it('shows error message when speech recognition fails', async () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    await act(async () => {
      mockRecognitionInstance.onerror({ error: 'not-allowed' })
    })
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText(/microphone access denied/i)).toBeDefined()
  })

  it('shows no-speech error message', async () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    await act(async () => {
      mockRecognitionInstance.onerror({ error: 'no-speech' })
    })
    expect(screen.getByText(/no speech detected/i)).toBeDefined()
  })
})
