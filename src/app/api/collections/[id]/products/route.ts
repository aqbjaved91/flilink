// =============================================================================
// FLILINK — Collection products API Route
// =============================================================================
// POST: Add a product link to an existing collection (metadata fetched inline)
// PUT:  Save the product order (body: { order: string[] of product ids })
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireUser } from '@/lib/api';
import { isValidUrl, normalizeUrl } from '@/lib/utils';
import { fetchAndStoreMetadata } from '@/lib/products';
import { MAX_LINKS_PER_COLLECTION } from '@/lib/constants';

type Params = { params: Promise<{ id: string }> };

export const maxDuration = 30;

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const body = await request.json().catch(() => ({}));
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    if (!isValidUrl(url)) return jsonError('Please paste a valid product link.');

    const { data: collection } = await supabase
      .from('collections')
      .select('id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!collection) return jsonError('Collection not found.', 404);

    const { data: existing } = await supabase
      .from('products')
      .select('position')
      .eq('collection_id', id)
      .order('position', { ascending: false });

    if ((existing?.length || 0) >= MAX_LINKS_PER_COLLECTION)
      return jsonError(`A collection can have up to ${MAX_LINKS_PER_COLLECTION} products.`);

    const { data: inserted, error } = await supabase
      .from('products')
      .insert({
        collection_id: id,
        owner_id: user.id,
        original_url: url,
        normalized_url: normalizeUrl(url),
        position: (existing?.[0]?.position ?? -1) + 1,
        metadata_status: 'pending',
      })
      .select('*')
      .single();

    if (error || !inserted) {
      if (error?.code === '23505') return jsonError('This product is already in the collection.', 409);
      return jsonError('Could not add the product. Please try again.', 500);
    }

    const product = (await fetchAndStoreMetadata(supabase, inserted)) ?? inserted;
    return NextResponse.json({ product: { ...product, is_hidden: !!product.is_hidden, click_count: 0 } });
  } catch (err) {
    console.error('Add product error:', err);
    return jsonError('Something went wrong. Please try again.', 500);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const body = await request.json().catch(() => ({}));
    const order: string[] = Array.isArray(body.order)
      ? body.order.filter((v: unknown): v is string => typeof v === 'string')
      : [];
    if (order.length === 0) return jsonError('Nothing to save.');

    const results = await Promise.all(
      order.map((productId, position) =>
        supabase
          .from('products')
          .update({ position })
          .eq('id', productId)
          .eq('collection_id', id)
          .eq('owner_id', user.id)
      )
    );

    if (results.some((r) => r.error)) {
      console.error('Save product order errors:', results.map((r) => r.error).filter(Boolean));
      return jsonError('Could not save the new order. Please try again.', 500);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Save product order error:', err);
    return jsonError('Something went wrong. Please try again.', 500);
  }
}
