# Focus Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Focus tab with AI-powered daily task management — extracting tasks from brain dumps, surfacing a daily top 3, and answering "What do I do next?" in one tap.

**Architecture:** Task nodes are extracted from brain dump hierarchies (fire-and-forget) and stored in Supabase. A Focus tab fetches and displays them grouped by priority, with a "What do I do next?" button that calls an AI agent to pick the single best task. Daily focus is cached per session per day to avoid regenerating on every load.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vercel AI SDK (`generateText`), Supabase (PostgreSQL), Framer Motion, Vitest, Tailwind v4

**Working directory:** `cognitive-flow/` (all paths below are relative to this)

**Run tests:** `npm test` (Vitest)
**Run build:** `npm run build`
**Run dev:** `npm run dev -- --port 4000`

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/002_tasks.sql`

**Step 1: Create the migration file**

```sql
-- Tasks extracted from brain dump hierarchies
CREATE TABLE IF NOT EXISTS tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    text NOT NULL,
  thought_id    uuid REFERENCES thoughts(id),
  title         text NOT NULL,
  priority      text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  mention_count int  NOT NULL DEFAULT 1,
  created_at    timestamptz DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS tasks_session_status_idx  ON tasks(session_id, status);
CREATE INDEX IF NOT EXISTS tasks_mention_count_idx   ON tasks(mention_count DESC);

-- Daily AI-picked focus tasks (cached per session per day)
CREATE TABLE IF NOT EXISTS daily_focus (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text NOT NULL,
  focus_date  date NOT NULL,
  task_ids    uuid[] NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(session_id, focus_date)
);
```

**Step 2: Apply migration in Supabase**

Go to https://supabase.com/dashboard/project/srnlbuxezlnoczrniyvb/sql/new, paste the SQL above, and click Run.

**Step 3: Commit**

```bash
git add supabase/migrations/002_tasks.sql
git commit -m "feat: add tasks and daily_focus DB migration"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `types/thought.ts`
- Modify: `types/thought.test.ts`

**Step 1: Add Task and NextTaskResult types to `types/thought.ts`**

Append after the existing `CapturedThought` interface:

```typescript
export interface Task {
  id: string
  sessionId: string
  thoughtId: string
  title: string
  priority: 'high' | 'medium' | 'low'
  status: 'open' | 'done'
  mentionCount: number
  createdAt: string
  completedAt?: string
}

export interface NextTaskResult {
  task: Task | null
  rationale: string
}
```

**Step 2: Add type tests to `types/thought.test.ts`**

Append to the existing describe block:

```typescript
it('Task has required fields', () => {
  const task: Task = {
    id: 'abc',
    sessionId: 'sess',
    thoughtId: 'th1',
    title: 'Write tests',
    priority: 'high',
    status: 'open',
    mentionCount: 1,
    createdAt: new Date().toISOString(),
  }
  expect(task.status).toBe('open')
  expect(task.completedAt).toBeUndefined()
})

it('NextTaskResult allows null task', () => {
  const result: NextTaskResult = { task: null, rationale: 'No tasks.' }
  expect(result.task).toBeNull()
})
```

**Step 3: Run tests**

```bash
npm test types/thought.test.ts
```
Expected: all tests PASS

**Step 4: Commit**

```bash
git add types/thought.ts types/thought.test.ts
git commit -m "feat: add Task and NextTaskResult types"
```

---

### Task 3: Task Extraction Utility

**Files:**
- Create: `lib/extract-tasks.ts`
- Create: `lib/extract-tasks.test.ts`

