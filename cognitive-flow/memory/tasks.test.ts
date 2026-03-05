import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.hoisted(() => vi.fn())
const mockUpdate = vi.hoisted(() => vi.fn())
const mockInsert = vi.hoisted(() => vi.fn())
const mockSelect = vi.hoisted(() => vi.fn())
const mockUpsert = vi.hoisted(() => vi.fn())
const mockIn = vi.hoisted(() => vi.fn())
const mockEq = vi.hoisted(() => vi.fn())
const mockIlike = vi.hoisted(() => vi.fn())
const mockLimit = vi.hoisted(() => vi.fn())
const mockOrder = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      upsert: mockUpsert,
      delete: mockDelete,
    })),
  },
}))

// Chain setup helper
function setupChain(returnValue: object) {
  mockSelect.mockReturnValue({ eq: mockEq, ilike: mockIlike, in: mockIn, order: mockOrder })
  mockEq.mockReturnValue({ eq: mockEq, ilike: mockIlike, status: 'open', order: mockOrder, single: mockSingle })
  mockIlike.mockReturnValue({ limit: mockLimit })
  mockLimit.mockReturnValue({ single: mockSingle })
  mockOrder.mockResolvedValue(returnValue)
  mockSingle.mockResolvedValue(returnValue)
  mockIn.mockReturnValue({ order: mockOrder })
  mockInsert.mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockUpsert.mockResolvedValue({ error: null })
}

beforeEach(() => vi.clearAllMocks())

describe('upsertTasks', () => {
  it('inserts new task when no match found', async () => {
    setupChain({ data: null, error: null })
    const { upsertTasks } = await import('@/memory/tasks')
    await upsertTasks([{ title: 'New task', priority: 'high' }], 'sess1', 'th1')
    expect(mockInsert).toHaveBeenCalled()
  })

  it('increments mention_count when matching task found', async () => {
    setupChain({ data: { id: 'existing-id', mention_count: 2 }, error: null })
    const { upsertTasks } = await import('@/memory/tasks')
    await upsertTasks([{ title: 'Existing task', priority: 'medium' }], 'sess1', 'th1')
    expect(mockUpdate).toHaveBeenCalledWith({ mention_count: 3 })
  })
})

describe('getOpenTasks', () => {
  it('returns empty array on error', async () => {
    setupChain({ data: null, error: { message: 'fail' } })
    const { getOpenTasks } = await import('@/memory/tasks')
    const result = await getOpenTasks('sess1')
    expect(result).toEqual([])
  })
})

describe('completeTask', () => {
  it('throws on supabase error', async () => {
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'fail' } }) })
    const { completeTask } = await import('@/memory/tasks')
    await expect(completeTask('task1')).rejects.toBeDefined()
  })
})

describe('deleteTask', () => {
  it('calls supabase delete with the given id', async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
    mockDelete.mockReturnValue({ eq: mockDeleteEq })
    const { deleteTask } = await import('@/memory/tasks')
    await deleteTask('task-xyz')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'task-xyz')
  })

  it('throws when supabase returns an error', async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: { message: 'fail' } })
    mockDelete.mockReturnValue({ eq: mockDeleteEq })
    const { deleteTask } = await import('@/memory/tasks')
    await expect(deleteTask('task-xyz')).rejects.toBeDefined()
  })
})

describe('getCompletedTasks', () => {
  it('returns mapped tasks when status is done', async () => {
    setupChain({
      data: [{
        id: 't1', session_id: 'sess1', thought_id: 'th1',
        title: 'Done task', priority: 'low', status: 'done',
        mention_count: 1, created_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-02T00:00:00Z',
      }],
      error: null,
    })
    const { getCompletedTasks } = await import('@/memory/tasks')
    const result = await getCompletedTasks('sess1')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Done task')
    expect(result[0].status).toBe('done')
  })

  it('returns empty array on error', async () => {
    setupChain({ data: null, error: { message: 'fail' } })
    const { getCompletedTasks } = await import('@/memory/tasks')
    const result = await getCompletedTasks('sess1')
    expect(result).toEqual([])
  })
})
