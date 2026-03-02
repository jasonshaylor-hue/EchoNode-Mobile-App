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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      upsert: mockUpsert,
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
