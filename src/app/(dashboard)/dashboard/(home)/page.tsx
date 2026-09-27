// =============================================================================
// FLILINK — Home dashboard
// =============================================================================

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getCollectionsWithStats } from '@/lib/data';
import { HomeView } from '@/components/dashboard/HomeView';

export default async function DashboardPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login');

  const [{ data: profile }, collections] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
    getCollectionsWithStats(supabase, user.id),
  ]);

  const name = profile?.full_name || user.email || 'C';
  return <HomeView initials={name.trim().charAt(0).toUpperCase()} collections={collections} />;
}
