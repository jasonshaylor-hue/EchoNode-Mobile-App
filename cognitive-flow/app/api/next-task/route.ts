import { NextRequest, NextResponse } from 'next/server'
import { getOpenTasks } from '@/memory/tasks'
import { nextTaskAgent } from '@/agents/next-task-agent'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sessionId } = body

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  try {
    const tasks = await getOpenTasks(sessionId)
    const result = await nextTaskAgent(tasks)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[next-task] error:', err)
    return NextResponse.json({ error: 'Could not determine next task.' }, { status: 500 })
  }
}
