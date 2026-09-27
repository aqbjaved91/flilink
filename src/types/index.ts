// =============================================================================
// FLILINK — Shared Type Definitions
// =============================================================================

// --- Database row types ---

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  instagram_username: string;
  city: string;
  state: string;
  pincode: string;
  created_at: string;
  updated_at: string;
}

export type CollectionStatus = 'active' | 'archived' | 'deleted';

export interface Collection {
  id: string;
  owner_id: string;
  name: string;
  public_slug: string;
  status: CollectionStatus;
  created_at: string;
  updated_at: string;
}

export type MetadataStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'retry_available';

export interface Product {
  id: string;
  collection_id: string;
  owner_id: string;
  original_url: string;
  normalized_url: string;
  title: string | null;
  image_url: string | null;
  price: string | null;
  original_price: string | null;
  platform_name: string;
  metadata_status: MetadataStatus;
  position: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export type EventType = 'page_view' | 'product_click';

export interface ClickEvent {
  id: string;
  collection_id: string;
  product_id: string | null;
  event_type: EventType;
  created_at: string;
}

// --- Dashboard display types ---

export interface CollectionWithStats extends Collection {
  product_count: number;
  product_click_count: number;
  preview_images: string[];
}

export interface ProductWithClicks extends Product {
  click_count: number;
}

// --- Metadata fetching types ---

export type PlatformName = 'Flipkart' | 'Shopsy' | 'Meesho' | 'Amazon' | 'Myntra' | 'Ajio' | 'Unknown';

export interface MetadataResult {
  title: string | null;
  image_url: string | null;
  price: string | null;
  original_price: string | null;
  platform_name: PlatformName;
  status: MetadataStatus;
}

export interface URLValidationResult {
  is_valid: boolean;
  url: string;
  normalized_url: string;
  error?: string;
}

// --- Collection creation types ---

export interface CreateCollectionPayload {
  name: string;
  urls: string[];
}

export interface CreateCollectionResult {
  collection_id: string;
  public_slug: string;
  public_url: string;
  product_count: number;
  product_ids: string[];
}
