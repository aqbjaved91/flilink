// =============================================================================
// FLILINK — Profile
// =============================================================================

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { ProfileView } from '@/components/dashboard/ProfileView';

export default async function ProfilePage() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();

  return (
    <ProfileView
      profile={{
        full_name: profile?.full_name ?? '',
        email: profile?.email || user.email || '',
        phone_number: profile?.phone_number ?? '',
        instagram_username: profile?.instagram_username ?? '',
        city: profile?.city ?? '',
        state: profile?.state ?? '',
        pincode: profile?.pincode ?? '',
      }}
    />
  );
}
