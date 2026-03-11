-- ============================================================================
-- RESTORE MISSING NOTES COLUMNS
-- ============================================================================

-- Add notes to food_analysis_history if missing
ALTER TABLE food_analysis_history 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes to user_recipe_interactions if missing
ALTER TABLE user_recipe_interactions 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes to progress_measurements if missing
ALTER TABLE progress_measurements 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update comments for clarity
COMMENT ON COLUMN food_analysis_history.notes IS 'Analysis breakdown, advice, or political warnings';
COMMENT ON COLUMN user_recipe_interactions.notes IS 'User comments or reviews for the recipe';
COMMENT ON COLUMN progress_measurements.notes IS 'Additional context for weight/height measurements';
