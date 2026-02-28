# Cognitive Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a voice-first ADHD productivity MVP that transforms brain dumps into structured project hierarchies using an agent-first AI pipeline.

**Architecture:** Three sequential agents (capture → classify → organize) orchestrated by a single Next.js API route, with sessionStorage as L1 cache and Supabase as L2 persistence. Web Speech API handles voice input; Vercel AI SDK calls Groq (Llama 3.1 8B) for all AI logic.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion, Vercel AI SDK, Groq API, Supabase (PostgreSQL + pgvector), Vitest, React Testing Library

**Design Doc:** `docs/plans/2026-02-27-cognitive-flow-design.md`

---

## Prerequisites

Before starting:
1. Create a free Groq account at https://console.groq.com and copy your API key
2. Create a free Supabase project at https://app.supabase.com and copy the Project URL and anon key
3. Have Node.js 18+ installed

---

## Task 1: Scaffold the Next.js Project

**Files:**
- Create: `cognitive-flow/` (project root — all subsequent paths are relative to this)

**Step 1: Run the Next.js scaffolder**

```bash
cd "c:/Users/Jason/Projects/EchoNode Mobile App"
npx create-next-app@latest cognitive-flow \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --no-eslint
```

When prompted, accept all defaults.

**Step 2: Enter the project and install dependencies**

```bash
cd cognitive-flow
npm install ai groq-sdk @ai-sdk/groq
npm install @supabase/supabase-js @supabase/ssr
npm install framer-motion
npm install uuid zod
npm install -D @types/uuid vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 3: Create the folder structure**

```bash
mkdir -p agents memory components/ui/adhd-optimized lib types docs/plans
```

**Step 4: Create the .env.local file**

Create `cognitive-flow/.env.local` with this content (fill in your real keys):
```
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Step 5: Verify the dev server starts**

```bash
npm run dev
```

Expected: Server starts at http://localhost:3000 with default Next.js page. Stop with Ctrl+C.

**Step 6: Configure Vitest**

Create `cognitive-flow/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Create `cognitive-flow/vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

Add to `cognitive-flow/package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: scaffold Next.js project with dependencies and test config"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/thought.ts`
- Create: `types/thought.test.ts`

**Step 1: Write the failing type test**

Create `types/thought.test.ts`:
```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type { CapturedThought, ProjectNode, ThoughtCategory } from './thought'

describe('CapturedThought types', () => {
  it('ThoughtCategory is a union of three strings', () => {
    expectTypeOf<ThoughtCategory>().toEqualTypeOf<'Task' | 'Idea' | 'Reference'>()
  })

  it('ProjectNode can be nested recursively', () => {
    const node: ProjectNode = {
      title: 'Project',
      type: 'project',
      priority: 'high',
      children: [
        { title: 'Sub', type: 'task', priority: 'low' }
      ]
    }
    expectTypeOf(node).toMatchTypeOf<ProjectNode>()
  })

  it('CapturedThought has all required fields', () => {
    expectTypeOf<CapturedThought>().toHaveProperty('id')
    expectTypeOf<CapturedThought>().toHaveProperty('rawText')
    expectTypeOf<CapturedThought>().toHaveProperty('cleanedText')
    expectTypeOf<CapturedThought>().toHaveProperty('category')
    expectTypeOf<CapturedThought>().toHaveProperty('hierarchy')
    expectTypeOf<CapturedThought>().toHaveProperty('sessionId')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- types/thought.test.ts
```

Expected: FAIL — "Cannot find module './thought'"

**Step 3: Create the types**

Create `types/thought.ts`:
```typescript
export type ThoughtCategory = 'Task' | 'Idea' | 'Reference'

export interface ProjectNode {
  title: string
  type: 'project' | 'task' | 'subtask' | 'note'
  priority: 'high' | 'medium' | 'low'
  children?: ProjectNode[]
}

export interface CapturedThought {
  id: string
  rawText: string
  cleanedText: string
  category: ThoughtCategory
  intent: string
  hierarchy: ProjectNode
  createdAt: string
  sessionId: string
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- types/thought.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add types/
git commit -m "feat: add core TypeScript types for CapturedThought and ProjectNode"
```

