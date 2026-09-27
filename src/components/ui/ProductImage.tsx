// =============================================================================
// FLILINK — Product image with graceful fallback
// Remote marketplace images are loaded directly (no optimiser round-trip) and
// fall back to a neutral tile if the host blocks hotlinking.
// =============================================================================

'use client';

import { useCallback, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
  fit?: 'cover' | 'contain';
  eager?: boolean;
}

export function ProductImage({ src, alt, className, fit = 'cover', eager }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Server-rendered images can finish (or fail) before React hydrates, in
  // which case onLoad / onError never fire — check their state on mount
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) setLoaded(true);
    else setFailed(true);
  }, []);

  if (!src || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-canvas text-subtle', className)}>
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-canvas', className)}>
      {!loaded && <div className="skeleton absolute inset-0 rounded-none" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          'h-full w-full transition-opacity duration-300',
          fit === 'cover' ? 'object-cover object-top' : 'object-contain',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}
