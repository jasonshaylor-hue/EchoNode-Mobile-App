import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/memory/tasks', () => ({ getOpenTasks: vi.fn() }))
vi.mock('@/agents/next-task-agent', () => ({ nextTaskAgent: vi.fn() }))

import { POST } from '@/app/api/next-task/route'
import { getOpenTasks } from '@/memory/tasks'
import { nextTaskAgent } from '@/agents/next-task-agent'

describe('POST /api/next-task', () => {
  it('returns 400 when sessionId missing', async () => {
    const req = new NextRequest('http://localhost/api/next-task', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns next task result', async () => {
    vi.mocked(getOpenTasks).mockResolvedValue([])
    vi.mocked(nextTaskAgent).mockResolvedValue({ task: null, rationale: 'No tasks.' })
    const req = new NextRequest('http://localhost/api/next-task', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rationale).toBe('No tasks.')
  })
})