---

## Task 3: Groq Provider Config

**Files:**
- Create: `lib/groq.ts`

**Step 1: Create the Groq provider**

Create `lib/groq.ts`:
```typescript
import { createGroq } from '@ai-sdk/groq'

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export const FAST_MODEL = 'llama-3.1-8b-instant'
```

No test needed — this is pure config. If the key is missing, agents will fail loudly at runtime.

**Step 2: Commit**

```bash
git add lib/groq.ts
git commit -m "feat: configure Groq provider for Vercel AI SDK"
```

---

## Task 4: Supabase Client

**Files:**
- Create: `lib/supabase.ts`

**Step 1: Create the Supabase singleton**

Create `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 2: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: configure Supabase client singleton"
```

---

## Task 5: Supabase Schema

**Files:**
- Create: `supabase/migrations/001_thoughts.sql`

**Step 1: Create the migration file**

Create `supabase/migrations/001_thoughts.sql`:
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Thoughts table
CREATE TABLE IF NOT EXISTS thoughts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   text NOT NULL,
  raw_text     text NOT NULL,
  cleaned_text text NOT NULL,
  category     text NOT NULL CHECK (category IN ('Task', 'Idea', 'Reference')),
  intent       text NOT NULL,
  hierarchy    jsonb NOT NULL,
  embedding    vector(1536),
  created_at   timestamptz DEFAULT now()
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS thoughts_session_id_idx ON thoughts(session_id);

-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS thoughts_created_at_idx ON thoughts(created_at DESC);
```

**Step 2: Run the migration in Supabase**

1. Go to https://app.supabase.com → your project → SQL Editor
2. Paste the contents of `supabase/migrations/001_thoughts.sql`
3. Click "Run"

Expected: "Success. No rows returned"

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase thoughts table migration with pgvector"
```

---

## Task 6: Capture Agent

**Files:**
- Create: `agents/capture-agent.ts`
- Create: `agents/capture-agent.test.ts`

**Step 1: Write the failing test**

Create `agents/capture-agent.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock the AI SDK before importing the agent
vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      cleanedText: 'Schedule team meeting for project kickoff',
      intent: 'User wants to organize a kickoff meeting',
    }
  })
}))

vi.mock('@/lib/groq', () => ({
  groq: {},
  FAST_MODEL: 'llama-3.1-8b-instant',
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- agents/capture-agent.test.ts
```

Expected: FAIL — "Cannot find module './capture-agent'"

**Step 3: Implement the agent**

Create `agents/capture-agent.ts`:
```typescript
import { generateObject } from 'ai'
import { z } from 'zod'
import { groq, FAST_MODEL } from '@/lib/groq'

const CaptureSchema = z.object({
  cleanedText: z.string().describe('The thought with filler words removed, written as a clear statement'),
  intent: z.string().describe('One sentence: what does the user want to accomplish?'),
})

export async function captureAgent(rawText: string) {
  const { object } = await generateObject({
    model: groq(FAST_MODEL),
    schema: CaptureSchema,
    system: `You are a cognitive capture assistant for people with ADHD.
Your job is to clean up spoken brain dumps:
- Remove filler words (um, uh, like, you know, so)
- Fix fragmented sentences into clear statements
- Preserve the user's original meaning exactly
- Keep it concise — one or two sentences maximum`,
    prompt: rawText,
  })
  return object
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- agents/capture-agent.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add agents/capture-agent.ts agents/capture-agent.test.ts
git commit -m "feat: implement capture agent with filler word removal"
```

---

## Task 7: Classify Agent

**Files:**
- Create: `agents/classify-agent.ts`
- Create: `agents/classify-agent.test.ts`

**Step 1: Write the failing test**

