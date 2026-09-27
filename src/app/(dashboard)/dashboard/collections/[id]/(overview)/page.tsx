// =============================================================================
// FLILINK — Collection overview
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getCollectionOverview } from '@/lib/data';
import { CollectionOverview } from '@/components/collection/CollectionOverview';

export default async function CollectionOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSession();
  if (!user) redirect('/login');

  const data = await getCollectionOverview(supabase, user.id, id);
  if (!data) notFound();

  return <CollectionOverview key={data.collection.id} collection={data.collection} products={data.products} />;
}
