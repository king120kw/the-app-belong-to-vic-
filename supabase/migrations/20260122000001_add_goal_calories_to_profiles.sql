-- ============================================================================
-- ADD MISSING COLUMNS TO USER_PROFILES
-- ============================================================================
-- This migration adds goal_calories column that stores the user's daily
-- calorie goal calculated during onboarding
-- ============================================================================

-- Add goal_calories column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS goal_calories INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.goal_calories IS 'Daily calorie goal for the user, calculated during onboarding';
