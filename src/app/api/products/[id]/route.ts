// =============================================================================
// FLILINK — Single Product API Route
// =============================================================================
// PATCH:  Update a product's image, title, price, MRP, link or hidden flag
// DELETE: Permanently remove a product from its collection
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireUser } from '@/lib/api';
import { detectPlatform, formatPriceInput, isValidUrl, normalizeUrl } from '@/lib/utils';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, string | null> = {};

    if (body.title !== undefined) {
      const title = String(body.title ?? '').trim();
      if (title.length > 200) return jsonError('Title is too long.');
      updates.title = title || null;
    }
    if (body.price !== undefined) updates.price = formatPriceInput(String(body.price ?? ''));
    if (body.original_price !== undefined)
      updates.original_price = formatPriceInput(String(body.original_price ?? ''));

    if (body.image_url !== undefined) {
      const img = String(body.image_url ?? '').trim();
      if (img && !isValidUrl(img)) return jsonError('Invalid image.');
      updates.image_url = img || null;
    }

    if (body.original_url !== undefined) {
      const url = String(body.original_url ?? '').trim();
      if (!isValidUrl(url)) return jsonError('Please enter a valid product link.');
      updates.original_url = url;
      updates.normalized_url = normalizeUrl(url);
      const platform = detectPlatform(url);
      if (platform !== 'Unknown') updates.platform_name = platform;
    }

    const patch: Record<string, string | boolean | null> = { ...updates };
    if (body.is_hidden !== undefined) patch.is_hidden = !!body.is_hidden;

    if (Object.keys(patch).length === 0) return jsonError('Nothing to update.');

    const { data, error } = await supabase
      .from('products')
      .update(patch)
      .eq('id', id)
      .eq('owner_id', user.id)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') return jsonError('Another product in this collection already uses this link.', 409);
      return jsonError('Could not save the product. Please try again.', 500);
    }
    if (!data) return jsonError('Product not found.', 404);

    return NextResponse.json({ product: data });
  } catch {
    return jsonError('Something went wrong. Please try again.', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const { error } = await supabase.from('products').delete().eq('id', id).eq('owner_id', user.id);
    if (error) return jsonError('Could not delete the product. Please try again.', 500);
    return NextResponse.json({ success: true });
  } catch {
    return jsonError('Something went wrong. Please try again.', 500);
  }
}
