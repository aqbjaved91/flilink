-- =============================================================================
-- FLILINK — Database Schema v1
-- =============================================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This creates all tables, indexes, RLS policies, and triggers.
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. PROFILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone_number TEXT NOT NULL DEFAULT '',
  instagram_username TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- =============================================================================
-- 2. COLLECTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  public_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collections_owner_id ON collections(owner_id);
CREATE UNIQUE INDEX idx_collections_public_slug ON collections(public_slug);
CREATE INDEX idx_collections_status ON collections(status);

-- =============================================================================
-- 3. PRODUCTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  normalized_url TEXT NOT NULL DEFAULT '',
  title TEXT,
  image_url TEXT,
  price TEXT,
  original_price TEXT,
  platform_name TEXT NOT NULL DEFAULT 'Unknown',
  metadata_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (metadata_status IN ('pending', 'processing', 'completed', 'partial', 'failed', 'retry_available')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_collection_id ON products(collection_id);
CREATE INDEX idx_products_owner_id ON products(owner_id);
CREATE INDEX idx_products_metadata_status ON products(metadata_status);

-- Prevent exact duplicate URLs within the same collection (after normalization)
CREATE UNIQUE INDEX idx_products_collection_normalized_url
  ON products(collection_id, normalized_url);

-- =============================================================================
-- 4. CLICK EVENTS (Analytics)
-- =============================================================================
-- Unified events table for both page views and product clicks.
-- event_type: 'page_view' or 'product_click'
-- product_id is NULL for page_view events.
CREATE TABLE IF NOT EXISTS click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'product_click')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_click_events_collection_id ON click_events(collection_id);
CREATE INDEX idx_click_events_product_id ON click_events(product_id);
CREATE INDEX idx_click_events_event_type ON click_events(event_type);
CREATE INDEX idx_click_events_created_at ON click_events(created_at);

-- =============================================================================
-- 5. AUTO-UPDATE updated_at TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- --- Profiles ---
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --- Collections ---
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own collections
CREATE POLICY "Creators can view own collections"
  ON collections FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Creators can insert own collections"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Creators can update own collections"
  ON collections FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Creators can delete own collections"
  ON collections FOR DELETE
  USING (auth.uid() = owner_id);

-- Public can view active collections by slug (for storefront)
CREATE POLICY "Public can view active collections"
  ON collections FOR SELECT
  USING (status = 'active');

-- --- Products ---
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own products
CREATE POLICY "Creators can view own products"
  ON products FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Creators can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Creators can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Creators can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = owner_id);

-- Public can view products belonging to active collections (for storefront)
CREATE POLICY "Public can view products in active collections"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = products.collection_id
      AND collections.status = 'active'
    )
  );

-- --- Click Events ---
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert click events (public storefront visitors)
CREATE POLICY "Anyone can insert click events"
  ON click_events FOR INSERT
  WITH CHECK (true);

-- Creators can view click events for their own collections
CREATE POLICY "Creators can view own collection events"
  ON click_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = click_events.collection_id
      AND collections.owner_id = auth.uid()
    )
  );
