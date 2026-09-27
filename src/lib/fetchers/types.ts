// =============================================================================
// FLILINK — Fetcher Types
// =============================================================================
// Shared types for the modular product metadata fetching system.
// =============================================================================

import type { MetadataStatus, PlatformName } from '@/types';

/**
 * Result returned by a platform-specific metadata adapter.
 */
export interface AdapterResult {
  title: string | null;
  imageUrl: string | null;
  price: string | null;
  originalPrice: string | null;
  platformName: PlatformName;
  status: MetadataStatus;
}

/**
 * Interface that all platform adapters must implement.
 */
export interface MetadataAdapter {
  /**
   * Attempt to fetch product metadata from the given URL.
   * Must not throw — returns a result with appropriate status on failure.
   */
  fetch(url: string): Promise<AdapterResult>;
}

/**
 * Options for the metadata service orchestrator.
 */
export interface FetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
}