Create `agents/classify-agent.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: { category: 'Task' }
  })
}))

vi.mock('@/lib/groq', () => ({
  groq: {},
  FAST_MODEL: 'llama-3.1-8b-instant',
}))

import { classifyAgent } from './classify-agent'

describe('classifyAgent', () => {
  it('returns a valid ThoughtCategory', async () => {
    const result = await classifyAgent('Schedule team meeting', 'User wants to organize a kickoff')
    expect(['Task', 'Idea', 'Reference']).toContain(result.category)
  })

  it('returns Task for action-oriented thoughts', async () => {
    const result = await classifyAgent('Schedule team meeting', 'User wants to organize a kickoff')
    expect(result.category).toBe('Task')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- agents/classify-agent.test.ts
```

Expected: FAIL — "Cannot find module './classify-agent'"

**Step 3: Implement the agent**

Create `agents/classify-agent.ts`:
```typescript
import { generateObject } from 'ai'
import { z } from 'zod'
import { groq, FAST_MODEL } from '@/lib/groq'
import type { ThoughtCategory } from '@/types/thought'

const ClassifySchema = z.object({
  category: z.enum(['Task', 'Idea', 'Reference']).describe(
    'Task = actionable to-do; Idea = concept/inspiration to explore; Reference = information to remember'
  ),
})

export async function classifyAgent(cleanedText: string, intent: string): Promise<{ category: ThoughtCategory }> {
  const { object } = await generateObject({
    model: groq(FAST_MODEL),
    schema: ClassifySchema,
    system: `Classify thoughts into exactly one category:
- Task: Has a clear action to take (schedule, build, call, write, fix)
- Idea: A concept, possibility, or inspiration without a defined next action
- Reference: A fact, resource, or information the user wants to remember`,
    prompt: `Thought: "${cleanedText}"\nIntent: "${intent}"`,
  })
  return object
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- agents/classify-agent.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add agents/classify-agent.ts agents/classify-agent.test.ts
git commit -m "feat: implement classify agent for Task/Idea/Reference categorization"
```

---

## Task 8: Organize Agent

**Files:**
- Create: `agents/organize-agent.ts`
- Create: `agents/organize-agent.test.ts`

**Step 1: Write the failing test**

Create `agents/organize-agent.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const mockHierarchy = {
  title: 'Project Kickoff',
  type: 'project',
  priority: 'high',
  children: [
    { title: 'Schedule meeting', type: 'task', priority: 'high' },
    { title: 'Send invites', type: 'subtask', priority: 'medium' },
  ]
}

vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: { hierarchy: mockHierarchy }
  })
}))

vi.mock('@/lib/groq', () => ({
  groq: {},
  FAST_MODEL: 'llama-3.1-8b-instant',
}))

import { organizeAgent } from './organize-agent'

describe('organizeAgent', () => {
  it('returns a hierarchy with a title and type', async () => {
    const result = await organizeAgent('Schedule team meeting', 'Task')
    expect(result.hierarchy).toHaveProperty('title')
    expect(result.hierarchy).toHaveProperty('type')
    expect(result.hierarchy).toHaveProperty('priority')
  })

  it('hierarchy root type is project, task, or note', async () => {
    const result = await organizeAgent('Schedule team meeting', 'Task')
    expect(['project', 'task', 'subtask', 'note']).toContain(result.hierarchy.type)
  })

  it('children is an array when present', async () => {
    const result = await organizeAgent('Schedule team meeting', 'Task')
    if (result.hierarchy.children) {
      expect(Array.isArray(result.hierarchy.children)).toBe(true)
    }
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- agents/organize-agent.test.ts
```

Expected: FAIL — "Cannot find module './organize-agent'"

**Step 3: Implement the agent**

Create `agents/organize-agent.ts`:
```typescript
import { generateObject } from 'ai'
import { z } from 'zod'
import { groq, FAST_MODEL } from '@/lib/groq'
import type { ThoughtCategory } from '@/types/thought'

const ProjectNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    title: z.string(),
    type: z.enum(['project', 'task', 'subtask', 'note']),
    priority: z.enum(['high', 'medium', 'low']),
    children: z.array(ProjectNodeSchema).optional(),
  })
)

const OrganizeSchema = z.object({
  hierarchy: ProjectNodeSchema,
})

export async function organizeAgent(cleanedText: string, category: ThoughtCategory) {
  const { object } = await generateObject({
    model: groq(FAST_MODEL),
    schema: OrganizeSchema,
    system: `You are a project organizer for someone with ADHD.
