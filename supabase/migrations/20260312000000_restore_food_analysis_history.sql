-- ============================================================================
-- RESTORE FOOD ANALYSIS HISTORY TABLE
-- ============================================================================

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Food Analysis History Table
-- This schema combines the original structure with the requested enhancements
CREATE TABLE IF NOT EXISTS food_analysis_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    food_item_id UUID REFERENCES food_items(id) ON DELETE SET NULL, -- Maintain link to items if they exist
    food_name TEXT, -- Enhanced: Store identified food name directly
    image_url TEXT,
    calories INTEGER,
    protein DECIMAL(6,2),
    carbs DECIMAL(6,2),
    fat DECIMAL(6,2),
    analysis_data JSONB, -- Enhanced: Stores rich AI analysis (origin, vitamins, etc.)
    notes TEXT,
    meal_type TEXT, -- Maintains compatibility: 'breakfast', 'lunch', 'dinner', 'snack'
    analysis_type TEXT, -- Maintains compatibility: 'camera', 'scanner', 'manual'
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_food_analysis_history_user_date ON food_analysis_history(user_id, analyzed_at DESC);

-- Enable RLS
ALTER TABLE food_analysis_history ENABLE ROW LEVEL SECURITY;

-- Create Policies
DO $$ 
BEGIN
    -- Drop existing policies if they somehow exist
    DROP POLICY IF EXISTS "Users can view own food analysis" ON food_analysis_history;
    DROP POLICY IF EXISTS "Users can insert own food analysis" ON food_analysis_history;
    DROP POLICY IF EXISTS "Users can update own food analysis" ON food_analysis_history;
    DROP POLICY IF EXISTS "Users can delete own food analysis" ON food_analysis_history;
END $$;

CREATE POLICY "Users can view own food analysis" ON food_analysis_history 
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own food analysis" ON food_analysis_history 
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own food analysis" ON food_analysis_history 
    FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own food analysis" ON food_analysis_history 
    FOR DELETE USING (auth.uid()::text = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_food_analysis_history_updated_at ON food_analysis_history;
CREATE TRIGGER update_food_analysis_history_updated_at BEFORE UPDATE ON food_analysis_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
