import { generateText } from 'ai'
import { groq, FAST_MODEL } from '@/lib/groq'
import type { Task, NextTaskResult } from '@/types/thought'

export async function nextTaskAgent(tasks: Task[]): Promise<NextTaskResult> {
  if (tasks.length === 0) {
    return { task: null, rationale: 'No open tasks — go capture something!' }
  }

  const taskList = tasks
    .slice(0, 10)
    .map((t, i) => `${i + 1}. [${t.priority}] "${t.title}" (mentioned ${t.mentionCount}x)`)
    .join('\n')

  const { text } = await generateText({
    model: groq(FAST_MODEL),
    system: `You are a focus assistant for someone with ADHD. Given a list of open tasks, pick the single best task to do right now.
Respond with ONLY valid JSON, no markdown, no explanation.
Format: {"index": <1-based task number>, "rationale": "one sentence why this task now"}`,
    prompt: `Tasks:\n${taskList}`,
  })

  let json: { index: number; rationale: string }
  try {
    json = JSON.parse(text.trim().replace(/^```json\n?|```$/g, ''))
  } catch {
    return { task: null, rationale: 'Could not determine best task.' }
  }
  const index = typeof json.index === 'number' ? json.index : Number(json.index)
  if (!Number.isFinite(index)) return { task: null, rationale: 'Could not determine best task.' }
  const picked = tasks[index - 1]

  if (!picked) return { task: null, rationale: 'Could not determine best task.' }

  return { task: picked, rationale: json.rationale }
}
