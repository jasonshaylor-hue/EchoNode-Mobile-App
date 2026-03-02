import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/memory/tasks', () => ({
  getDailyFocusTasks: vi.fn(),
  getOpenTasks: vi.fn(),
  setDailyFocusTasks: vi.fn(),
}))

import { GET } from '@/app/api/daily-focus/route'
import { getDailyFocusTasks, getOpenTasks, setDailyFocusTasks } from '@/memory/tasks'

describe('GET /api/daily-focus', () => {
  it('returns 400 when params missing', async () => {
    const req = new NextRequest('http://localhost/api/daily-focus')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns cached focus when available', async () => {
    const cachedTask = { id: 't1', title: 'Test', priority: 'high', status: 'open', mentionCount: 1, sessionId: 's', thoughtId: 'th', createdAt: '' }
    vi.mocked(getDailyFocusTasks).mockResolvedValue([cachedTask] as any)
    const req = new NextRequest('http://localhost/api/daily-focus?sessionId=sess&date=2026-03-02')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks).toHaveLength(1)
  })

  it('generates and caches focus when not cached', async () => {
    vi.mocked(getDailyFocusTasks).mockResolvedValue(null)
    vi.mocked(getOpenTasks).mockResolvedValue([
      { id: 't1', title: 'Task 1', priority: 'high', status: 'open', mentionCount: 3, sessionId: 's', thoughtId: 'th', createdAt: '' },
    ] as any)
    vi.mocked(setDailyFocusTasks).mockResolvedValue(undefined)
    const req = new NextRequest('http://localhost/api/daily-focus?sessionId=sess&date=2026-03-02')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(setDailyFocusTasks).toHaveBeenCalledWith('sess', '2026-03-02', ['t1'])
  })
})
