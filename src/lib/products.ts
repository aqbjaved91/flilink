// =============================================================================
// FLILINK — Product details persistence
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchMetadataForUrl } from '@/lib/fetchers/metadata-service';
import { cleanTitle, titleFromUrl } from '@/lib/fetchers/extract';
import type { Product } from '@/types';

type StoredDetails = Pick<
  Product,
  'id' | 'original_url' | 'title' | 'image_url' | 'price' | 'original_price' | 'platform_name'
>;

/**
 * Fetch title / image / price for a product's link and fill in whatever the
 * product is still missing. Values the creator has set are never overwritten
 * (a placeholder title made from the link counts as missing), so "Retry" is
 * always safe. Never throws for store failures — the product just stays as is.
 */
export async function fetchAndStoreMetadata(
  supabase: SupabaseClient,
  product: StoredDetails
): Promise<Product | null> {
  const result = await fetchMetadataForUrl(product.original_url);

  // Missing, made from the link, or junk from a blocked page ("Amazon.in")
  const placeholderTitle =
    !product.title || product.title === titleFromUrl(product.original_url) || !cleanTitle(product.title);
  const title = placeholderTitle ? (result.title ?? product.title) : product.title;
  const image = product.image_url ?? result.imageUrl;
  const price = product.price ?? result.price;

  const found = [title, image, price].filter(Boolean).length;

  const { data } = await supabase
    .from('products')
    .update({
      title,
      image_url: image,
      price,
      original_price: product.original_price ?? result.originalPrice,
      platform_name:
        product.platform_name && product.platform_name !== 'Unknown' ? product.platform_name : result.platformName,
      metadata_status: found === 3 ? 'completed' : found > 0 ? 'partial' : 'failed',
    })
    .eq('id', product.id)
    .select('*')
    .maybeSingle();

  return (data as Product) ?? null;
}
