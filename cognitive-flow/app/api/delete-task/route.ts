import { NextRequest, NextResponse } from 'next/server'
import { deleteTask } from '@/memory/tasks'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { taskId } = body

  if (!taskId || typeof taskId !== 'string') {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }

  try {
    await deleteTask(taskId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not delete task.' }, { status: 500 })
  }
}