Break the thought into a hierarchy of 2-4 levels maximum.
Rules:
- Keep titles short (3-6 words)
- Tasks: break into concrete next actions
- Ideas: break into exploration branches
- References: a single note node, no children needed
- Prioritize ruthlessly: only 1 high-priority item per level`,
    prompt: `Category: ${category}\nThought: "${cleanedText}"`,
  })
  return object
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- agents/organize-agent.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add agents/organize-agent.ts agents/organize-agent.test.ts
git commit -m "feat: implement organize agent for JSON project hierarchy generation"
```

---

## Task 9: Session Storage (L1 Memory)

**Files:**
- Create: `memory/session.ts`
- Create: `memory/session.test.ts`

**Step 1: Write the failing test**

Create `memory/session.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { saveThought, getThoughts, clearThoughts } from './session'
import type { CapturedThought } from '@/types/thought'

const mockThought: CapturedThought = {
  id: 'test-123',
  rawText: 'raw',
  cleanedText: 'cleaned',
  category: 'Task',
  intent: 'test intent',
  hierarchy: { title: 'Test', type: 'task', priority: 'medium' },
  createdAt: new Date().toISOString(),
  sessionId: 'session-abc',
}

describe('session storage', () => {
  beforeEach(() => {
    clearThoughts()
  })

  it('saves and retrieves a thought', () => {
    saveThought(mockThought)
    const thoughts = getThoughts()
    expect(thoughts).toHaveLength(1)
    expect(thoughts[0].id).toBe('test-123')
  })

  it('returns empty array when nothing saved', () => {
    expect(getThoughts()).toEqual([])
  })

  it('preserves multiple thoughts in order', () => {
    saveThought({ ...mockThought, id: 'a' })
    saveThought({ ...mockThought, id: 'b' })
    const thoughts = getThoughts()
    expect(thoughts).toHaveLength(2)
    expect(thoughts[0].id).toBe('a')
    expect(thoughts[1].id).toBe('b')
  })

  it('clearThoughts empties the store', () => {
    saveThought(mockThought)
    clearThoughts()
    expect(getThoughts()).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- memory/session.test.ts
```

Expected: FAIL — "Cannot find module './session'"

**Step 3: Implement session storage**

Create `memory/session.ts`:
```typescript
import type { CapturedThought } from '@/types/thought'

const SESSION_KEY = 'cognitive_flow_thoughts'

export function saveThought(thought: CapturedThought): void {
  const existing = getThoughts()
  existing.push(thought)
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(existing))
}

export function getThoughts(): CapturedThought[] {
  if (typeof window === 'undefined') return []
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as CapturedThought[]
  } catch {
    return []
  }
}

export function clearThoughts(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- memory/session.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add memory/session.ts memory/session.test.ts
git commit -m "feat: implement sessionStorage L1 memory layer"
```

---

## Task 10: Supabase Memory (L2 Memory)

**Files:**
- Create: `memory/supabase.ts`
- Create: `memory/supabase.test.ts`

**Step 1: Write the failing test**

Create `memory/supabase.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
    }),
  },
}))

import { persistThought } from './supabase'
import type { CapturedThought } from '@/types/thought'

const mockThought: CapturedThought = {
  id: 'test-123',
  rawText: 'raw',
  cleanedText: 'cleaned',
  category: 'Task',
  intent: 'test intent',
  hierarchy: { title: 'Test', type: 'task', priority: 'medium' },
  createdAt: new Date().toISOString(),
  sessionId: 'session-abc',
}

describe('persistThought', () => {
  it('calls supabase insert with mapped fields', async () => {
    await persistThought(mockThought)
    expect(mockInsert).toHaveBeenCalledWith({
      id: 'test-123',
      session_id: 'session-abc',
      raw_text: 'raw',
      cleaned_text: 'cleaned',
      category: 'Task',
      intent: 'test intent',
      hierarchy: mockThought.hierarchy,
    })
  })

  it('does not throw when supabase returns no error', async () => {
    await expect(persistThought(mockThought)).resolves.not.toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- memory/supabase.test.ts
```

