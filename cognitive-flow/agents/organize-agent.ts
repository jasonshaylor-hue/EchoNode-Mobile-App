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
