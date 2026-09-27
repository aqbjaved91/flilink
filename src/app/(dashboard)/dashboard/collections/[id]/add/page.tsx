// =============================================================================
// FLILINK — Add more products to a collection
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AddProductsForm } from '@/components/collection/AddProductsForm';

export default async function AddProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSession();
  if (!user) redirect('/login');

  const [{ data: collection }, { data: products }] = await Promise.all([
    supabase.from('collections').select('id, name').eq('id', id).eq('owner_id', user.id).maybeSingle(),
    supabase.from('products').select('normalized_url').eq('collection_id', id).eq('owner_id', user.id),
  ]);
  if (!collection) notFound();

  return (
    <AddProductsForm
      collectionId={collection.id}
      collectionName={collection.name}
      existingUrls={(products || []).map((p) => p.normalized_url)}
    />
  );
}
