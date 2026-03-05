import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/memory/tasks', () => ({ getCompletedTasks: vi.fn() }))

import { GET } from '@/app/api/completed-tasks/route'
import { getCompletedTasks } from '@/memory/tasks'

describe('GET /api/completed-tasks', () => {
  it('returns 400 when sessionId missing', async () => {
    const req = new NextRequest('http://localhost/api/completed-tasks')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns tasks on valid sessionId', async () => {
    const mockTasks = [{ id: 't1', title: 'Done task', status: 'done' }]
    vi.mocked(getCompletedTasks).mockResolvedValue(mockTasks as any)
    const req = new NextRequest('http://localhost/api/completed-tasks?sessionId=sess1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks).toHaveLength(1)
  })

  it('returns 500 when getCompletedTasks throws', async () => {
    vi.mocked(getCompletedTasks).mockRejectedValue(new Error('DB error'))
    const req = new NextRequest('http://localhost/api/completed-tasks?sessionId=sess1')
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})
