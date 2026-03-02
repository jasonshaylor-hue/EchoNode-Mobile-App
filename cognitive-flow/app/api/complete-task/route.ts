import { NextRequest, NextResponse } from 'next/server'
import { completeTask } from '@/memory/tasks'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { taskId } = body

  if (!taskId || typeof taskId !== 'string') {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }

  try {
    await completeTask(taskId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not complete task.' }, { status: 500 })
  }
}