Expected: FAIL — "Cannot find module './supabase'"

**Step 3: Implement Supabase persistence**

Create `memory/supabase.ts`:
```typescript
import { supabase } from '@/lib/supabase'
import type { CapturedThought } from '@/types/thought'

export async function persistThought(thought: CapturedThought): Promise<void> {
  const { error } = await supabase.from('thoughts').insert({
    id: thought.id,
    session_id: thought.sessionId,
    raw_text: thought.rawText,
    cleaned_text: thought.cleanedText,
    category: thought.category,
    intent: thought.intent,
    hierarchy: thought.hierarchy,
  })

  if (error) {
    // Silent fail — local-first: thought is already in sessionStorage
    console.error('[supabase] persist failed:', error.message)
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- memory/supabase.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add memory/supabase.ts memory/supabase.test.ts
git commit -m "feat: implement Supabase L2 memory persistence with silent fail"
```

---

## Task 11: API Route — Orchestrator

**Files:**
- Create: `app/api/process-thought/route.ts`
- Create: `app/api/process-thought/route.test.ts`

**Step 1: Write the failing test**

Create `app/api/process-thought/route.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- app/api/process-thought/route.test.ts
```

Expected: FAIL — "Cannot find module './route'"

**Step 3: Implement the route**

Create `app/api/process-thought/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { captureAgent } from '@/agents/capture-agent'
import { classifyAgent } from '@/agents/classify-agent'
import { organizeAgent } from '@/agents/organize-agent'
import { persistThought } from '@/memory/supabase'
import type { CapturedThought } from '@/types/thought'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { rawText, sessionId } = body

  if (!rawText || typeof rawText !== 'string') {
    return NextResponse.json({ error: 'rawText is required' }, { status: 400 })
  }

  try {
    const { cleanedText, intent } = await captureAgent(rawText)
    const { category } = await classifyAgent(cleanedText, intent)
    const { hierarchy } = await organizeAgent(cleanedText, category)

    const thought: CapturedThought = {
      id: uuidv4(),
      rawText,
      cleanedText,
      category,
      intent,
      hierarchy,
      createdAt: new Date().toISOString(),
      sessionId: sessionId ?? uuidv4(),
    }

    // Fire-and-forget — don't block response on Supabase
    persistThought(thought).catch(() => {})

    return NextResponse.json(thought)
  } catch (err) {
    console.error('[process-thought] pipeline error:', err)
    return NextResponse.json(
      { error: 'Processing failed. Your text is saved — please try again.' },
      { status: 500 }
    )
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- app/api/process-thought/route.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add app/api/process-thought/
git commit -m "feat: implement process-thought orchestrator API route"
```

---

## Task 12: Tailwind Design Tokens

**Files:**
- Modify: `app/globals.css`
- Delete: `tailwind.config.ts` (Tailwind v4 uses CSS-based config, not JS config)

**Step 1: Check if tailwind.config.ts exists**

If `tailwind.config.ts` exists, delete it — Tailwind v4 does not use it.

**Step 2: Tailwind v4 uses @theme in CSS**

Replace the entire contents of `app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  --color-background: #0F0F0F;
  --color-surface: #1A1A1A;
  --color-border: #2A2A2A;
  --color-primary: #E8E8E8;
  --color-muted: #6B6B6B;
  --color-accent: #4A7FA5;
  --color-success: #4A8C6F;

  --font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

:root {
  color-scheme: dark;
}

html, body {
  background-color: #0F0F0F;
  color: #E8E8E8;
  height: 100%;
  overflow-x: hidden;
}

* {
  -webkit-tap-highlight-color: transparent;
}
```

