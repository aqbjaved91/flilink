import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-white px-8 text-center">
      <Logo tagline={false} />
      <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-muted">This page doesn’t exist or may have been removed.</p>
      <Link
        href="/dashboard"
        className="tap mt-7 flex h-12 items-center rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-brand"
      >
        Go to Home
      </Link>
    </div>
  );
}
