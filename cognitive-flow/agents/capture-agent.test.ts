import { describe, it, expect, vi } from 'vitest'

// Mock the AI SDK before importing the agent
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: '{"cleanedText": "Schedule team meeting for project kickoff", "intent": "User wants to organize a kickoff meeting"}',
  }),
}))

vi.mock('@/lib/groq', () => ({
  groq: vi.fn().mockReturnValue('mocked-groq-model'),
  FAST_MODEL: 'llama-3.3-70b-versatile',
}))

import { captureAgent } from './capture-agent'

describe('captureAgent', () => {
  it('returns cleanedText and intent from raw input', async () => {
    const result = await captureAgent(
      'um so like i need to uh schedule a team meeting thing for the project kickoff you know'
    )
    expect(result.cleanedText).toBe('Schedule team meeting for project kickoff')
    expect(result.intent).toBe('User wants to organize a kickoff meeting')
  })

  it('returns an object with cleanedText and intent keys', async () => {
    const result = await captureAgent('anything')
    expect(result).toHaveProperty('cleanedText')
    expect(result).toHaveProperty('intent')
  })
})
