// =============================================================================
// FLILINK — Storefront product detail
// Full-screen view: big image, store, title, price, Shop Now and
// Share on WhatsApp.
// =============================================================================

'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ExternalLink, Share2 } from 'lucide-react';
import { ProductImage } from '@/components/ui/ProductImage';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { productDisplay, shopNowUrl, whatsappShareUrl, type StorefrontProduct } from './shared';

interface ProductDetailProps {
  product: StorefrontProduct;
  onClose: () => void;
  onShare: () => void;
}

export function ProductDetail({ product, onClose, onShare }: ProductDetailProps) {
  const { source, title, pct, showMrp } = productDisplay(product);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[60] mx-auto max-w-md overflow-y-auto bg-white animate-sheet-up">
      <div className="relative">
        <ProductImage
          src={product.image_url}
          alt={title}
          eager
          fit="contain"
          className="aspect-[4/5] w-full bg-[#f4f5f7]"
        />
        <button
          onClick={onClose}
          aria-label="Back to collection"
          className="tap absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink shadow-card"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
        </button>
        <button
          onClick={onShare}
          aria-label="Share"
          className="tap absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink shadow-card"
        >
          <Share2 className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="px-5 pb-8 pt-5">
        <p className="text-xs font-extrabold uppercase tracking-wider text-ink">{source}</p>
        <h1 className="mt-1.5 text-lg font-semibold leading-snug text-ink">{title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {showMrp && <span className="text-base text-subtle line-through">{product.original_price}</span>}
          <span className="text-2xl font-extrabold text-ink">{product.price ?? ''}</span>
          {pct && (
            <span className="rounded-md bg-success px-2 py-1 text-xs font-bold text-white">{pct}% OFF</span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a
            href={shopNowUrl(product)}
            target="_blank"
            rel="noopener noreferrer"
            className="tap flex h-13 items-center justify-center gap-2 rounded-2xl bg-brand text-[15px] font-bold text-white shadow-brand hover:bg-brand-600"
          >
            <ExternalLink className="h-[18px] w-[18px]" />
            Shop Now
          </a>
          <a
            href={whatsappShareUrl(product)}
            target="_blank"
            rel="noopener noreferrer"
            className="tap flex h-13 items-center justify-center gap-2 rounded-2xl bg-whatsapp text-[14px] font-bold leading-tight text-white shadow-[0_8px_20px_rgba(37,211,102,0.3)]"
          >
            <WhatsAppIcon className="h-5 w-5 shrink-0" />
            Share on WhatsApp
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
