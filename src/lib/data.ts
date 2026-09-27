// =============================================================================
// FLILINK — Server-side data loaders for the creator dashboard
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Collection, CollectionWithStats, Product, ProductWithClicks } from '@/types';

const PREVIEW_IMAGE_COUNT = 4;

/** All of a creator's collections, newest first, with product and click counts. */
export async function getCollectionsWithStats(
  supabase: SupabaseClient,
  userId: string
): Promise<CollectionWithStats[]> {
  const { data: collections } = await supabase
    .from('collections')
    .select('*')
    .eq('owner_id', userId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  if (!collections || collections.length === 0) return [];

  const ids = collections.map((c) => c.id);

  const [{ data: products }, { data: clicks }] = await Promise.all([
    supabase
      .from('products')
      .select('collection_id, image_url')
      .in('collection_id', ids)
      .order('position', { ascending: true }),
    // Clicks on deleted products (product_id nulled) are left out so the
    // collection total always equals the sum shown per product
    supabase
      .from('click_events')
      .select('collection_id')
      .in('collection_id', ids)
      .eq('event_type', 'product_click')
      .not('product_id', 'is', null),
  ]);

  const productCount = new Map<string, number>();
  const previews = new Map<string, string[]>();
  products?.forEach((p) => {
    productCount.set(p.collection_id, (productCount.get(p.collection_id) || 0) + 1);
    if (p.image_url) {
      const list = previews.get(p.collection_id) || [];
      if (list.length < PREVIEW_IMAGE_COUNT) {
        list.push(p.image_url);
        previews.set(p.collection_id, list);
      }
    }
  });

  const clickCount = new Map<string, number>();
  clicks?.forEach((e) => clickCount.set(e.collection_id, (clickCount.get(e.collection_id) || 0) + 1));

  return (collections as Collection[]).map((c) => ({
    ...c,
    product_count: productCount.get(c.id) || 0,
    product_click_count: clickCount.get(c.id) || 0,
    preview_images: previews.get(c.id) || [],
  }));
}

/** One collection with every product (including hidden) and per-product clicks. */
export async function getCollectionOverview(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string
): Promise<{ collection: Collection; products: ProductWithClicks[] } | null> {
  const { data: collection } = await supabase
    .from('collections')
    .select('*')
    .eq('id', collectionId)
    .eq('owner_id', userId)
    .neq('status', 'deleted')
    .maybeSingle();

  if (!collection) return null;

  const [{ data: products }, { data: clicks }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('collection_id', collectionId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('click_events')
      .select('product_id')
      .eq('collection_id', collectionId)
      .eq('event_type', 'product_click'),
  ]);

  const clickCount = new Map<string, number>();
  clicks?.forEach((e) => {
    if (e.product_id) clickCount.set(e.product_id, (clickCount.get(e.product_id) || 0) + 1);
  });

  return {
    collection: collection as Collection,
    products: ((products || []) as Product[]).map((p) => ({
      ...p,
      is_hidden: !!p.is_hidden,
      click_count: clickCount.get(p.id) || 0,
    })),
  };
}
