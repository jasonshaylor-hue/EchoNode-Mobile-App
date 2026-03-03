import { generateText } from 'ai'
import { z } from 'zod'
import { groq, FAST_MODEL } from '@/lib/groq'
import type { ThoughtCategory } from '@/types/thought'

// z.ZodType<any> is required here — TypeScript cannot infer circular types from z.lazy()
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
  const { text } = await generateText({
    model: groq(FAST_MODEL),
    system: `You are a project organizer for someone with ADHD.
Break the thought into a hierarchy and respond with ONLY valid JSON, no markdown, no explanation.
Format: {"hierarchy": {"title": "...", "type": "project|task|subtask|note", "priority": "high|medium|low", "children": [...]}}
Rules:
- Keep titles short (3-6 words)
- 2-4 levels maximum
- Tasks: break into concrete next actions
- Ideas: break into exploration branches
- References: a single note node, no children needed
- Only 1 high-priority item per level`,
    prompt: `Category: ${category}\nThought: "${cleanedText}"`,
  })

  const json = JSON.parse(text.trim().replace(/^```json\n?|```$/g, ''))
  return OrganizeSchema.parse(json)
}
