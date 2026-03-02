import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { captureAgent } from '@/agents/capture-agent'
import { classifyAgent } from '@/agents/classify-agent'
import { organizeAgent } from '@/agents/organize-agent'
import { persistThought } from '@/memory/supabase'
import type { CapturedThought } from '@/types/thought'
import { extractTasks } from '@/lib/extract-tasks'
import { upsertTasks } from '@/memory/tasks'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { rawText, sessionId } = body

  if (!rawText || typeof rawText !== 'string' || rawText.length > 2000) {
    return NextResponse.json(
      { error: 'rawText is required and must be under 2000 characters' },
      { status: 400 }
    )
  }

  try {
    const { cleanedText, intent } = await captureAgent(rawText)
    const { category } = await classifyAgent(cleanedText, intent)
    const { hierarchy } = await organizeAgent(cleanedText, category)

    const thought: CapturedThought = {
      id: uuidv4(),
      rawText,
      cleanedText,
      category,
      intent,
      hierarchy,
      createdAt: new Date().toISOString(),
      sessionId: sessionId ?? uuidv4(),
    }

    // Fire-and-forget — don't block response on Supabase
    persistThought(thought).catch(() => {})
    upsertTasks(extractTasks(thought.hierarchy), thought.sessionId, thought.id).catch(() => {})

    return NextResponse.json(thought)
  } catch (err) {
    console.error('[process-thought] pipeline error:', err)
    return NextResponse.json(
      { error: 'Processing failed. Your text is saved — please try again.' },
      { status: 500 }
    )
  }
}