**Step 1: Write the failing test — create `lib/extract-tasks.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { extractTasks } from '@/lib/extract-tasks'
import type { ProjectNode } from '@/types/thought'

describe('extractTasks', () => {
  it('extracts task nodes from hierarchy', () => {
    const node: ProjectNode = {
      title: 'Build feature',
      type: 'project',
      priority: 'high',
      children: [
        { title: 'Write tests', type: 'task', priority: 'high' },
        { title: 'Implement', type: 'task', priority: 'medium' },
      ],
    }
    const result = extractTasks(node)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Write tests')
    expect(result[0].priority).toBe('high')
  })

  it('extracts subtask nodes recursively', () => {
    const node: ProjectNode = {
      title: 'Project',
      type: 'project',
      priority: 'medium',
      children: [
        {
          title: 'Main task',
          type: 'task',
          priority: 'high',
          children: [{ title: 'Sub item', type: 'subtask', priority: 'low' }],
        },
      ],
    }
    const result = extractTasks(node)
    expect(result).toHaveLength(2)
    expect(result[1].title).toBe('Sub item')
  })

  it('ignores project and note type nodes', () => {
    const node: ProjectNode = {
      title: 'Big project',
      type: 'project',
      priority: 'high',
      children: [{ title: 'A note', type: 'note', priority: 'low' }],
    }
    expect(extractTasks(node)).toHaveLength(0)
  })

  it('returns empty array for a lone note node', () => {
    const node: ProjectNode = { title: 'Single note', type: 'note', priority: 'low' }
    expect(extractTasks(node)).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test lib/extract-tasks.test.ts
```
Expected: FAIL — "Cannot find module '@/lib/extract-tasks'"

**Step 3: Implement `lib/extract-tasks.ts`**

```typescript
import type { ProjectNode } from '@/types/thought'

export interface ExtractedTask {
  title: string
  priority: 'high' | 'medium' | 'low'
}

export function extractTasks(node: ProjectNode, tasks: ExtractedTask[] = []): ExtractedTask[] {
  if (node.type === 'task' || node.type === 'subtask') {
    tasks.push({ title: node.title, priority: node.priority })
  }
  for (const child of node.children ?? []) {
    extractTasks(child, tasks)
  }
  return tasks
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test lib/extract-tasks.test.ts
```
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add lib/extract-tasks.ts lib/extract-tasks.test.ts
git commit -m "feat: add task extraction utility for hierarchy tree walking"
```

---

### Task 4: Supabase Task Memory

**Files:**
- Create: `memory/tasks.ts`
- Create: `memory/tasks.test.ts`

**Step 1: Write the failing tests — create `memory/tasks.test.ts`**

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
npm test memory/tasks.test.ts
```
Expected: FAIL — "Cannot find module '@/memory/tasks'"

**Step 3: Implement `memory/tasks.ts`**

```typescript
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/thought'
import type { ExtractedTask } from '@/lib/extract-tasks'

export async function upsertTasks(
  tasks: ExtractedTask[],
  sessionId: string,
  thoughtId: string
): Promise<void> {
  for (const task of tasks) {
    const { data: existing } = await (supabase.from('tasks') as any)
      .select('id, mention_count')
      .eq('session_id', sessionId)
      .eq('status', 'open')
      .ilike('title', `%${task.title}%`)
      .limit(1)
      .single()

    if (existing) {
      await (supabase.from('tasks') as any)
        .update({ mention_count: existing.mention_count + 1 })
        .eq('id', existing.id)
    } else {
      await (supabase.from('tasks') as any).insert({
        session_id: sessionId,
        thought_id: thoughtId,
        title: task.title,
        priority: task.priority,
      })
    }
  }
}

export async function getOpenTasks(sessionId: string): Promise<Task[]> {
  const { data, error } = await (supabase.from('tasks') as any)
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'open')
    .order('mention_count', { ascending: false })

  if (error || !data) return []
  return data.map(dbToTask)
}

export async function completeTask(taskId: string): Promise<void> {
  const { error } = await (supabase.from('tasks') as any)
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) {
    console.error('[supabase] complete task failed:', error.message)
    throw error
  }
}

export async function getDailyFocusTasks(
  sessionId: string,
  date: string
): Promise<Task[] | null> {
  const { data: focusData } = await (supabase.from('daily_focus') as any)
    .select('task_ids')
    .eq('session_id', sessionId)
    .eq('focus_date', date)
    .single()

  if (!focusData) return null

  const { data, error } = await (supabase.from('tasks') as any)
    .select('*')
    .in('id', focusData.task_ids)

  if (error || !data) return null
  return data.map(dbToTask)
}

export async function setDailyFocusTasks(
  sessionId: string,
  date: string,
  taskIds: string[]
): Promise<void> {
  await (supabase.from('daily_focus') as any).upsert({
    session_id: sessionId,
    focus_date: date,
    task_ids: taskIds,
  })
}

function dbToTask(row: any): Task {
  return {
    id: row.id,
    sessionId: row.session_id,
    thoughtId: row.thought_id,
    title: row.title,
    priority: row.priority,
    status: row.status,
    mentionCount: row.mention_count,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  }
}
```

