-- ============================================================================
-- ADD MISSING COLUMNS TO ONBOARDING_RESPONSES
-- ============================================================================
-- This migration adds the missing columns that are referenced in the app
-- but were not included in the initial schema migration
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

-- Add comments for documentation
COMMENT ON COLUMN onboarding_responses.activity_level IS 'User activity level for calorie calculations';
COMMENT ON COLUMN onboarding_responses.preferred_cuisines IS 'Array of preferred cuisine types';
COMMENT ON COLUMN onboarding_responses.daily_calorie_goal IS 'Calculated daily calorie goal based on TDEE and user goals';