Note: In Tailwind v4, `bg-background`, `text-primary`, `border-border`, etc. will be available as utility classes automatically from the @theme block. `safe-top`/`safe-bottom` safe area classes are handled inline via Tailwind's arbitrary value syntax `pb-[env(safe-area-inset-bottom)]`.

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add low-dopamine design tokens to Tailwind v4 CSS theme"
```

---

## Task 13: VoiceCapture Component

**Files:**
- Create: `components/ui/adhd-optimized/VoiceCapture.tsx`
- Create: `components/ui/adhd-optimized/VoiceCapture.test.tsx`

**Step 1: Write the failing test**

Create `components/ui/adhd-optimized/VoiceCapture.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VoiceCapture from './VoiceCapture'

describe('VoiceCapture', () => {
  const mockOnCapture = vi.fn()

  beforeEach(() => {
    mockOnCapture.mockClear()
  })

  it('renders the mic button with accessible label', () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    expect(screen.getByRole('button', { name: /hold to speak/i })).toBeDefined()
  })

  it('shows the textarea fallback when speech is not supported', () => {
    // Simulate no Web Speech API
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, writable: true })
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, writable: true })
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={false} />)
    expect(screen.getByRole('textbox')).toBeDefined()
  })

  it('disables the button when isProcessing is true', () => {
    render(<VoiceCapture onCapture={mockOnCapture} isProcessing={true} />)
    const button = screen.getByRole('button', { name: /processing/i })
    expect(button).toHaveAttribute('disabled')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- components/ui/adhd-optimized/VoiceCapture.test.tsx
```

Expected: FAIL — "Cannot find module './VoiceCapture'"

**Step 3: Implement the component**

Create `components/ui/adhd-optimized/VoiceCapture.tsx`:
```typescript
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

interface VoiceCaptureProps {
  onCapture: (text: string) => void
  isProcessing: boolean
}

export default function VoiceCapture({ onCapture, isProcessing }: VoiceCaptureProps) {
  const [isListening, setIsListening] = useState(false)
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true)
  const [textInput, setTextInput] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setHasSpeechSupport(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      onCapture(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
  }, [onCapture])

  const handleMicPress = useCallback(() => {
    if (!recognitionRef.current || isProcessing) return
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }, [isListening, isProcessing])

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return
    onCapture(textInput.trim())
    setTextInput('')
  }, [textInput, onCapture])

  if (!hasSpeechSupport) {
    return (
      <div className="w-full px-4 pb-[env(safe-area-inset-bottom)]">
        <textarea
          className="w-full min-h-[120px] bg-surface border border-border rounded-xl p-4 text-primary placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="What's on your mind?"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleTextSubmit())}
          aria-label="Type your thought"
        />
        <button
          onClick={handleTextSubmit}
          disabled={isProcessing || !textInput.trim()}
          className="mt-2 w-full min-h-[48px] bg-accent text-white rounded-xl font-medium disabled:opacity-40"
        >
          {isProcessing ? 'Processing...' : 'Capture Thought'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 pb-[env(safe-area-inset-bottom)] px-4">
      <motion.button
        onPointerDown={handleMicPress}
        disabled={isProcessing}
        animate={{ opacity: isProcessing ? [0.6, 1] : isListening ? [0.7, 1] : 1 }}
        transition={{ repeat: isProcessing || isListening ? Infinity : 0, duration: 1 }}
        className="min-h-[56px] min-w-[56px] w-20 h-20 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 focus:outline-none focus:ring-4 focus:ring-accent/50"
        aria-label={isProcessing ? 'Processing...' : isListening ? 'Listening — tap to stop' : 'Hold to Speak'}
        aria-pressed={isListening}
      >
        <span className="text-2xl" aria-hidden="true">
          {isProcessing ? '⏳' : isListening ? '🎙️' : '●'}
        </span>
      </motion.button>
      <p className="text-muted text-sm">
        {isProcessing ? 'Processing...' : isListening ? 'Listening...' : "What's on your mind?"}
      </p>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- components/ui/adhd-optimized/VoiceCapture.test.tsx
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add components/ui/adhd-optimized/VoiceCapture.tsx components/ui/adhd-optimized/VoiceCapture.test.tsx
git commit -m "feat: implement VoiceCapture with Web Speech API and textarea fallback"
```

---

## Task 14: ThoughtCard Component

**Files:**
- Create: `components/ui/adhd-optimized/ThoughtCard.tsx`
- Create: `components/ui/adhd-optimized/ThoughtCard.test.tsx`

**Step 1: Write the failing test**

Create `components/ui/adhd-optimized/ThoughtCard.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ThoughtCard from './ThoughtCard'
import type { CapturedThought } from '@/types/thought'

const mockThought: CapturedThought = {
  id: '1',
  rawText: 'um schedule a meeting',
  cleanedText: 'Schedule kickoff meeting',
  category: 'Task',
  intent: 'User wants a kickoff meeting',
  hierarchy: {
    title: 'Kickoff Meeting',
    type: 'project',
    priority: 'high',
    children: [{ title: 'Send invites', type: 'task', priority: 'high' }]
  },
  createdAt: new Date().toISOString(),
  sessionId: 'sess-1',
}

describe('ThoughtCard', () => {
  it('displays the cleaned text', () => {
    render(<ThoughtCard thought={mockThought} />)
    expect(screen.getByText('Schedule kickoff meeting')).toBeDefined()
  })

  it('displays the category badge', () => {
    render(<ThoughtCard thought={mockThought} />)
    expect(screen.getByText('Task')).toBeDefined()
  })

  it('displays the hierarchy title', () => {
    render(<ThoughtCard thought={mockThought} />)
    expect(screen.getByText('Kickoff Meeting')).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- components/ui/adhd-optimized/ThoughtCard.test.tsx
```

Expected: FAIL — "Cannot find module './ThoughtCard'"

**Step 3: Implement the component**

Create `components/ui/adhd-optimized/ThoughtCard.tsx`:
```typescript
import type { CapturedThought, ProjectNode } from '@/types/thought'

const CATEGORY_COLORS: Record<string, string> = {
  Task: 'text-accent border-accent',
  Idea: 'text-success border-success',
  Reference: 'text-muted border-muted',
}

function NodeTree({ node, depth = 0 }: { node: ProjectNode; depth?: number }) {
  if (depth > 2) return null
  return (
    <div className={depth > 0 ? 'ml-3 border-l border-border pl-3' : ''}>
      <p className="text-sm text-primary truncate">{node.title}</p>
      {node.children?.map((child, i) => (
        <NodeTree key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

interface ThoughtCardProps {
  thought: CapturedThought
}

export default function ThoughtCard({ thought }: ThoughtCardProps) {
  const categoryStyle = CATEGORY_COLORS[thought.category] ?? 'text-muted border-muted'
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium border rounded-full px-2 py-0.5 ${categoryStyle}`}>
          {thought.category}
        </span>
        <p className="text-primary text-sm font-medium truncate flex-1">
          {thought.cleanedText}
        </p>
      </div>
      <div className="mt-1">
        <NodeTree node={thought.hierarchy} />
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- components/ui/adhd-optimized/ThoughtCard.test.tsx
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add components/ui/adhd-optimized/ThoughtCard.tsx components/ui/adhd-optimized/ThoughtCard.test.tsx
git commit -m "feat: implement ThoughtCard with category badge and hierarchy tree"
```

---

## Task 15: Root Layout

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Step 1: Update globals.css**

Replace `app/globals.css` with:
```css
@import "tailwindcss";

@theme {
  --color-background: #0F0F0F;
  --color-surface: #1A1A1A;
  --color-border: #2A2A2A;
  --color-primary: #E8E8E8;
  --color-muted: #6B6B6B;
  --color-accent: #4A7FA5;
  --color-success: #4A8C6F;
  --font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

:root {
  color-scheme: dark;
}

html, body {
  background-color: #0F0F0F;
  color: #E8E8E8;
  height: 100%;
  overflow-x: hidden;
}

* {
  -webkit-tap-highlight-color: transparent;
}
```

**Step 2: Update app/layout.tsx**

Replace `app/layout.tsx` with:
```typescript
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cognitive Flow',
  description: 'Voice-first ADHD productivity',
  manifest: '/manifest.json',
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
      <body className="bg-background text-primary min-h-screen">
        {children}
      </body>
    </html>
  )
}
```

**Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: apply low-dopamine layout with safe area support"
```

---

## Task 16: Main Page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace app/page.tsx**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VoiceCapture from '@/components/ui/adhd-optimized/VoiceCapture'
import ThoughtCard from '@/components/ui/adhd-optimized/ThoughtCard'
import { saveThought, getThoughts } from '@/memory/session'
import type { CapturedThought } from '@/types/thought'

export default function HomePage() {
  const [thoughts, setThoughts] = useState<CapturedThought[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setThoughts(getThoughts())
  }, [])

  const handleCapture = useCallback(async (rawText: string) => {
    setIsProcessing(true)
    setError(null)
    const sessionId = sessionStorage.getItem('cf_session_id') ?? (() => {
      const id = crypto.randomUUID()
      sessionStorage.setItem('cf_session_id', id)
      return id
    })()

    try {
      const res = await fetch('/api/process-thought', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, sessionId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Processing failed')
      }

      const thought: CapturedThought = await res.json()
      saveThought(thought)
      setThoughts(prev => [thought, ...prev])
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Your text is saved — please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return (
    <main className="flex flex-col h-screen pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-primary">Cognitive Flow</h1>
      </header>

      {/* Thoughts list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {thoughts.length === 0 && !isProcessing && (
          <p className="text-muted text-sm text-center mt-8">
            Your captured thoughts will appear here
          </p>
        )}
        <AnimatePresence>
          {thoughts.map((thought) => (
            <motion.div
              key={thought.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <ThoughtCard thought={thought} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-surface border-t border-border">
          <p className="text-sm text-muted">{error}</p>
        </div>
      )}

      {/* Voice capture — thumb zone */}
      <div className="flex-shrink-0 border-t border-border py-4">
        <VoiceCapture onCapture={handleCapture} isProcessing={isProcessing} />
      </div>
    </main>
  )
}
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: implement main page with voice capture, thought list, and error handling"
```

---

## Task 17: Smoke Test — Full App

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Open http://localhost:3000 on a mobile device or Chrome DevTools mobile emulator**

Expected:
- Dark background (#0F0F0F)
- "Cognitive Flow" header
- Mic button visible at bottom
- "Your captured thoughts will appear here" placeholder

**Step 3: Test voice capture**

- On a device with mic: hold the mic button and speak a thought
- On desktop: Chrome DevTools → device emulator → speak a thought

Expected:
- Button pulses while processing
- Thought card appears with category badge, cleaned text, and hierarchy

**Step 4: Test textarea fallback**

Open in a browser without Web Speech API (Firefox). Expected: textarea appears instead of mic button.

**Step 5: Run all tests**

```bash
npm run test:run
```

Expected: All tests pass (green).

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Cognitive Flow MVP — voice brain dump to structured hierarchy"
```

---

## Summary

| Task | Files Created | Tests |
|---|---|---|
| 1 | Project scaffold | — |
| 2 | `types/thought.ts` | 3 |
| 3 | `lib/groq.ts` | — |
| 4 | `lib/supabase.ts` | — |
| 5 | `supabase/migrations/001_thoughts.sql` | — |
| 6 | `agents/capture-agent.ts` | 2 |
| 7 | `agents/classify-agent.ts` | 2 |
| 8 | `agents/organize-agent.ts` | 3 |
| 9 | `memory/session.ts` | 4 |
| 10 | `memory/supabase.ts` | 2 |
| 11 | `app/api/process-thought/route.ts` | 2 |
| 12 | `tailwind.config.ts` | — |
| 13 | `components/ui/adhd-optimized/VoiceCapture.tsx` | 3 |
| 14 | `components/ui/adhd-optimized/ThoughtCard.tsx` | 3 |
| 15 | `app/layout.tsx`, `globals.css` | — |
| 16 | `app/page.tsx` | — |
| **Total** | **16 files** | **24 tests** |