**Step 4: Run tests**

```bash
npm test memory/tasks.test.ts
```
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add memory/tasks.ts memory/tasks.test.ts
git commit -m "feat: add Supabase task memory layer with upsert and completion"
```

---

### Task 5: Wire Task Extraction into process-thought

**Files:**
- Modify: `app/api/process-thought/route.ts`
- Modify: `app/api/process-thought/route.test.ts`

**Step 1: Add the two imports to `route.ts`** (after existing imports)

```typescript
import { extractTasks } from '@/lib/extract-tasks'
import { upsertTasks } from '@/memory/tasks'
```

**Step 2: Add fire-and-forget call after `persistThought`**

Replace:
```typescript
// Fire-and-forget — don't block response on Supabase
persistThought(thought).catch(() => {})
```
With:
```typescript
// Fire-and-forget — don't block response on Supabase
persistThought(thought).catch(() => {})
upsertTasks(extractTasks(thought.hierarchy), thought.sessionId, thought.id).catch(() => {})
```

**Step 3: Add mock to `route.test.ts`** (after existing vi.mock calls)

```typescript
vi.mock('@/lib/extract-tasks', () => ({ extractTasks: vi.fn().mockReturnValue([]) }))
vi.mock('@/memory/tasks', () => ({ upsertTasks: vi.fn().mockResolvedValue(undefined) }))
```

**Step 4: Run tests**

```bash
npm test app/api/process-thought/route.test.ts
```
Expected: all tests PASS

**Step 5: Commit**

```bash
git add app/api/process-thought/route.ts app/api/process-thought/route.test.ts
git commit -m "feat: extract tasks from hierarchy after brain dump processing"
```

---

### Task 6: Next Task Agent

**Files:**
- Create: `agents/next-task-agent.ts`
- Create: `agents/next-task-agent.test.ts`

**Step 1: Write the failing test — create `agents/next-task-agent.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('ai', () => ({ generateText: vi.fn() }))
vi.mock('@/lib/groq', () => ({
  groq: vi.fn().mockReturnValue('mocked-groq-model'),
  FAST_MODEL: 'llama-3.3-70b-versatile',
}))

import { generateText } from 'ai'
import { nextTaskAgent } from '@/agents/next-task-agent'
import type { Task } from '@/types/thought'

