// =============================================================================
// FLILINK — Storefront product card
// Tall image, store name, title, price + discount, Shop Now + WhatsApp.
// Tapping the image or text opens the product detail view.
// =============================================================================

'use client';

import { ProductImage } from '@/components/ui/ProductImage';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { productDisplay, shopNowUrl, whatsappShareUrl, type StorefrontProduct } from './shared';

interface ProductCardProps {
  product: StorefrontProduct;
  onOpen: () => void;
  eager?: boolean;
}

export function ProductCard({ product, onOpen, eager }: ProductCardProps) {
  const { source, title, pct, showMrp } = productDisplay(product);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card">
      <button onClick={onOpen} className="block w-full text-left" aria-label={`View ${title}`}>
        <ProductImage src={product.image_url} alt={title} eager={eager} className="aspect-[3/4] w-full" />
        <div className="px-2.5 pt-2.5">
          <p className="truncate text-[11px] font-extrabold uppercase tracking-wide text-ink">{source}</p>
          <p className="mt-0.5 truncate text-[13px] text-ink-2">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            {showMrp && <span className="text-xs text-subtle line-through">{product.original_price}</span>}
            <span className="text-sm font-bold text-ink">{product.price ?? 'View price'}</span>
            {pct && (
              <span className="rounded bg-success px-1 py-0.5 text-[10px] font-bold leading-none text-white">
                {pct}% OFF
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="mt-auto flex items-center gap-2 p-2.5">
        <a
          href={shopNowUrl(product)}
          target="_blank"
          rel="noopener noreferrer"
          className="tap flex h-9 flex-1 items-center justify-center rounded-xl bg-brand text-[13px] font-bold text-white hover:bg-brand-600"
        >
          Shop Now
        </a>
        <a
          href={whatsappShareUrl(product)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-whatsapp text-whatsapp hover:bg-[#e9fbf0]"
        >
          <WhatsAppIcon className="h-[18px] w-[18px]" />
        </a>
      </div>
    </article>
  );
}
