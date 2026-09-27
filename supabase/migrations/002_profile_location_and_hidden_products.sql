-- =============================================================================
-- FLILINK — Migration 002
-- =============================================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- Safe to run more than once.
--
-- 1. Profile location fields collected at sign up (city, state, pincode)
-- 2. Product hide / unhide from the public storefront
-- 3. Public storage bucket for custom product images
-- =============================================================================

-- 1. Profile location fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode TEXT NOT NULL DEFAULT '';

-- 2. Hidden products are kept (with their clicks) but not shown on the storefront
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_collection_position
  ON products(collection_id, position);

-- 3. Storage bucket for custom product images (uploads go through the
--    server with the service role, so only public read is needed here)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;
