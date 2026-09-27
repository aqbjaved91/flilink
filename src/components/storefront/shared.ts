// =============================================================================
// FLILINK — Storefront helpers shared by the grid card and product detail
// =============================================================================

import { discountPercent, productSource } from '@/lib/utils';
import type { Product } from '@/types';

export type StorefrontProduct = Pick<
  Product,
  'id' | 'title' | 'image_url' | 'price' | 'original_price' | 'platform_name' | 'original_url'
>;

/** Shop Now goes through the redirect route so the click is counted. */
export function shopNowUrl(product: StorefrontProduct) {
  return `/api/redirect/${product.id}`;
}

export function productDisplay(product: StorefrontProduct) {
  const source = productSource(product.platform_name, product.original_url);
  const pct = discountPercent(product.price, product.original_price);
  return {
    source,
    title: product.title || `View on ${source}`,
    pct,
    showMrp: !!(product.original_price && pct),
  };
}

/** WhatsApp message: bold title, price line, store and the product link. */
export function whatsappShareUrl(product: StorefrontProduct) {
  const { source, pct, showMrp } = productDisplay(product);
  const lines = [
    product.title ? `*${product.title}*` : null,
    product.price
      ? [product.price, showMrp ? `~${product.original_price}~` : null, pct ? `(${pct}% OFF)` : null]
          .filter(Boolean)
          .join('  ')
      : null,
    source.toUpperCase(),
    product.original_url,
  ].filter(Boolean);
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}
