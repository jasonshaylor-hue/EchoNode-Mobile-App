import { generateText } from 'ai'
import { z } from 'zod'
import { groq, FAST_MODEL } from '@/lib/groq'
import type { ThoughtCategory } from '@/types/thought'

const MAX_ATTEMPTS = 3

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

const EvalSchema = z.object({
  pass: z.boolean(),
  feedback: z.string(),
})

async function evaluateHierarchy(
  hierarchy: unknown,
  cleanedText: string,
  category: ThoughtCategory
): Promise<{ pass: boolean; feedback: string }> {
  const { text } = await generateText({
    model: groq(FAST_MODEL),
    system: `You are a quality reviewer for ADHD task hierarchies.
Evaluate the hierarchy and respond with ONLY valid JSON, no markdown, no explanation.
Format: {"pass": true|false, "feedback": "..."}
Criteria (ALL must pass):
- Titles are 3-6 words and actionable/specific
- At most 1 high-priority item per level
- Depth is 2-4 levels maximum
- Task/subtask nodes are concrete next actions (not vague like "do stuff")
- Reference category has a single note node with no children
If all criteria pass, set pass: true and feedback: "ok".
If any fail, set pass: false and list specific issues in feedback.`,
    prompt: `Category: ${category}\nOriginal thought: "${cleanedText}"\nHierarchy: ${JSON.stringify(hierarchy)}`,
  })

  try {
    const json = JSON.parse(text.trim().replace(/^```(?:json)?\n?|```$/g, ''))
    return EvalSchema.parse(json)
  } catch {
    return { pass: false, feedback: 'Evaluation parse error' }
  }
}

export async function organizeAgent(cleanedText: string, category: ThoughtCategory) {
  const basePrompt = `Category: ${category}\nThought: "${cleanedText}"`

  let lastResult: z.infer<typeof OrganizeSchema> | null = null
  let feedback = ''

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const prompt =
      attempt === 0
        ? basePrompt
        : `${basePrompt}\n\nPrevious attempt had issues: ${feedback}\nPlease fix these issues and try again.`

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
      prompt,
    })

    let parsed: z.infer<typeof OrganizeSchema>
    try {
      const json = JSON.parse(text.trim().replace(/^```(?:json)?\n?|```$/g, ''))
      parsed = OrganizeSchema.parse(json)
    } catch {
      continue
    }
    lastResult = parsed

    const evaluation = await evaluateHierarchy(lastResult.hierarchy, cleanedText, category)
    if (evaluation.pass) return lastResult

    feedback = evaluation.feedback
  }

  if (lastResult === null) throw new Error('organizeAgent failed to produce a valid hierarchy')
  return lastResult
}
