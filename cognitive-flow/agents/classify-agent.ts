import { generateText } from 'ai'
import { z } from 'zod'
import { groq, FAST_MODEL } from '@/lib/groq'
import type { ThoughtCategory } from '@/types/thought'

const ClassifySchema = z.object({
  category: z.enum(['Task', 'Idea', 'Reference']),
})

export async function classifyAgent(cleanedText: string, intent: string): Promise<{ category: ThoughtCategory }> {
  const { text } = await generateText({
    model: groq(FAST_MODEL),
    system: `Classify the thought into exactly one category and respond with ONLY valid JSON, no markdown, no explanation.
Format: {"category": "Task"|"Idea"|"Reference"}
- Task: has a clear action to take (schedule, build, call, write, fix)
- Idea: a concept, possibility, or inspiration without a defined next action
- Reference: a fact, resource, or information to remember`,
    prompt: `Thought: "${cleanedText}"\nIntent: "${intent}"`,
  })

  const json = JSON.parse(text.trim().replace(/^```json\n?|```$/g, ''))
  return ClassifySchema.parse(json)
}
