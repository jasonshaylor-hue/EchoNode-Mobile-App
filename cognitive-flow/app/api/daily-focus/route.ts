import { NextRequest, NextResponse } from 'next/server'
import { getDailyFocusTasks, getOpenTasks, setDailyFocusTasks } from '@/memory/tasks'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  const date = searchParams.get('date')

  if (!sessionId || !date) {
    return NextResponse.json({ error: 'sessionId and date are required' }, { status: 400 })
  }

  try {
    const cached = await getDailyFocusTasks(sessionId, date)
    if (cached) return NextResponse.json({ tasks: cached })

    const allTasks = await getOpenTasks(sessionId)
    const top3 = allTasks.slice(0, 3)

    if (top3.length > 0) {
      await setDailyFocusTasks(sessionId, date, top3.map(t => t.id))
    }

    return NextResponse.json({ tasks: top3 })
  } catch (err) {
    console.error('[daily-focus] error:', err)
    return NextResponse.json({ error: 'Could not load daily focus.' }, { status: 500 })
  }
}
