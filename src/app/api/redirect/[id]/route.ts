// =============================================================================
// FLILINK — Shop Now Redirect API
// =============================================================================
// Redirects to the product's stored original URL (affiliate params intact)
// and records a product click after the response is sent.
// =============================================================================

import { NextRequest, NextResponse, after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const supabase = createAdminClient();

    const { data: product } = await supabase
      .from('products')
      .select('original_url, collection_id')
      .eq('id', productId)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Only ever redirect to http(s) destinations
    let destination: URL;
    try {
      destination = new URL(product.original_url);
    } catch {
      return NextResponse.json({ error: 'Invalid redirect URL' }, { status: 400 });
    }
    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
      return NextResponse.json({ error: 'Invalid redirect destination' }, { status: 400 });
    }

    after(async () => {
      const { error } = await supabase.from('click_events').insert({
        collection_id: product.collection_id,
        product_id: productId,
        event_type: 'product_click',
      });
      if (error) console.error('Click tracking error:', error);
    });

    return NextResponse.redirect(destination.toString(), 302);
  } catch (err) {
    console.error('Redirect error:', err);
    return NextResponse.json({ error: 'Redirect failed' }, { status: 500 });
  }
}
