// =============================================================================
// FLILINK — Public collection storefront
// Server-rendered, no login. Hidden products and hidden collections are never
// shown. Page views are recorded after the response is sent.
// =============================================================================

import { cache } from 'react';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { StorefrontView } from '@/components/storefront/StorefrontView';
import type { StorefrontProduct } from '@/components/storefront/shared';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ p?: string }>;
}

// Shared by generateMetadata and the page within one request
const getStorefront = cache(async (slug: string) => {
  const supabase = createAdminClient();
  const { data: collection } = await supabase
    .from('collections')
    .select('id, name, status')
    .eq('public_slug', slug)
    .maybeSingle();

  if (!collection || collection.status !== 'active') return null;

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('collection_id', collection.id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  const visible: StorefrontProduct[] = (products || [])
    .filter((p) => !p.is_hidden)
    .map((p) => ({
      id: p.id,
      title: p.title,
      image_url: p.image_url,
      price: p.price,
      original_price: p.original_price,
      platform_name: p.platform_name,
      original_url: p.original_url,
    }));

  return { collection, products: visible };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStorefront(slug);
  if (!data) return { title: 'Collection not available — Flilink' };

  const image = data.products.find((p) => p.image_url)?.image_url;
  const description = `Shop ${data.products.length} handpicked product${data.products.length === 1 ? '' : 's'} from ${data.collection.name}.`;
  return {
    title: `${data.collection.name} — Flilink`,
    description,
    openGraph: {
      title: data.collection.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicCollectionPage({ params, searchParams }: PageProps) {
  const [{ slug }, { p }] = await Promise.all([params, searchParams]);
  const data = await getStorefront(slug);
  if (!data) notFound();

  after(async () => {
    const { error } = await createAdminClient().from('click_events').insert({
      collection_id: data.collection.id,
      product_id: null,
      event_type: 'page_view',
    });
    if (error) console.error('Page view tracking error:', error);
  });

  return (
    <StorefrontView
      collectionName={data.collection.name}
      products={data.products}
      initialProductId={typeof p === 'string' ? p : null}
    />
  );
}
