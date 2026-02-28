import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import VoiceCapture from './VoiceCapture'

vi.mock('framer-motion', () => ({
  motion: { button: (props: any) => <button {...props} /> }
}))

class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = ''
  onresult: any = null
  onerror: any = null
  onend: any = null
  start = vi.fn()
  stop = vi.fn()
}

describe('VoiceCapture', () => {
  const mockOnCapture = vi.fn()

  beforeEach(() => {
    mockOnCapture.mockClear()
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

  it('renders the mic button with accessible label', () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    expect(screen.getByRole('button', { name: /hold to speak/i })).toBeDefined()
  })

  it('shows the textarea fallback when speech is not supported', async () => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, writable: true, configurable: true })
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, writable: true, configurable: true })
    await act(async () => {
      render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    })
    expect(screen.getByRole('textbox')).toBeDefined()
  })

  it('disables the button when isProcessing is true', () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={true} />)
    const button = screen.getByRole('button', { name: /processing/i })
    expect(button).toHaveAttribute('disabled')
  })
})
