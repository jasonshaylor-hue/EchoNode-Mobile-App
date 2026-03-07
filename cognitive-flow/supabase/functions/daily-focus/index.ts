// cognitive-flow/supabase/functions/daily-focus/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

async function getUserId(req: Request): Promise<string | null> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" } })
  }

  const userId = await getUserId(req)
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

  const url = new URL(req.url)
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10)

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  // Check for existing cached daily focus
  const { data: existing } = await db
    .from("daily_focus")
    .select("task_ids")
    .eq("user_id", userId)
    .eq("focus_date", date)
    .maybeSingle()

  if (existing?.task_ids?.length) {
    const { data: tasks } = await db
      .from("tasks")
      .select("*")
      .in("id", existing.task_ids)
      .eq("status", "open")

    return new Response(JSON.stringify({ tasks: tasks ?? [] }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    })
  }

  // No cache — pick top 3 by mention_count
  const { data: topTasks } = await db
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("mention_count", { ascending: false })
    .limit(3)

  const focusTasks = topTasks ?? []

  if (focusTasks.length > 0) {
    await db.from("daily_focus").upsert({
      user_id: userId,
      focus_date: date,
      task_ids: focusTasks.map((t: any) => t.id),
    }, { onConflict: "user_id,focus_date" })
  }

  return new Response(JSON.stringify({ tasks: focusTasks }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  })
})
