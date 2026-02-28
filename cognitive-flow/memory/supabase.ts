import { supabase } from '@/lib/supabase'
import type { CapturedThought } from '@/types/thought'

export async function persistThought(thought: CapturedThought): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('thoughts') as any).insert({
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
