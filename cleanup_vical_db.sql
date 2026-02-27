-- ============================================================================
-- RESET & CLEANUP SCRIPT
-- ============================================================================
-- WARNING: This will DELETE all tables and data for the Vical app.
-- Use this to "rectify" the state after running the wrong SQL.
-- ============================================================================

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS user_milestones CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS chat_users CASCADE;
DROP TABLE IF EXISTS daily_progress CASCADE;
DROP TABLE IF EXISTS progress_measurements CASCADE;
DROP TABLE IF EXISTS budget_transactions CASCADE;
DROP TABLE IF EXISTS user_budgets CASCADE;
DROP TABLE IF EXISTS user_recipe_interactions CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS food_analysis_history CASCADE;
DROP TABLE IF EXISTS food_items CASCADE;
DROP TABLE IF EXISTS onboarding_responses CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop triggers and functions
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Notify successful cleanup
DO $$ BEGIN
    RAISE NOTICE 'Vical Database tables have been cleaned up. You can now run complete_schema.sql';
END $$;
