// =============================================================================
// FLILINK — Supabase Browser Client
// =============================================================================
// Used in client components (hooks, event handlers).
// Uses the anon key — respects RLS policies.
// =============================================================================

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
