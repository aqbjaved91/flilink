'use client';

// Friendly fallback if a dashboard screen fails to load (e.g. network drop)
import { RotateCw, WifiOff } from 'lucide-react';

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand">
        <WifiOff className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">Please check your connection and try again.</p>
      <button
        onClick={reset}
        className="tap mt-7 flex h-12 items-center gap-2 rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-brand"
      >
        <RotateCw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}
