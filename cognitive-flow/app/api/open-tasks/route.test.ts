import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/memory/tasks', () => ({ getOpenTasks: vi.fn() }))

import { GET } from '@/app/api/open-tasks/route'
import { getOpenTasks } from '@/memory/tasks'

describe('GET /api/open-tasks', () => {
  it('returns 400 when sessionId missing', async () => {
    const req = new NextRequest('http://localhost/api/open-tasks')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns tasks for valid sessionId', async () => {
    vi.mocked(getOpenTasks).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/open-tasks?sessionId=sess1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks).toEqual([])
  })
})
