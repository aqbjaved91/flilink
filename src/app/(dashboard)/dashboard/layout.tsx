// =============================================================================
// FLILINK — Dashboard Layout
// Protected mobile app frame for every /dashboard/* screen.
// =============================================================================

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { BottomNav } from '@/components/dashboard/BottomNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSession();
  if (!user) redirect('/login');

  return (
    <div className="relative mx-auto min-h-dvh max-w-md bg-canvas shadow-[0_0_40px_rgba(17,24,39,0.06)]">
      {children}
      <BottomNav />
    </div>
  );
}
