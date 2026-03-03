import { generateText } from 'ai'
import { z } from 'zod'
import { groq, FAST_MODEL } from '@/lib/groq'

const CaptureSchema = z.object({
  cleanedText: z.string(),
  intent: z.string(),
})

export async function captureAgent(rawText: string) {
  const { text } = await generateText({
    model: groq(FAST_MODEL),
    system: `You are a cognitive capture assistant for people with ADHD.
Clean up the spoken brain dump and respond with ONLY valid JSON, no markdown, no explanation.
Format: {"cleanedText": "...", "intent": "..."}
- cleanedText: remove filler words (um, uh, like, you know), fix fragments into clear statements, max 2 sentences
- intent: one sentence describing what the user wants to accomplish`,
    prompt: rawText,
  })

  const json = JSON.parse(text.trim().replace(/^```json\n?|```$/g, ''))
  return CaptureSchema.parse(json)
}
