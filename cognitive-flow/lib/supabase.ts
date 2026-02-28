import { createClient } from '@supabase/supabase-js'

// Lazy singleton — defers createClient call until first use so that
// build-time page-data collection does not throw on placeholder env vars.
let _client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    _client = createClient(url, key)
  }
  return _client
}

export const supabase: ReturnType<typeof createClient> = new Proxy(
  {} as ReturnType<typeof createClient>,
  {
    get(_target, prop) {
      return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
    },
  }
)
