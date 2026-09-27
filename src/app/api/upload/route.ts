// =============================================================================
// FLILINK — Custom product image upload
// =============================================================================
// POST (multipart, field "file"): stores the image in the public
// `product-images` bucket under the creator's folder and returns its URL.
// Uploads go through the service role, so the bucket needs no write policies.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createAdminClient } from '@/lib/supabase/admin';
import { jsonError, requireUser } from '@/lib/api';
import { MAX_IMAGE_UPLOAD_BYTES, PRODUCT_IMAGE_BUCKET } from '@/lib/constants';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { user } = auth;

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) return jsonError('No image received.');

    const ext = EXTENSIONS[file.type];
    if (!ext) return jsonError('Please choose a JPG, PNG or WebP image.');
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) return jsonError('Image is too large (max 5 MB).');

    const admin = createAdminClient();
    const path = `${user.id}/${Date.now()}-${nanoid(8)}.${ext}`;

    let { error } = await admin.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: '31536000' });

    // First upload on a fresh project: create the public bucket, then retry
    if (error && /bucket not found/i.test(error.message)) {
      await admin.storage.createBucket(PRODUCT_IMAGE_BUCKET, { public: true });
      ({ error } = await admin.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: '31536000' }));
    }

    if (error) {
      console.error('Image upload error:', error);
      return jsonError('Could not upload the image. Please try again.', 500);
    }

    const { data } = admin.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error('Upload route error:', err);
    return jsonError('Could not upload the image. Please try again.', 500);
  }
}
