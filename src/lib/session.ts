// =============================================================================
// FLILINK — Per-request session
// Layout and page both need the user; React cache() makes that one auth call.
// =============================================================================

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});
