import { createClient } from '@supabase/supabase-js'

// This client uses the service role key, which bypasses RLS and allows administrative actions.
// ONLY use this in server-side code (API routes, Server Components).
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
