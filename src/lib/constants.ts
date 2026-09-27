// =============================================================================
// FLILINK — Application Constants
// =============================================================================

// --- Routes ---
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  COLLECTIONS: '/dashboard/collections',
  NEW_COLLECTION: '/dashboard/collections/new',
  PROFILE: '/dashboard/profile',
  PUBLIC_COLLECTION: (slug: string) => `/c/${slug}`,
  COLLECTION: (id: string) => `/dashboard/collections/${id}`,
  ADD_PRODUCTS: (id: string) => `/dashboard/collections/${id}/add`,
  EDIT_PRODUCT: (collectionId: string, productId: string) =>
    `/dashboard/collections/${collectionId}/products/${productId}`,
} as const;

// --- Public slug config ---
export const SLUG_LENGTH = 8;
export const SLUG_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// --- Metadata fetching ---
export const FETCH_CONCURRENCY_LIMIT = 3;

// --- Platform detection patterns (matched against the link's hostname) ---
export const PLATFORM_PATTERNS: Record<string, RegExp> = {
  Amazon: /(^|\.)(amazon\.(in|com|co\.uk|ae|ca)|amzn\.(to|in|eu)|a\.co|link\.amazon|amzlinks?\.in)$/i,
  Flipkart: /(^|\.)(flipkart\.com|fkrt\.(co|it|cc))$/i,
  Shopsy: /(^|\.)shopsy\.in$/i,
  Meesho: /(^|\.)(meesho\.(com|in)|msho\.in|meesho\.onelink\.me)$/i,
  Myntra: /(^|\.)(myntra\.com|myntr\.it)$/i,
  Ajio: /(^|\.)(ajio\.com|ajiio\.in)$/i,
};

// --- OTP config ---
export const OTP_LENGTH = 8;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

// --- Collection creation ---
export const DEFAULT_LINK_FIELDS = 9;
export const MAX_LINKS_PER_COLLECTION = 50;

// --- Custom product images ---
export const PRODUCT_IMAGE_BUCKET = 'product-images';
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

// --- UI ---
export const MAX_TITLE_DISPLAY_LENGTH = 60;
export const IMAGE_PLACEHOLDER = '/placeholder-product.svg';
