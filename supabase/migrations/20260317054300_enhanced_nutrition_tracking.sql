-- Enhanced Nutrition Tracking Migration
-- Add consumption tracking to daily_progress
ALTER TABLE public.daily_progress 
ADD COLUMN IF NOT EXISTS protein_consumed numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS carbs_consumed numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS fat_consumed numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS fiber_consumed numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sugar_consumed numeric DEFAULT 0;

-- Add goal tracking to onboarding_responses
ALTER TABLE public.onboarding_responses
ADD COLUMN IF NOT EXISTS protein_goal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS carbs_goal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS fat_goal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS fiber_goal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sugar_goal numeric DEFAULT 0;
