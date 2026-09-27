// =============================================================================
// FLILINK — Supabase Admin Client
// =============================================================================
// Uses the service_role key — bypasses RLS.
// ONLY use in server-side code for admin operations like
// recording analytics events from public visitors.
// NEVER import this in client components or expose to the browser.
// =============================================================================

import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