const mockTask = (overrides = {}): Task => ({
  id: 'task-1',
  sessionId: 'sess',
  thoughtId: 'th1',
  title: 'Write tests',
  priority: 'high',
  status: 'open',
  mentionCount: 2,
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('nextTaskAgent', () => {
  it('returns null task when list is empty', async () => {
    const result = await nextTaskAgent([])
    expect(result.task).toBeNull()
    expect(result.rationale).toContain('No open tasks')
  })

  it('calls generateText and returns picked task', async () => {
    vi.mocked(generateText).mockResolvedValue({ text: '{"index": 1, "rationale": "High priority and repeated."}' } as any)
    const tasks = [mockTask()]
    const result = await nextTaskAgent(tasks)
    expect(result.task?.id).toBe('task-1')
    expect(result.rationale).toBe('High priority and repeated.')
  })

  it('strips markdown fences from AI response', async () => {
    vi.mocked(generateText).mockResolvedValue({ text: '```json\n{"index": 1, "rationale": "Do it."}\n```' } as any)
    const result = await nextTaskAgent([mockTask()])
    expect(result.task).not.toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test agents/next-task-agent.test.ts
```
Expected: FAIL

**Step 3: Implement `agents/next-task-agent.ts`**

```typescript
import { generateText } from 'ai'
import { groq, FAST_MODEL } from '@/lib/groq'
import type { Task, NextTaskResult } from '@/types/thought'

export async function nextTaskAgent(tasks: Task[]): Promise<NextTaskResult> {
  if (tasks.length === 0) {
    return { task: null, rationale: 'No open tasks — go capture something!' }
  }

  const taskList = tasks
    .slice(0, 10)
    .map((t, i) => `${i + 1}. [${t.priority}] "${t.title}" (mentioned ${t.mentionCount}x)`)
    .join('\n')

  const { text } = await generateText({
    model: groq(FAST_MODEL),
    system: `You are a focus assistant for someone with ADHD. Given a list of open tasks, pick the single best task to do right now.
Respond with ONLY valid JSON, no markdown, no explanation.
Format: {"index": <1-based task number>, "rationale": "one sentence why this task now"}`,
    prompt: `Tasks:\n${taskList}`,
  })

  const json = JSON.parse(text.trim().replace(/^```json\n?|```$/g, ''))
  const picked = tasks[json.index - 1]

  if (!picked) return { task: null, rationale: 'Could not determine best task.' }

  return { task: picked, rationale: json.rationale }
}
```

**Step 4: Run tests**

```bash
npm test agents/next-task-agent.test.ts
```
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add agents/next-task-agent.ts agents/next-task-agent.test.ts
git commit -m "feat: add next-task AI agent for ADHD focus recommendation"
```

---

### Task 7: API Routes — open-tasks, daily-focus, next-task, complete-task

**Files:**
- Create: `app/api/open-tasks/route.ts`
- Create: `app/api/open-tasks/route.test.ts`
- Create: `app/api/daily-focus/route.ts`
- Create: `app/api/daily-focus/route.test.ts`
- Create: `app/api/next-task/route.ts`
- Create: `app/api/next-task/route.test.ts`
- Create: `app/api/complete-task/route.ts`
- Create: `app/api/complete-task/route.test.ts`

**Step 1: Create `app/api/open-tasks/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getOpenTasks } from '@/memory/tasks'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }
  try {
    const tasks = await getOpenTasks(sessionId)
    return NextResponse.json({ tasks })
  } catch {
    return NextResponse.json({ error: 'Could not load tasks.' }, { status: 500 })
  }
}
```

**Step 2: Create `app/api/open-tasks/route.test.ts`**

```typescript
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
```

**Step 3: Create `app/api/daily-focus/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDailyFocusTasks, getOpenTasks, setDailyFocusTasks } from '@/memory/tasks'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  const date = searchParams.get('date')

  if (!sessionId || !date) {
    return NextResponse.json({ error: 'sessionId and date are required' }, { status: 400 })
  }

  try {
    const cached = await getDailyFocusTasks(sessionId, date)
    if (cached) return NextResponse.json({ tasks: cached })

    const allTasks = await getOpenTasks(sessionId)
    const top3 = allTasks.slice(0, 3)

    if (top3.length > 0) {
      await setDailyFocusTasks(sessionId, date, top3.map(t => t.id))
    }

    return NextResponse.json({ tasks: top3 })
  } catch (err) {
    console.error('[daily-focus] error:', err)
    return NextResponse.json({ error: 'Could not load daily focus.' }, { status: 500 })
  }
}
```

**Step 4: Create `app/api/daily-focus/route.test.ts`**

```typescript
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
```

**Step 5: Create `app/api/next-task/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getOpenTasks } from '@/memory/tasks'
import { nextTaskAgent } from '@/agents/next-task-agent'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sessionId } = body

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  try {
    const tasks = await getOpenTasks(sessionId)
    const result = await nextTaskAgent(tasks)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[next-task] error:', err)
    return NextResponse.json({ error: 'Could not determine next task.' }, { status: 500 })
  }
}
```

**Step 6: Create `app/api/next-task/route.test.ts`**

```typescript
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
```

**Step 7: Create `app/api/complete-task/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { completeTask } from '@/memory/tasks'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { taskId } = body

  if (!taskId || typeof taskId !== 'string') {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }

  try {
    await completeTask(taskId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not complete task.' }, { status: 500 })
  }
}
```

**Step 8: Create `app/api/complete-task/route.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/memory/tasks', () => ({ completeTask: vi.fn() }))

import { POST } from '@/app/api/complete-task/route'
import { completeTask } from '@/memory/tasks'

describe('POST /api/complete-task', () => {
  it('returns 400 when taskId missing', async () => {
    const req = new NextRequest('http://localhost/api/complete-task', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns success on valid taskId', async () => {
    vi.mocked(completeTask).mockResolvedValue(undefined)
    const req = new NextRequest('http://localhost/api/complete-task', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when completeTask throws', async () => {
    vi.mocked(completeTask).mockRejectedValue(new Error('DB error'))
    const req = new NextRequest('http://localhost/api/complete-task', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
```

**Step 9: Run all new API tests**

```bash
npm test app/api/open-tasks app/api/daily-focus app/api/next-task app/api/complete-task
```
Expected: all tests PASS

**Step 10: Commit**

```bash
git add app/api/open-tasks app/api/daily-focus app/api/next-task app/api/complete-task
git commit -m "feat: add open-tasks, daily-focus, next-task, complete-task API routes"
```

---

### Task 8: Tab Bar Component

**Files:**
- Create: `components/ui/TabBar.tsx`
- Create: `components/ui/TabBar.test.tsx`

**Step 1: Write the failing test — `components/ui/TabBar.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ usePathname: vi.fn().mockReturnValue('/') }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import TabBar from '@/components/ui/TabBar'

describe('TabBar', () => {
  it('renders both tabs', () => {
    render(<TabBar />)
    expect(screen.getByText('Capture')).toBeInTheDocument()
    expect(screen.getByText('Focus')).toBeInTheDocument()
  })

  it('marks active tab with aria-current', () => {
    render(<TabBar />)
    const captureLink = screen.getByText('Capture').closest('a')
    expect(captureLink).toHaveAttribute('aria-current', 'page')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test components/ui/TabBar.test.tsx
```
Expected: FAIL

**Step 3: Implement `components/ui/TabBar.tsx`**

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: 'Capture', icon: '📥' },
  { href: '/focus', label: 'Focus', icon: '✓' },
]

export default function TabBar() {
  const pathname = usePathname()
  return (
    <nav
      className="flex-shrink-0 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
      style={{ minHeight: '49px' }}
      aria-label="Main navigation"
    >
      {TABS.map(tab => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-accent' : 'text-muted'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span aria-hidden="true" className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

**Step 4: Run tests**

```bash
npm test components/ui/TabBar.test.tsx
```
Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add components/ui/TabBar.tsx components/ui/TabBar.test.tsx
git commit -m "feat: add TabBar navigation component with active state"
```

---

### Task 9: TaskCard Component

**Files:**
- Create: `components/ui/adhd-optimized/TaskCard.tsx`
- Create: `components/ui/adhd-optimized/TaskCard.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import TaskCard from '@/components/ui/adhd-optimized/TaskCard'
import type { Task } from '@/types/thought'

const mockTask: Task = {
  id: 'task-1',
  sessionId: 'sess',
  thoughtId: 'th1',
  title: 'Write tests for new feature',
  priority: 'high',
  status: 'open',
  mentionCount: 3,
  createdAt: new Date().toISOString(),
}

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('Write tests for new feature')).toBeInTheDocument()
  })

  it('shows mention count when > 1', () => {
    render(<TaskCard task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText(/mentioned 3×/)).toBeInTheDocument()
  })

  it('does not show mention count when = 1', () => {
    render(<TaskCard task={{ ...mockTask, mentionCount: 1 }} onComplete={vi.fn()} />)
    expect(screen.queryByText(/mentioned/)).not.toBeInTheDocument()
  })

  it('calls onComplete when checkbox clicked', () => {
    const onComplete = vi.fn()
    render(<TaskCard task={mockTask} onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /Mark.*as done/i }))
    expect(onComplete).toHaveBeenCalledWith('task-1')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test components/ui/adhd-optimized/TaskCard.test.tsx
```
Expected: FAIL

**Step 3: Implement `components/ui/adhd-optimized/TaskCard.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Task } from '@/types/thought'

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  high: 'text-accent',
  medium: 'text-primary',
  low: 'text-muted',
}

interface TaskCardProps {
  task: Task
  onComplete: (taskId: string) => void
}

export default function TaskCard({ task, onComplete }: TaskCardProps) {
  const [completing, setCompleting] = useState(false)

  const handleComplete = () => {
    if (completing) return
    setCompleting(true)
    onComplete(task.id)
  }

  if (completing) return null

  return (
    <motion.div
      className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3"
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      <button
        onClick={handleComplete}
        className="w-6 h-6 min-w-[24px] rounded-full border-2 border-border flex-shrink-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent"
        aria-label={`Mark "${task.title}" as done`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary truncate">{task.title}</p>
        {task.mentionCount > 1 && (
          <p className="text-xs text-muted">mentioned {task.mentionCount}×</p>
        )}
      </div>
      <span className={`text-xs font-medium flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
        {task.priority}
      </span>
    </motion.div>
  )
}
```

**Step 4: Run tests**

```bash
npm test components/ui/adhd-optimized/TaskCard.test.tsx
```
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add components/ui/adhd-optimized/TaskCard.tsx components/ui/adhd-optimized/TaskCard.test.tsx
git commit -m "feat: add TaskCard component with checkbox completion and priority display"
```

---

### Task 10: Focus Page

**Files:**
- Create: `app/focus/page.tsx`
- Create: `app/focus/page.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))
vi.mock('@/components/ui/adhd-optimized/TaskCard', () => ({
  default: ({ task }: any) => <div data-testid="task-card">{task.title}</div>,
}))

// Mock fetch globally
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ tasks: [] }),
})

import FocusPage from '@/app/focus/page'

describe('FocusPage', () => {
  it('renders the What do I do next button', () => {
    render(<FocusPage />)
    expect(screen.getByRole('button', { name: /what do i do next/i })).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test app/focus/page.test.tsx
```
Expected: FAIL

**Step 3: Implement `app/focus/page.tsx`**

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TaskCard from '@/components/ui/adhd-optimized/TaskCard'
import type { Task, NextTaskResult } from '@/types/thought'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem('cf_session_id') ?? ''
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export default function FocusPage() {
  const [focusTasks, setFocusTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [nextTaskResult, setNextTaskResult] = useState<NextTaskResult | null>(null)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = getSessionId()
    if (!sessionId) return
    const today = getToday()

    Promise.all([
      fetch(`/api/daily-focus?sessionId=${sessionId}&date=${today}`).then(r => r.json()),
      fetch(`/api/open-tasks?sessionId=${sessionId}`).then(r => r.json()),
    ]).then(([focusRes, tasksRes]) => {
      setFocusTasks(focusRes.tasks ?? [])
      setAllTasks(tasksRes.tasks ?? [])
    }).catch(() => setError('Could not load tasks.'))
  }, [])

  const handleComplete = useCallback(async (taskId: string) => {
    setFocusTasks(prev => prev.filter(t => t.id !== taskId))
    setAllTasks(prev => prev.filter(t => t.id !== taskId))
    if (nextTaskResult?.task?.id === taskId) setNextTaskResult(null)

    try {
      const res = await fetch('/api/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setError("Couldn't save — tap to retry")
    }
  }, [nextTaskResult])

  const handleNextTask = useCallback(async () => {
    setIsLoadingNext(true)
    setNextTaskResult(null)
    try {
      const res = await fetch('/api/next-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: getSessionId() }),
      })
      const data: NextTaskResult = await res.json()
      setNextTaskResult(data)
    } catch {
      setError('Could not determine next task.')
    } finally {
      setIsLoadingNext(false)
    }
  }, [])

  const focusIds = new Set(focusTasks.map(t => t.id))
  const remaining = allTasks.filter(t => !focusIds.has(t.id))
  const high = remaining.filter(t => t.priority === 'high')
  const medium = remaining.filter(t => t.priority === 'medium')
  const low = remaining.filter(t => t.priority === 'low')

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
      {/* Today's Focus */}
      {focusTasks.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Today's Focus</h2>
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {focusTasks.map(task => (
                <motion.div key={task.id} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                  <TaskCard task={task} onComplete={handleComplete} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* What do I do next */}
      <section>
        <motion.button
          onClick={handleNextTask}
          disabled={isLoadingNext}
          whileTap={{ scale: 0.97 }}
          className="w-full min-h-[56px] bg-accent text-white rounded-xl font-medium text-base disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-accent/50"
          aria-label="What do I do next?"
        >
          {isLoadingNext ? 'Thinking...' : 'What do I do next? ↗'}
        </motion.button>

        <AnimatePresence>
          {nextTaskResult && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex flex-col gap-2"
            >
              {nextTaskResult.task && (
                <TaskCard task={nextTaskResult.task} onComplete={handleComplete} />
              )}
              <p className="text-xs text-muted px-1">{nextTaskResult.rationale}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* All Open Tasks */}
      {remaining.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">All Open Tasks</h2>
          {[{ label: 'HIGH', tasks: high }, { label: 'MEDIUM', tasks: medium }, { label: 'LOW', tasks: low }]
            .filter(g => g.tasks.length > 0)
            .map(group => (
              <div key={group.label} className="mb-3">
                <p className="text-xs text-muted mb-1">{group.label}</p>
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {group.tasks.map(task => (
                      <motion.div key={task.id} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                        <TaskCard task={task} onComplete={handleComplete} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
        </section>
      )}

      {/* Empty state */}
      {focusTasks.length === 0 && remaining.length === 0 && !isLoadingNext && (
        <div className="flex flex-col items-center mt-12 gap-2">
          <p className="text-muted text-sm text-center">No open tasks yet</p>
          <p className="text-muted text-xs text-center">Capture a thought to get started ↓</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-surface border border-border rounded-xl">
          <p className="text-sm text-muted">{error}</p>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run tests**

```bash
npm test app/focus/page.test.tsx
```
Expected: 1 test PASS

**Step 5: Commit**

```bash
git add app/focus/page.tsx app/focus/page.test.tsx
git commit -m "feat: add Focus page with daily tasks, next-task button, and completion"
```

---

### Task 11: Wire Tab Bar into Layout and Fix Heights

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

The tab bar must live in the layout so it persists across both pages. The `app/page.tsx` currently uses `h-screen` which must become `h-full` since the layout now owns the full screen height.

**Step 1: Update `app/layout.tsx`**

Replace the entire file:

```typescript
import type { Metadata, Viewport } from 'next'
import './globals.css'
import TabBar from '@/components/ui/TabBar'

export const metadata: Metadata = {
  title: 'Cognitive Flow',
  description: 'Voice-first ADHD productivity',
}

export const viewport: Viewport = {
  themeColor: '#0F0F0F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-primary h-dvh flex flex-col">
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
        <TabBar />
      </body>
    </html>
  )
}
```

**Step 2: Update `app/page.tsx`** — change `h-screen` to `h-full`

Find:
```typescript
<main className="flex flex-col h-screen pt-[env(safe-area-inset-top)]">
```

Replace with:
```typescript
<main className="flex flex-col h-full pt-[env(safe-area-inset-top)]">
```

**Step 3: Run full test suite**

```bash
npm test
```
Expected: all tests PASS

**Step 4: Run build**

```bash
npm run build
```
Expected: compiled successfully, no errors

**Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: add tab bar to layout, wire Capture and Focus navigation"
```

---

### Task 12: Full Smoke Test

**Step 1: Run all tests**

```bash
npm test
```
Expected: all tests PASS (should be 35+ tests)

**Step 2: Run build**

```bash
npm run build
```
Expected: compiled successfully

**Step 3: Start dev server and manually test the happy path**

```bash
npm run dev -- --port 4000
```

Open http://localhost:4000 and verify:
- [ ] Capture tab loads, mic button visible
- [ ] Focus tab loads, "What do I do next?" button visible
- [ ] Tab bar switches between pages without full reload
- [ ] Capture a thought → check Supabase `tasks` table has rows
- [ ] Focus tab shows tasks
- [ ] Check a task → it disappears from the list
- [ ] "What do I do next?" returns a task + rationale

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Focus Features — daily task intelligence with AI next-task"
```
