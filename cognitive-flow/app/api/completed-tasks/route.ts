import { NextRequest, NextResponse } from 'next/server'
import { getCompletedTasks } from '@/memory/tasks'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }
  try {
    const tasks = await getCompletedTasks(sessionId)
    return NextResponse.json({ tasks })
  } catch {
    return NextResponse.json({ error: 'Could not load completed tasks.' }, { status: 500 })
  }
}
