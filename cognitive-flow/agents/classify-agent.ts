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
