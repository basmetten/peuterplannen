-- Migration: Remove basis tier, migrate all basis data to featured
-- Run via: supabase db push  OR  Supabase Dashboard → SQL Editor

-- Migrate venue_owners
UPDATE public.venue_owners SET plan_tier = 'featured' WHERE plan_tier = 'basis';
UPDATE public.venue_owners SET subscription_status = 'featured' WHERE subscription_status = 'basis';

-- Migrate locations
UPDATE public.locations SET featured_tier = 'featured' WHERE featured_tier = 'basis';
