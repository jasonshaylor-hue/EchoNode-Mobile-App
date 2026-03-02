import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/thought'
import type { ExtractedTask } from '@/lib/extract-tasks'

export async function upsertTasks(
  tasks: ExtractedTask[],
  sessionId: string,
  thoughtId: string
): Promise<void> {
  for (const task of tasks) {
    const { data: existing } = await (supabase.from('tasks') as any)
      .select('id, mention_count')
      .eq('session_id', sessionId)
      .eq('status', 'open')
      .ilike('title', `%${task.title}%`)
      .limit(1)
      .single()

    if (existing) {
      await (supabase.from('tasks') as any)
        .update({ mention_count: existing.mention_count + 1 })
        .eq('id', existing.id)
    } else {
      await (supabase.from('tasks') as any).insert({
        session_id: sessionId,
        thought_id: thoughtId,
        title: task.title,
        priority: task.priority,
      })
    }
  }
}

export async function getOpenTasks(sessionId: string): Promise<Task[]> {
  const { data, error } = await (supabase.from('tasks') as any)
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'open')
    .order('mention_count', { ascending: false })

  if (error || !data) return []
  return data.map(dbToTask)
}

export async function completeTask(taskId: string): Promise<void> {
  const { error } = await (supabase.from('tasks') as any)
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) {
    console.error('[supabase] complete task failed:', error.message)
    throw error
  }
}

export async function getDailyFocusTasks(
  sessionId: string,
  date: string
): Promise<Task[] | null> {
  const { data: focusData } = await (supabase.from('daily_focus') as any)
    .select('task_ids')
    .eq('session_id', sessionId)
    .eq('focus_date', date)
    .single()

  if (!focusData) return null

  const { data, error } = await (supabase.from('tasks') as any)
    .select('*')
    .in('id', focusData.task_ids)

  if (error || !data) return null
  return data.map(dbToTask)
}

export async function setDailyFocusTasks(
  sessionId: string,
  date: string,
  taskIds: string[]
): Promise<void> {
  await (supabase.from('daily_focus') as any).upsert({
    session_id: sessionId,
    focus_date: date,
    task_ids: taskIds,
  })
}

function dbToTask(row: any): Task {
  return {
    id: row.id,
    sessionId: row.session_id,
    thoughtId: row.thought_id,
    title: row.title,
    priority: row.priority,
    status: row.status,
    mentionCount: row.mention_count,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  }
}
