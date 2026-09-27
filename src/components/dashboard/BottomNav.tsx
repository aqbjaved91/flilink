// =============================================================================
// FLILINK — Bottom navigation
// Home · (+) create · Collections. Only shown on the two tab screens.
// =============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Layers, Plus } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === ROUTES.DASHBOARD) return <BottomNavBar active="home" />;
  if (pathname === ROUTES.COLLECTIONS) return <BottomNavBar active="collections" />;
  return null;
}

export function BottomNavBar({ active }: { active: 'home' | 'collections' }) {
  const onHome = active === 'home';
  const onCollections = active === 'collections';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md">
      <div className="pb-safe relative rounded-t-[28px] border-t border-line/70 bg-white/95 shadow-[0_-8px_30px_rgba(17,24,39,0.06)] backdrop-blur-lg">
        <div className="grid h-[68px] grid-cols-3 items-center">
          <Tab href={ROUTES.DASHBOARD} active={onHome} label="Home" icon={House} />

          <div className="flex justify-center">
            <Link
              href={ROUTES.NEW_COLLECTION}
              aria-label="Create collection"
              className="tap -mt-9 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-brand text-white shadow-brand ring-[6px] ring-white hover:bg-brand-600"
            >
              <Plus className="h-7 w-7" strokeWidth={2.6} />
            </Link>
          </div>

          <Tab href={ROUTES.COLLECTIONS} active={onCollections} label="Collections" icon={Layers} />
        </div>
      </div>
    </nav>
  );
}

function Tab({
  href,
  active,
  label,
  icon: Icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'tap flex flex-col items-center justify-center gap-1 text-[11px] font-semibold',
        active ? 'text-brand' : 'text-muted hover:text-ink'
      )}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}
