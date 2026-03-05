import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/memory/tasks', () => ({ deleteTask: vi.fn() }))

import { POST } from '@/app/api/delete-task/route'
import { deleteTask } from '@/memory/tasks'

describe('POST /api/delete-task', () => {
  it('returns 400 when taskId missing', async () => {
    const req = new NextRequest('http://localhost/api/delete-task', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns success on valid taskId', async () => {
    vi.mocked(deleteTask).mockResolvedValue(undefined)
    const req = new NextRequest('http://localhost/api/delete-task', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when deleteTask throws', async () => {
    vi.mocked(deleteTask).mockRejectedValue(new Error('DB error'))
    const req = new NextRequest('http://localhost/api/delete-task', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
