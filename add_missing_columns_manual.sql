-- ============================================================================
-- MANUAL FIX: Add missing columns to onboarding_responses
-- ============================================================================
-- Run this SQL in your Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/zoyqmukmteamrlmjrpcq/sql
-- ============================================================================

-- Add activity_level column
ALTER TABLE onboarding_responses 
ADD COLUMN IF NOT EXISTS activity_level TEXT;

-- Add preferred_cuisines column
ALTER TABLE onboarding_responses 
ADD COLUMN IF NOT EXISTS preferred_cuisines TEXT[];

-- Add daily_calorie_goal column (calculated and stored during onboarding)
ALTER TABLE onboarding_responses 
ADD COLUMN IF NOT EXISTS daily_calorie_goal INTEGER;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'onboarding_responses' 
AND column_name IN ('activity_level', 'preferred_cuisines', 'daily_calorie_goal')
ORDER BY column_name;
