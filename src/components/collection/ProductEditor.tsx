// =============================================================================
// FLILINK — Edit Product
// Change the image (compressed on the phone before upload), title, price,
// MRP and product link. "Save Changes" stays grey until something changes.
// The ⟳ button re-fetches details from the link into the form (not saved
// until Save Changes).
// =============================================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ClipboardPaste, IndianRupee, RefreshCw, Undo2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ProductImage } from '@/components/ui/ProductImage';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { MAX_IMAGE_UPLOAD_BYTES, ROUTES } from '@/lib/constants';
import { CLIPBOARD_MESSAGES, readClipboard } from '@/lib/clipboard';
import { cleanLinkInput, cn, discountPercent, formatPriceInput, isValidUrl, priceDigits } from '@/lib/utils';
import type { Product } from '@/types';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Resize to at most 1200px and re-encode as JPEG so uploads are small and fast. */
async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff'; // transparent PNGs get a white background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob ? new File([blob], 'product.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

function sanitizePrice(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

export function ProductEditor({ product }: { product: Product }) {
  const router = useRouter();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const initial = {
    title: product.title ?? '',
    price: priceDigits(product.price),
    mrp: priceDigits(product.original_price),
    url: product.original_url,
    image: product.image_url,
  };

  const [title, setTitle] = useState(initial.title);
  const [price, setPrice] = useState(initial.price);
  const [mrp, setMrp] = useState(initial.mrp);
  const [url, setUrl] = useState(initial.url);
  const [imageUrl, setImageUrl] = useState<string | null>(initial.image);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);

  // Free the local preview when it's replaced or the screen closes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const cleanUrl = cleanLinkInput(url);
  const urlError = !isValidUrl(cleanUrl) ? 'Enter a valid product link (https://…)' : '';
  const dirty =
    title.trim() !== initial.title.trim() ||
    formatPriceInput(price) !== formatPriceInput(initial.price) ||
    formatPriceInput(mrp) !== formatPriceInput(initial.mrp) ||
    cleanUrl !== initial.url ||
    !!imageFile ||
    imageUrl !== initial.image;
  const canSave = dirty && !urlError && !saving;
  const pct = discountPercent(formatPriceInput(price), formatPriceInput(mrp));

  const backToCollection = () => {
    if (window.history.length > 1) router.back();
    else router.push(ROUTES.COLLECTION(product.collection_id));
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Please choose an image', 'error');
    const compressed = await compressImage(file);
    if (!ACCEPTED_TYPES.includes(compressed.type)) return toast('Please choose a JPG, PNG or WebP image', 'error');
    if (compressed.size > MAX_IMAGE_UPLOAD_BYTES) return toast('Image is too large (max 5 MB)', 'error');
    setImageFile(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
  };

  const resetImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setImageUrl(initial.image);
  };

  const refetch = async () => {
    if (urlError) return toast('Enter a valid product link first', 'error');
    setRefetching(true);
    try {
      const res = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Couldn’t fetch details from this link');
      if (data.title) setTitle(data.title);
      if (data.price) setPrice(priceDigits(data.price));
      if (data.originalPrice) setMrp(priceDigits(data.originalPrice));
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        setImageFile(null);
        setPreviewUrl(null);
      }
      toast('Details refreshed — tap Save Changes to keep them');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t fetch details', 'error');
    } finally {
      setRefetching(false);
    }
  };

  const pasteLink = async () => {
    const result = await readClipboard();
    if (!result.ok) return toast(CLIPBOARD_MESSAGES[result.reason], 'error');
    const link = cleanLinkInput(result.text);
    if (!isValidUrl(link)) return toast('No link found in what you copied', 'error');
    setUrl(link);
    setUrlTouched(true);
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let finalImage = imageUrl;
      if (imageFile) {
        const form = new FormData();
        form.append('file', imageFile);
        const upload = await fetch('/api/upload', { method: 'POST', body: form });
        const uploaded = await upload.json().catch(() => ({}));
        if (!upload.ok) throw new Error(uploaded.error || 'Could not upload the image');
        finalImage = uploaded.url;
      }

      const body: Record<string, string> = {};
      if (title.trim() !== initial.title.trim()) body.title = title;
      if (formatPriceInput(price) !== formatPriceInput(initial.price)) body.price = price;
      if (formatPriceInput(mrp) !== formatPriceInput(initial.mrp)) body.original_price = mrp;
      if (cleanUrl !== initial.url) body.original_url = cleanUrl;
      if (finalImage !== initial.image) body.image_url = finalImage ?? '';

      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save the product');

      toast('Product updated');
      router.refresh();
      backToCollection();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save the product', 'error');
      setSaving(false);
    }
  };

  const shownImage = previewUrl ?? imageUrl;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <PageHeader
        title="Edit Product"
        onBack={() => (dirty ? setConfirmLeave(true) : backToCollection())}
        right={
          <button
            onClick={refetch}
            disabled={refetching}
            aria-label="Fetch latest details from the link"
            title="Fetch latest details from the link"
            className="tap flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-canvas"
          >
            <RefreshCw className={cn('h-[18px] w-[18px]', refetching && 'animate-spin')} />
          </button>
        }
      />

      <div className="flex-1 space-y-5 px-4 pb-6 pt-5">
        {/* Image */}
        <div className="grid grid-cols-2 gap-3">
          <ProductImage
            key={shownImage ?? 'none'}
            src={shownImage}
            alt={title || 'Product image'}
            eager
            className="aspect-[4/5] rounded-3xl border border-line"
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInput.current?.click()}
              className="tap flex flex-1 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line bg-canvas text-sm font-semibold text-ink-2 hover:border-brand/40 hover:text-brand"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-card">
                <Camera className="h-5 w-5" />
              </span>
              Change Image
            </button>
            {(imageFile || imageUrl !== initial.image) && (
              <button
                onClick={resetImage}
                className="tap flex h-10 items-center justify-center gap-1.5 rounded-2xl text-xs font-semibold text-muted hover:bg-canvas"
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo image change
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pickImage(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="product-title" className="mb-1.5 block text-[13px] font-semibold text-ink-2">
            Product Title
          </label>
          <textarea
            id="product-title"
            rows={3}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Polo Sweatshirt Men Winter Wear"
            className="w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-[16px] leading-snug text-ink outline-none transition-colors placeholder:text-subtle focus:border-ink focus:ring-4 focus:ring-ink/5"
          />
        </div>

        {/* Prices */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Price (Optional)"
              inputMode="decimal"
              placeholder="749"
              value={price}
              onChange={(e) => setPrice(sanitizePrice(e.target.value))}
              leading={<IndianRupee className="h-4 w-4" />}
            />
            <Field
              label="MRP (Optional)"
              inputMode="decimal"
              placeholder="1999"
              value={mrp}
              onChange={(e) => setMrp(sanitizePrice(e.target.value))}
              leading={<IndianRupee className="h-4 w-4" />}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {pct ? (
              <>
                Shoppers will see <span className="font-semibold text-success">{pct}% OFF</span>
              </>
            ) : (
              'Add an MRP higher than the price to show a discount badge.'
            )}
          </p>
        </div>

        {/* Link */}
        <Field
          label="Product Link"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => {
            setUrlTouched(true);
            setUrl((u) => cleanLinkInput(u));
          }}
          error={urlTouched ? urlError : undefined}
          trailing={
            <button
              type="button"
              onClick={pasteLink}
              aria-label="Paste link"
              className="tap -mr-2 flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-canvas hover:text-ink"
            >
              <ClipboardPaste className="h-[18px] w-[18px]" />
            </button>
          }
        />
      </div>

      <div className="pb-safe sticky bottom-0 border-t border-line/70 bg-white/95 px-4 pt-3 backdrop-blur-lg">
        <Button fullWidth className="mb-3" onClick={save} disabled={!canSave} loading={saving}>
          Save Changes
        </Button>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        icon={Undo2}
        title="Discard changes?"
        message="You have unsaved changes to this product."
        confirmLabel="Discard"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          backToCollection();
        }}
      />
    </div>
  );
}
