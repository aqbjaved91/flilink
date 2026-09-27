// =============================================================================
// FLILINK — Edit product
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { ProductEditor } from '@/components/collection/ProductEditor';
import type { Product } from '@/types';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const { id, productId } = await params;
  const { supabase, user } = await getSession();
  if (!user) redirect('/login');

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('collection_id', id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!product) notFound();
  return <ProductEditor key={product.id} product={product as Product} />;
}
