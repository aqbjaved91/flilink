// =============================================================================
// FLILINK — Home dashboard
// Welcome header, Recent / Most Clicked filter and a single featured
// collection card. Empty state invites the creator to make their first one.
// =============================================================================

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock, Flame, Heart, MousePointerClick, Plus, Sparkle } from 'lucide-react';
import { CollectionCover, Logo } from '@/components/ui/Logo';
import { ProductImage } from '@/components/ui/ProductImage';
import { CollectionMenu } from './CollectionMenu';
import { StatusBadge } from './StatusBadge';
import { ShareActions } from './ShareActions';
import { handwriting } from '@/lib/fonts';
import { ROUTES } from '@/lib/constants';
import { cn, timeAgo } from '@/lib/utils';
import type { CollectionWithStats } from '@/types';

type Filter = 'recent' | 'clicked';

interface HomeViewProps {
  initials: string;
  collections: CollectionWithStats[];
}

export function HomeView({ initials, collections: initial }: HomeViewProps) {
  const [filter, setFilter] = useState<Filter>('recent');
  const [collections, setCollections] = useState(initial);
  const [synced, setSynced] = useState(initial);

  // Server data wins whenever the page is refreshed
  if (initial !== synced) {
    setSynced(initial);
    setCollections(initial);
  }

  const featured = useMemo(() => {
    if (collections.length === 0) return null;
    if (filter === 'recent') return collections[0]; // already newest first
    return collections.reduce((best, c) =>
      c.product_click_count > best.product_click_count ? c : best
    );
  }, [collections, filter]);

  return (
    <div className="pb-32">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pb-2 pt-5">
        <Logo />
        <Link
          href={ROUTES.PROFILE}
          aria-label="Your profile"
          className="tap flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-[15px] font-bold text-brand ring-1 ring-brand-100"
        >
          {initials}
        </Link>
      </header>

      <section className="px-5 pt-5">
        <h1 className="text-[30px] font-extrabold tracking-tight text-ink">
          Welcome <span className="inline-block origin-[70%_70%] animate-[wave_1.6s_ease-in-out_1]">👋</span>
        </h1>
        <p className="mt-1 text-[15px] text-muted">Here are your collections</p>

        {collections.length > 0 && (
          <div className="mt-5 flex gap-2.5">
            <FilterChip active={filter === 'recent'} onClick={() => setFilter('recent')} icon={Clock}>
              Recent
            </FilterChip>
            <FilterChip active={filter === 'clicked'} onClick={() => setFilter('clicked')} icon={Flame}>
              Most Clicked
            </FilterChip>
          </div>
        )}
      </section>

      <section className="px-4 pt-5">
        {featured ? (
          <FeaturedCard
            key={featured.id}
            collection={featured}
            onRenamed={(name) =>
              setCollections((list) => list.map((c) => (c.id === featured.id ? { ...c, name } : c)))
            }
            onDeleted={() => setCollections((list) => list.filter((c) => c.id !== featured.id))}
          />
        ) : (
          <EmptyState />
        )}
      </section>

      {featured && (
        <div className="mt-12 flex flex-col items-center text-center text-ink-2/70">
          <Sparkle className="h-5 w-5 fill-brand text-brand" />
          <p className={cn(handwriting.className, 'mt-2 -rotate-3 text-[26px] leading-tight')}>
            One link.
            <br />
            Many possibilities.
          </p>
          <Heart className="mt-1 h-5 w-5" strokeWidth={1.6} />
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'tap flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold',
        active
          ? 'bg-brand text-white shadow-[0_6px_16px_rgba(242,85,61,0.28)]'
          : 'border border-line bg-white text-ink-2 hover:bg-canvas'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function FeaturedCard({
  collection: c,
  onRenamed,
  onDeleted,
}: {
  collection: CollectionWithStats;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
}) {
  const extra = Math.max(0, c.product_count - c.preview_images.length);

  return (
    <article className="animate-fade-up rounded-[28px] bg-white p-4 shadow-card">
      <div className="flex gap-4">
        <CollectionCover className="h-[104px] w-[104px]" />
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-start gap-2">
            <h2 className="line-clamp-2 flex-1 text-[18px] font-bold leading-snug text-ink">{c.name}</h2>
            <CollectionMenu
              collection={c}
              variant="card"
              onRenamed={onRenamed}
              onDeleted={onDeleted}
              className="-mr-1 -mt-1"
            />
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {c.product_count} product{c.product_count === 1 ? '' : 's'}
          </p>
          <StatusBadge status={c.status} className="mt-2" />
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <CalendarDays className="h-3.5 w-3.5" />
            Created {timeAgo(c.created_at)}
          </p>
        </div>
      </div>

      {/* Product clicks → collection overview with the per-product breakdown */}
      <Link
        href={ROUTES.COLLECTION(c.id)}
        className="tap mt-4 flex items-center gap-3.5 rounded-2xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50/80 to-white p-3.5"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600">
          <MousePointerClick className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block text-[22px] font-extrabold leading-none text-ink">
            {c.product_click_count.toLocaleString('en-IN')}
          </span>
          <span className="mt-1 block text-[13px] text-muted">Product Clicks</span>
        </span>
        <ArrowRight className="h-5 w-5 text-ink-2" />
      </Link>

      {c.preview_images.length > 0 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {c.preview_images.map((src, i) => (
            <ProductImage key={i} src={src} alt="" className="aspect-[4/5] rounded-xl" />
          ))}
          {extra > 0 && (
            <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-canvas text-sm font-semibold text-muted">
              +{extra}
            </div>
          )}
        </div>
      )}

      <ShareActions slug={c.public_slug} className="mt-3" />
    </article>
  );
}

function EmptyState() {
  return (
    <div className="animate-fade-up flex flex-col items-center rounded-[28px] bg-white px-6 py-10 text-center shadow-card">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-brand-50">
          <CollectionCover className="h-14 w-14 rounded-xl" />
        </div>
        <Sparkle className="absolute -right-3 -top-2 h-5 w-5 fill-brand text-brand" />
      </div>
      <h2 className="mt-6 text-xl font-bold text-ink">Create your first collection</h2>
      <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted">
        Paste product links from Flipkart, Amazon, Myntra or any store and share them as one link.
      </p>
      <Link
        href={ROUTES.NEW_COLLECTION}
        className="tap mt-6 flex h-12 items-center gap-2 rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-brand hover:bg-brand-600"
      >
        <Plus className="h-4 w-4" strokeWidth={2.6} />
        Create Collection
      </Link>
    </div>
  );
}
