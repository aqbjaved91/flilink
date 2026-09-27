import { Link2Off } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function StorefrontNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-white px-8 text-center">
      <Logo tagline={false} />
      <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand">
        <Link2Off className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-ink">This collection isn’t available</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        The link may be wrong, or the creator has hidden or removed this collection.
      </p>
    </div>
  );
}
