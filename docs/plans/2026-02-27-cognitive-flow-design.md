# Cognitive Flow — MVP Design Document

**Date:** 2026-02-27
**Status:** Approved
**Stack:** Next.js (App Router) · TypeScript · Tailwind · Framer Motion · Vercel AI SDK · Groq (Llama 3.1 8B) · Supabase (PostgreSQL + pgvector)

---

## 1. Architecture

**Pattern:** Agent-First Pipeline (Option B)

Three focused agents in `/agents/`, each a pure TypeScript function wrapping a Vercel AI SDK `generateObject` call, orchestrated by a single API route.

```
capture-agent   → clean raw text, extract intent
classify-agent  → label as Task | Idea | Reference
organize-agent  → generate JSON project hierarchy
```

**Data flow:**
`VoiceCapture` → raw text → `POST /api/process-thought` → agents (sequential) → JSON hierarchy → sessionStorage (L1) + Supabase (L2) → `HierarchyView`

---

## 2. Folder Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/process-thought/route.ts
├── agents/
│   ├── capture-agent.ts
│   ├── classify-agent.ts
│   └── organize-agent.ts
├── memory/
│   ├── session.ts           # sessionStorage wrapper (L1)
│   └── supabase.ts          # Supabase persistence (L2)
├── components/ui/adhd-optimized/
│   ├── VoiceCapture.tsx
│   ├── ThoughtCard.tsx
│   └── HierarchyView.tsx
├── lib/
│   ├── supabase.ts          # Supabase client singleton
│   └── groq.ts              # Vercel AI SDK Groq provider config
├── types/
│   └── thought.ts
└── docs/plans/
```

---

## 3. Data Model

### TypeScript Types (`types/thought.ts`)

```typescript
type ThoughtCategory = "Task" | "Idea" | "Reference";

interface CapturedThought {
  id: string;
  rawText: string;
  cleanedText: string;
  category: ThoughtCategory;
  intent: string;
  hierarchy: ProjectNode;
  createdAt: string;
  sessionId: string;
}

interface ProjectNode {
  title: string;
  type: "project" | "task" | "subtask" | "note";
  priority: "high" | "medium" | "low";
  children?: ProjectNode[];
}
```

### Supabase Schema

```sql
CREATE TABLE thoughts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   text NOT NULL,
  raw_text     text NOT NULL,
  cleaned_text text NOT NULL,
  category     text NOT NULL,
  intent       text NOT NULL,
  hierarchy    jsonb NOT NULL,
  embedding    vector(1536),   -- nullable, reserved for v2 semantic search
  created_at   timestamptz DEFAULT now()
);
```

---

## 4. UI — Mobile-First, Low-Dopamine

### MFRI Score: +1 (Risky → kept interaction model simple)

### Color Palette

| Token | Value | Usage |
|---|---|---|
| Background | `#0F0F0F` | Root background |
| Surface | `#1A1A1A` | Cards, panels |
| Border | `#2A2A2A` | Subtle dividers |
| Text/Primary | `#E8E8E8` | High contrast body |
| Text/Muted | `#6B6B6B` | Secondary info |
| Accent | `#4A7FA5` | Single action color |
| Success | `#4A8C6F` | Task complete |

No red, orange, or notification badges. Framer Motion: `duration: 0.2s, ease: "easeOut"`.

### Mobile Layout

```
┌────────────────────────────────┐
│░░░ Status Bar (safe-area) ░░░░│
├────────────────────────────────┤
│  Cognitive Flow                │  ← Large Title
├────────────────────────────────┤
│                                │
│  Recent Thoughts               │
│  ┌──────────────────────────┐  │
│  │ Task · 3 subtasks        │  │  ← 48px+ touch target
│  │ "Launch landing page"    │  │    Swipe left = delete (iOS)
│  └──────────────────────────┘  │    Long press = context menu
│                                │
├────────────────────────────────┤
│   [ ● Hold to Speak / Tap ]   │  ← 56px FAB-style, thumb zone
│   "What's on your mind?"       │
│░░░ Home Indicator (safe-area)░│
└────────────────────────────────┘
```

### Platform Rules

| Element | iOS | Android |
|---|---|---|
| Mic button | Rounded, no shadow | FAB with ripple |
| Results panel | Bottom sheet (.medium) | Modal bottom sheet (28dp corners) |
| Card swipe | Left=delete, Right=pin | MD3 swipe-to-dismiss |
| Touch targets | ≥ 44pt | ≥ 48dp |
| Safe areas | `env(safe-area-inset-*)` | Edge-to-edge |

### Accessibility
- WCAG AA: all text contrast ≥ 4.5:1
- Focus rings on all interactive elements
- No icon-only controls
- `prefers-reduced-motion` respected

---

## 5. Dependencies

```bash
# Core
npx create-next-app@latest cognitive-flow --typescript --tailwind --app

# AI
npm install ai @ai-sdk/openai groq-sdk

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI / Animation
npm install framer-motion

# Utilities
npm install uuid zod
npm install -D @types/uuid
```

---

## 6. Environment Variables

```bash
# .env.local

# Groq — get at console.groq.com
GROQ_API_KEY=

# Supabase — get at app.supabase.com → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 7. Error Handling

| Failure | Behavior |
|---|---|
| Groq API down / timeout | Inline message: "Processing failed — your text is saved, try again." Raw text preserved in sessionStorage. |
| Supabase write fails | Silent retry once; fall back to sessionStorage only. No error shown (local-first). |
| Web Speech API unsupported | Auto-fallback to textarea. No modal or alert. |

**Loading state:** Pulsing mic button (`opacity: 0.6 → 1.0, 1s loop`). No spinners.

---

## 8. Auth

Anonymous session for MVP. No login required. Data scoped to `session_id` (UUID generated client-side, stored in sessionStorage).

---

## Out of Scope (MVP)

- User authentication
- Semantic search via pgvector embeddings
- Whisper voice transcription
- Streaming AI responses
- Push notifications / nudges
