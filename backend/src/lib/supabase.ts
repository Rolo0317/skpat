import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

// Admin client — has service_role privileges, BYPASSES Row Level Security.
// NEVER expose this client or its key to the frontend.
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Anon client — used to verify user tokens / make user-scoped queries.
export const supabaseAnon: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
