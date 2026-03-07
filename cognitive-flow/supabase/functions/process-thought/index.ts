// cognitive-flow/supabase/functions/process-thought/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GROQ_KEY = Deno.env.get("GROQ_API_KEY")!
const MODEL = "llama-3.3-70b-versatile"
const MAX_ATTEMPTS = 3

// ── helpers ────────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text.replace(/^```(?:json)?\n?|```$/gm, "").trim()
}

async function groqChat(system: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content
}

function extractTasksFromHierarchy(node: any, acc: any[] = []): any[] {
  if (node.type === "task" || node.type === "subtask") {
    acc.push({ title: node.title, priority: node.priority })
  }
  for (const child of node.children ?? []) extractTasksFromHierarchy(child, acc)
  return acc
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

// ── system prompts (verbatim from agents/) ─────────────────────────────────

const CAPTURE_SYSTEM = `You are a cognitive capture assistant for people with ADHD.
Clean up the spoken brain dump and respond with ONLY valid JSON, no markdown, no explanation.
Format: {"cleanedText": "...", "intent": "..."}
- cleanedText: remove filler words (um, uh, like, you know), fix fragments into clear statements, max 2 sentences
- intent: one sentence describing what the user wants to accomplish`

const CLASSIFY_SYSTEM = `Classify the thought into exactly one category and respond with ONLY valid JSON, no markdown, no explanation.
Format: {"category": "Task"|"Idea"|"Reference"}
- Task: has a clear action item (schedule, build, call, write, fix, create, review)
- Idea: a concept or inspiration without a defined next action
- Reference: a fact, information, or resource to remember`

const ORGANIZE_SYSTEM = `You are a project organizer for someone with ADHD.
Break the thought into a hierarchy and respond with ONLY valid JSON, no markdown, no explanation.
Format: {"hierarchy": {"title": "...", "type": "project|task|subtask|note", "priority": "high|medium|low", "children": [...]}}
Rules:
- Titles: 3-6 words, actionable and specific
- Only 1 high-priority item per level maximum
- Depth: 2-4 levels
- Tasks and subtasks are concrete next actions (not vague)
- References: single note node, no children`

const EVALUATE_SYSTEM = `You are a quality reviewer for ADHD task hierarchies.
Evaluate and respond with ONLY valid JSON, no markdown, no explanation.
Format: {"pass": true|false, "feedback": "one sentence if failing, empty string if passing"}
Criteria: titles 3-6 words, at most 1 high-priority per level, depth 2-4 max, tasks are concrete next actions.`

// ── handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const userId = await getUserId(req)
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const { rawText } = await req.json()
  if (!rawText || typeof rawText !== "string" || rawText.length > 2000) {
    return new Response(JSON.stringify({ error: "rawText required, max 2000 chars" }), { status: 400 })
  }

  // Stage 1: Capture — clean text + extract intent
  const captureRaw = await groqChat(CAPTURE_SYSTEM, rawText)
  const { cleanedText, intent } = JSON.parse(stripMarkdown(captureRaw))

  // Stage 2: Classify — Task | Idea | Reference
  const classifyRaw = await groqChat(CLASSIFY_SYSTEM, `Thought: "${cleanedText}"\nIntent: "${intent}"`)
  const { category } = JSON.parse(stripMarkdown(classifyRaw))

  // Stage 3: Organize — evaluator-optimizer loop (max 3 attempts)
  let hierarchy = null
  let feedback = ""

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const organizePrompt = attempt === 0
      ? `Category: ${category}\nThought: "${cleanedText}"`
      : `Category: ${category}\nThought: "${cleanedText}"\n\nPrevious attempt failed: ${feedback}\nPlease fix these issues.`

    try {
      const organizeRaw = await groqChat(ORGANIZE_SYSTEM, organizePrompt)
      const parsed = JSON.parse(stripMarkdown(organizeRaw))
      const candidate = parsed.hierarchy

      const evalRaw = await groqChat(
        EVALUATE_SYSTEM,
        `Category: ${category}\nOriginal: "${cleanedText}"\nHierarchy: ${JSON.stringify(candidate)}`
      )
      const { pass, feedback: fb } = JSON.parse(stripMarkdown(evalRaw))

      if (pass) { hierarchy = candidate; break }
      feedback = fb
    } catch { continue }
  }

  if (!hierarchy) {
    return new Response(JSON.stringify({ error: "Processing failed after max attempts" }), { status: 500 })
  }

  // Persist to Supabase using service role (bypasses RLS)
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const thoughtId = crypto.randomUUID()

  await db.from("thoughts").insert({
    id: thoughtId,
    user_id: userId,
    raw_text: rawText,
    cleaned_text: cleanedText,
    category,
    intent,
    hierarchy,
  })

  // Upsert tasks: increment mention_count if same title + open status exists
  const extractedTasks = extractTasksFromHierarchy(hierarchy)
  for (const task of extractedTasks) {
    const { data: existing } = await db
      .from("tasks")
      .select("id, mention_count")
      .eq("user_id", userId)
      .eq("status", "open")
      .ilike("title", task.title)
      .maybeSingle()

    if (existing) {
      await db.from("tasks").update({ mention_count: existing.mention_count + 1 }).eq("id", existing.id)
    } else {
      await db.from("tasks").insert({
        user_id: userId,
        thought_id: thoughtId,
        title: task.title,
        priority: task.priority,
      })
    }
  }

  const result = {
    id: thoughtId,
    rawText,
    cleanedText,
    category,
    intent,
    hierarchy,
    userId,
    createdAt: new Date().toISOString(),
    tags: [],
  }

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
})
