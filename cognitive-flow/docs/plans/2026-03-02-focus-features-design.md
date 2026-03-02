# Focus Features Design — Daily Task Intelligence

**Goal:** Add a Focus tab with AI-powered daily task management that turns captured brain dumps into actionable, prioritized to-do lists — keeping users returning every day through utility pull, not gamification.

**Approach:** Intelligence Layer (Option C) — the AI actively works for the user between sessions, removing ADHD decision paralysis with a "What do I do next?" feature.

---

## 1. Architecture & Feature Set

Three capabilities built on top of the existing brain dump pipeline:

### Task Extraction Layer
When a thought is processed through `/api/process-thought`, all `task` and `subtask` nodes are extracted from the AI-generated hierarchy and written to a flat `tasks` table in Supabase alongside the parent thought. Each task gets a `mention_count` that increments when a fuzzy-matched duplicate is captured again (ILIKE query). This surfaces recurrence as priority signal without extra user effort.

### "What Do I Do Next?" Agent
A new `/api/next-task` route. On demand (button tap), it pulls all open tasks ordered by `mention_count DESC, priority` and sends the top 10 to the AI: *"Which single task should this person do right now and why?"* Returns one task + one-line rationale. Removes ADHD decision paralysis in one tap.

### Daily Focus View
A second tab ("Focus") with:
- Today's AI-picked top 3 tasks (generated on first daily open, cached in `daily_focus` table)
- "What do I do next?" button
- All open tasks (scrollable, grouped by priority)
- Task completion via checkbox or left-swipe (iOS convention)

---

## 2. Data Model

### `tasks` table

```sql
CREATE TABLE tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   text NOT NULL,
  thought_id   uuid REFERENCES thoughts(id),
  title        text NOT NULL,
  priority     text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  mention_count int NOT NULL DEFAULT 1,
  created_at   timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX tasks_session_status_idx ON tasks(session_id, status);
CREATE INDEX tasks_mention_count_idx ON tasks(mention_count DESC);
```

### `daily_focus` table

```sql
CREATE TABLE daily_focus (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text NOT NULL,
  focus_date  date NOT NULL,
  task_ids    uuid[] NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(session_id, focus_date)
);
```

**Task extraction logic** (inside existing `/api/process-thought`):
1. Recursively walk the returned hierarchy tree
2. Collect all nodes where `type === 'task'` or `type === 'subtask'`
3. For each: `SELECT id FROM tasks WHERE session_id = ? AND status = 'open' AND title ILIKE '%{title}%'`
4. If match found → `UPDATE tasks SET mention_count = mention_count + 1`
5. If no match → `INSERT INTO tasks ...`

---

## 3. UI & Navigation

### Bottom Tab Bar
Two tabs, always visible, thumb-zone:
- **Capture** (existing screen) — mic button + thought cards
- **Focus** (new screen) — daily tasks + AI assist

Tab bar: `min-h-[49px] pb-[env(safe-area-inset-bottom)]` for iOS/Android native feel. Icons + text labels (mandatory for accessibility on both platforms).

### Focus Screen Layout (top to bottom)

```
┌─────────────────────────────────────┐
│ Today's Focus                       │  ← section header
│ ┌─────────────────────────────────┐ │
│ │ ☐  Design login flow      high  │ │  ← swipe left to complete (iOS)
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ☐  Call dentist          medium  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ☐  Review PR feedback    medium  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │    What do I do next?  ↗        │ │  ← 56px filled accent button
│ └─────────────────────────────────┘ │
│                                     │
│ ─── All Open Tasks ──────────────── │
│ HIGH                                │
│  ☐  Ship v1 to TestFlight          │
│ MEDIUM                              │
│  ☐  Update README                  │
│  ☐  Fix nav bug                    │
└─────────────────────────────────────┘
│  📥 Capture    ✓ Focus             │  ← tab bar
└─────────────────────────────────────┘
```

### Mobile Platform Notes
- **iOS**: Left-swipe on task card reveals "Done" action (green). Meets HIG swipe action pattern.
- **Android**: Touch feedback via `whileTap={{ scale: 0.97 }}` (Framer Motion) on all interactive elements as ripple equivalent.
- Touch targets: 56px minimum on all tappable elements (exceeds iOS 44pt / Android 48dp).
- Completed tasks: 0.2s ease fade-out, line-through — no celebration animation (low-dopamine).
- No red badges, no overdue warnings, no streaks in v1.

---

## 4. API Routes

### `POST /api/next-task`
**Input:** `{ sessionId: string }`
**Logic:** Query top 10 open tasks by `mention_count DESC, priority`. Send to AI: *"Which single task should this person do right now and why (one sentence)?"*
**Output:** `{ task: { id, title, priority } | null, rationale: string }`
**Error:** Returns `{ task: null, rationale: "No open tasks — go capture something!" }` if empty.

### `POST /api/complete-task`
**Input:** `{ taskId: string }`
**Logic:** `UPDATE tasks SET status = 'done', completed_at = now() WHERE id = ?`
**Client pattern:** Optimistic update (mark done immediately), revert on failure with "Couldn't save — tap to retry."

### `GET /api/daily-focus`
**Input:** `{ sessionId: string, date: string (YYYY-MM-DD) }`
**Logic:** Check `daily_focus` for `(session_id, focus_date)`. If exists, return cached `task_ids`. If not, query top 3 tasks by `mention_count DESC, priority`, insert into `daily_focus`, return.
**Output:** `{ tasks: Task[] }`

---

## 5. Error Handling

- All routes: log server-side, return friendly message client-side (consistent with existing pipeline)
- "What do I do next?" button: skeleton loader during ~1-2s AI call, fade-in result
- Task completion failure: optimistic revert + "Couldn't save — tap to retry" inline message
- Empty state (no tasks yet): "Capture a thought to get started" with arrow pointing to Capture tab

---

## 6. TypeScript Types (additions)

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
  task: Pick<Task, 'id' | 'title' | 'priority'> | null
  rationale: string
}

export interface DailyFocus {
  id: string
  sessionId: string
  focusDate: string
  tasks: Task[]
}
```

---

## Implementation Notes

- Task extraction in `/api/process-thought` is fire-and-forget (same pattern as Supabase persistence) — don't block the response
- `daily_focus` uses `UNIQUE(session_id, focus_date)` so concurrent requests on first daily open are safe (upsert)
- No auth in v1 — `session_id` from sessionStorage is the user identifier (consistent with existing app)
- `generateText` (not `generateObject`) for the next-task agent, consistent with the fix applied to other agents
