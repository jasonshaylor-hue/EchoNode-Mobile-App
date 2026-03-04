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

type MutableThoughtFields = Pick<CapturedThought, 'tags'>

export function updateThought(id: string, updates: Partial<MutableThoughtFields>): void {
  if (typeof window === 'undefined') return
  const thoughts = getThoughts()
  const idx = thoughts.findIndex(t => t.id === id)
  if (idx === -1) return
  thoughts[idx] = { ...thoughts[idx], ...updates }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(thoughts))
}
