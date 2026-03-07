// cognitive-flow/supabase/functions/next-task/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GROQ_KEY = Deno.env.get("GROQ_API_KEY")!
const MODEL = "llama-3.3-70b-versatile"

function stripMarkdown(text: string): string {
  return text.replace(/^```(?:json)?\n?|```$/gm, "").trim()
}

async function groqChat(system: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      temperature: 0.2,
    }),
  })
  const data = await res.json()
  return data.choices[0].message.content
}

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

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  const { data: tasks, error } = await db
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("mention_count", { ascending: false })
    .limit(10)

  if (error || !tasks?.length) {
    return new Response(JSON.stringify({ task: null, rationale: "No open tasks found." }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    })
  }

  const taskList = tasks.map((t: any, i: number) =>
    `${i + 1}. [${t.priority.toUpperCase()}] "${t.title}" (mentioned ${t.mention_count}x, id: ${t.id})`
  ).join("\n")

  const system = `You are an ADHD task coach helping reduce decision paralysis.
Pick the single best next task and respond with ONLY valid JSON, no markdown.
Format: {"taskId": "uuid", "rationale": "one sentence why"}
Consider: priority (high > medium > low), mention frequency (more = more important), cognitive ease.`

  const raw = await groqChat(system, `Open tasks:\n${taskList}`)

  let chosenTask = null
  let rationale = "Start with your highest-priority task."

  try {
    const { taskId, rationale: r } = JSON.parse(stripMarkdown(raw))
    chosenTask = tasks.find((t: any) => t.id === taskId) ?? tasks[0]
    rationale = r
  } catch {
    chosenTask = tasks[0]
  }

  return new Response(JSON.stringify({ task: chosenTask, rationale }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  })
})
