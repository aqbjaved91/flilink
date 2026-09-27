// =============================================================================
// FLILINK — Fetch product metadata
// =============================================================================
// POST: Fetch title, image and price for one product and save them.
// Called per product by the create-collection screen to drive its progress bar.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireUser } from '@/lib/api';
import { fetchAndStoreMetadata } from '@/lib/products';

export const maxDuration = 30;

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { supabase, user } = auth;

    const { data: product } = await supabase
      .from('products')
      .select('id, original_url, title, image_url, price, original_price, platform_name')
      .eq('id', id)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!product) return jsonError('Product not found.', 404);

    // Mark in-flight so other screens don't start a duplicate fetch
    await supabase.from('products').update({ metadata_status: 'processing' }).eq('id', product.id);

    const updated = await fetchAndStoreMetadata(supabase, product);
    return NextResponse.json({ product: updated });
  } catch (err) {
    console.error('Metadata route error:', err);
    return jsonError('Could not fetch product details.', 500);
  }
}
