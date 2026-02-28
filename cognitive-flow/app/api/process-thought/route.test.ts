import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/agents/capture-agent', () => ({
  captureAgent: vi.fn().mockResolvedValue({
    cleanedText: 'Schedule team meeting',
    intent: 'User wants a kickoff meeting',
  }),
}))

vi.mock('@/agents/classify-agent', () => ({
  classifyAgent: vi.fn().mockResolvedValue({ category: 'Task' }),
}))

vi.mock('@/agents/organize-agent', () => ({
  organizeAgent: vi.fn().mockResolvedValue({
    hierarchy: { title: 'Team Meeting', type: 'project', priority: 'high' },
  }),
}))

vi.mock('@/memory/supabase', () => ({
  persistThought: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('mock-uuid') }))

import { POST } from './route'

describe('POST /api/process-thought', () => {
  it('returns 400 when rawText is missing', async () => {
    const req = new NextRequest('http://localhost/api/process-thought', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with a CapturedThought on success', async () => {
    const req = new NextRequest('http://localhost/api/process-thought', {
      method: 'POST',
      body: JSON.stringify({ rawText: 'um schedule a team meeting', sessionId: 'sess-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('cleanedText', 'Schedule team meeting')
    expect(body).toHaveProperty('category', 'Task')
    expect(body).toHaveProperty('hierarchy')
  })
})
