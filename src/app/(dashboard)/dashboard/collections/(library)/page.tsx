// =============================================================================
// FLILINK — Collections library
// =============================================================================

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getCollectionsWithStats } from '@/lib/data';
import { CollectionsLibrary } from '@/components/dashboard/CollectionsLibrary';

export default async function CollectionsPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login');

  const collections = await getCollectionsWithStats(supabase, user.id);
  return <CollectionsLibrary collections={collections} />;
}
