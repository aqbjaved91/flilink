// =============================================================================
// FLILINK — Collections API Route
// =============================================================================
// POST: Create a collection and its product rows (metadata pending).
// The client then fetches metadata per product via
// POST /api/products/[id]/metadata so it can show real progress.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createCollectionSlug, normalizeUrl, isValidUrl, getPublicCollectionUrl } from '@/lib/utils';
import { MAX_LINKS_PER_COLLECTION } from '@/lib/constants';
import { jsonError, requireUser } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const body = await request.json().catch(() => ({}));
    const { name, urls } = body as { name?: string; urls?: string[] };

    if (!name || !name.trim()) return jsonError('Collection name is required.');
    if (name.trim().length > 60) return jsonError('Collection name is too long.');

    if (!Array.isArray(urls)) return jsonError('At least one product link is required.');

    const cleaned = urls.map((u) => String(u).trim()).filter(Boolean);
    if (cleaned.length === 0) return jsonError('At least one product link is required.');
    if (cleaned.length > MAX_LINKS_PER_COLLECTION)
      return jsonError(`You can add up to ${MAX_LINKS_PER_COLLECTION} products per collection.`);

    const invalid = cleaned.find((u) => !isValidUrl(u));
    if (invalid) return jsonError(`Invalid link: ${invalid}`);

    // Drop duplicates (after normalisation) while keeping the creator's order
    const seen = new Set<string>();
    const unique = cleaned.filter((u) => {
      const n = normalizeUrl(u);
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });

    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .insert({
        owner_id: user.id,
        name: name.trim(),
        public_slug: createCollectionSlug(),
        status: 'active',
      })
      .select('id, public_slug')
      .single();

    if (collectionError || !collection) {
      console.error('Collection creation error:', collectionError);
      return jsonError('Could not create the collection. Please try again.', 500);
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .insert(
        unique.map((url, index) => ({
          collection_id: collection.id,
          owner_id: user.id,
          original_url: url,
          normalized_url: normalizeUrl(url),
          position: index,
          metadata_status: 'pending' as const,
        }))
      )
      .select('id, position')
      .order('position', { ascending: true });

    if (productsError || !products) {
      console.error('Product insertion error:', productsError);
      // Don't leave an empty collection behind
      await supabase.from('collections').delete().eq('id', collection.id);
      return jsonError('Could not save your product links. Please try again.', 500);
    }

    return NextResponse.json({
      collection_id: collection.id,
      public_slug: collection.public_slug,
      public_url: getPublicCollectionUrl(collection.public_slug),
      product_count: products.length,
      product_ids: products.map((p) => p.id),
    });
  } catch (err) {
    console.error('Create collection error:', err);
    return jsonError('Something went wrong. Please try again.', 500);
  }
}
