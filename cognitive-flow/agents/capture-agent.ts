import { generateObject } from 'ai'
import { z } from 'zod'
import { groq, FAST_MODEL } from '@/lib/groq'

const CaptureSchema = z.object({
  cleanedText: z.string().describe('The thought with filler words removed, written as a clear statement'),
  intent: z.string().describe('One sentence: what does the user want to accomplish?'),
})

export async function captureAgent(rawText: string) {
  const { object } = await generateObject({
    model: groq(FAST_MODEL),
    schema: CaptureSchema,
    system: `You are a cognitive capture assistant for people with ADHD.
Your job is to clean up spoken brain dumps:
- Remove filler words (um, uh, like, you know, so)
- Fix fragmented sentences into clear statements
- Preserve the user's original meaning exactly
- Keep it concise — one or two sentences maximum`,
    prompt: rawText,
  })
  return object
}
