// =============================================================================
// FLILINK — Route handler helpers
// =============================================================================

import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Resolve the signed-in creator, or a ready-made 401 response. */
export async function requireUser(): Promise<
  { supabase: ServerClient; user: User; response?: never } | { response: NextResponse; supabase?: never; user?: never }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { response: jsonError('Your session has expired. Please log in again.', 401) };
  return { supabase, user };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
