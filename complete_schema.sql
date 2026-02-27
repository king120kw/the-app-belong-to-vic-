-- ============================================================================
-- VICCALARY COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Copy and paste this ENTIRE file into your Supabase SQL Editor and run it.
-- This will ensure ALL tables and columns required by the application exist.
-- ============================================================================

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles (Core Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY, -- Matches Clerk User ID
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  goal_calories INTEGER, -- Daily calorie goal
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Onboarding Responses (Matches Onboarding.tsx questions exactly)
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Personal Info
  full_name TEXT,
  age INTEGER,
  gender TEXT,
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  
  -- Goals & Preferences
  goal TEXT,              -- Lose Weight, Maintain, Gain
  budget DECIMAL(10,2),   -- Monthly food budget
  preferences TEXT[],     -- Eating style (Home cooking, Eating out, etc.)
  daily_meal_frequency TEXT, -- 2 meals, 3 meals, etc.
  liked_foods TEXT[],     -- Rice, Chicken, etc.
  restrictions TEXT[],    -- Allergies (Lactose, Gluten, etc.)
  cooking_skill TEXT,     -- Beginner, Intermediate, Advanced
  meal_prep_time TEXT,    -- <15 mins, 15-30 mins, etc.
  target DECIMAL(5,2),    -- kg per month
  dietary_lifestyle TEXT[], -- Halal, Vegan, etc.
  calorie_flexibility TEXT, -- Strict, Moderate, Flexible
  activity_level TEXT,
  preferred_cuisines TEXT[],
  daily_calorie_goal INTEGER, -- Calculated TDEE-based goal
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 4. Food Items (Database of foods)
CREATE TABLE IF NOT EXISTS food_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  calories INTEGER,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fat DECIMAL(6,2),
  fiber DECIMAL(6,2),
  sugar DECIMAL(6,2),
  category TEXT,
  health_rating INTEGER CHECK (health_rating BETWEEN 1 AND 10),
  barcode TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  serving_size TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Food Analysis History (Logged meals from Camera/Scanner)
CREATE TABLE IF NOT EXISTS food_analysis_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES food_items(id),
  analysis_type TEXT, -- 'camera', 'scanner', 'manual'
  image_url TEXT,
  calories_consumed INTEGER,
  price_paid DECIMAL(10,2),
  notes TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  meal_type TEXT -- 'breakfast', 'lunch', 'dinner', 'snack'
);

-- 6. Recipes (Cookbook)
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  prep_time INTEGER, -- in minutes
  cook_time INTEGER, -- in minutes
  servings INTEGER,
  difficulty TEXT,
  cuisine_type TEXT,
  total_calories INTEGER,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fat DECIMAL(6,2),
  ingredients JSONB, -- Array of objects {name, amount, unit}
  instructions TEXT[], -- Array of strings
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6.1 Meals (Simplified version for quick suggestions)
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  calories INTEGER,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fat DECIMAL(6,2),
  meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'snack'
  cuisine_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data for meals
INSERT INTO meals (name, description, image_url, calories, protein, carbs, fat, meal_type, cuisine_type)
VALUES 
('Classic Oatmeal', 'Warm oats with berries and honey', 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400', 350, 10, 60, 5, 'breakfast', 'Western'),
('Greek Yogurt Parfait', 'Yogurt with granola and honey', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', 280, 15, 40, 4, 'breakfast', 'Mediterranean'),
('Avocado Toast', 'Sourdough with smashed avocado', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400', 420, 12, 35, 25, 'breakfast', 'Western'),
('Grilled Chicken Salad', 'Chicken breast with fresh greens', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', 450, 35, 10, 15, 'lunch', 'Western'),
('Quinoa Buddha Bowl', 'Quinoa with roasted vegetables', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', 520, 18, 75, 12, 'lunch', 'Vegetarian'),
('Turkey Sandwich', 'Whole grain bread with turkey and greens', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400', 380, 25, 45, 8, 'lunch', 'Western'),
('Baked Salmon', 'Salmon fillet with asparagus', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', 580, 45, 5, 35, 'dinner', 'Mediterranean'),
('Beef Stir Fry', 'Beef with broccoli and rice', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400', 650, 40, 80, 18, 'dinner', 'Asian'),
('Lentil Stew', 'Hearty lentil soup with spices', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', 420, 22, 65, 4, 'dinner', 'Middle Eastern')
ON CONFLICT DO NOTHING;

-- 7. User Recipe Interactions (Likes, Saves, Ratings)
CREATE TABLE IF NOT EXISTS user_recipe_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'like', 'save', 'cook'
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  interacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, recipe_id, interaction_type)
);

-- 8. Budgets (Financial Tracking)
CREATE TABLE IF NOT EXISTS user_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_budget DECIMAL(10,2) NOT NULL,
  current_balance DECIMAL(10,2) NOT NULL, -- Added to match code usage
  remaining_budget DECIMAL(10,2), -- Kept for compatibility if needed
  currency TEXT DEFAULT 'USD',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start, is_active)
);

-- 9. Budget Transactions (Spending)
CREATE TABLE IF NOT EXISTS budget_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES user_budgets(id) ON DELETE CASCADE,
  food_analysis_id UUID REFERENCES food_analysis_history(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Progress Measurements (Weight, Height logs)
CREATE TABLE IF NOT EXISTS progress_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) NOT NULL,
  height DECIMAL(5,2),
  measurement_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, measurement_date)
);

-- 11. Daily Progress (Aggregated stats per day)
CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  progress_date DATE NOT NULL,
  calories_consumed INTEGER DEFAULT 0,
  calories_goal INTEGER,
  meals_logged INTEGER DEFAULT 0,
  recipes_cooked INTEGER DEFAULT 0,
  budget_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, progress_date)
);

-- 12. Chat System
CREATE TABLE IF NOT EXISTS chat_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  country_code TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(phone_number)
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_type TEXT NOT NULL, -- 'direct', 'group'
  name TEXT,
  avatar_url TEXT,
  created_by TEXT REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- 'text', 'image', 'system'
  content TEXT,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  push_notifications_enabled BOOLEAN DEFAULT TRUE,
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'USD',
  timezone TEXT,
  subscription_status TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - ENABLE SECURITY
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recipe_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Create Policies (Simplified for development - allow users to access their own data)

-- Helper function to simplify policy creation
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
    
    DROP POLICY IF EXISTS "Users can view own onboarding" ON onboarding_responses;
    DROP POLICY IF EXISTS "Users can insert own onboarding" ON onboarding_responses;
    DROP POLICY IF EXISTS "Users can update own onboarding" ON onboarding_responses;
    
    DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
    DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
    DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
    
    DROP POLICY IF EXISTS "Users can view own food analysis" ON food_analysis_history;
    DROP POLICY IF EXISTS "Users can insert own food analysis" ON food_analysis_history;
    
    DROP POLICY IF EXISTS "Users can view own budgets" ON user_budgets;
    DROP POLICY IF EXISTS "Users can insert own budgets" ON user_budgets;
    DROP POLICY IF EXISTS "Users can update own budgets" ON user_budgets;

    DROP POLICY IF EXISTS "Anyone can view food items" ON food_items;
    DROP POLICY IF EXISTS "Anyone can view recipes" ON recipes;
    DROP POLICY IF EXISTS "Anyone can view meals" ON meals;

    DROP POLICY IF EXISTS "Users can view own milestones" ON user_milestones;
    DROP POLICY IF EXISTS "Users can insert own milestones" ON user_milestones;
    DROP POLICY IF EXISTS "Users can update own milestones" ON user_milestones;
END $$;

-- User Profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Onboarding
CREATE POLICY "Users can view own onboarding" ON onboarding_responses FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own onboarding" ON onboarding_responses FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own onboarding" ON onboarding_responses FOR UPDATE USING (auth.uid()::text = user_id);

-- Settings
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid()::text = user_id);

-- General "Own Data" Policies for other tables
CREATE POLICY "Users can view own food analysis" ON food_analysis_history FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own food analysis" ON food_analysis_history FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own budgets" ON user_budgets FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own budgets" ON user_budgets FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own budgets" ON user_budgets FOR UPDATE USING (auth.uid()::text = user_id);

-- Public Data
CREATE POLICY "Anyone can view food items" ON food_items FOR SELECT USING (true);
CREATE POLICY "Anyone can view recipes" ON recipes FOR SELECT USING (true);
CREATE POLICY "Anyone can view meals" ON meals FOR SELECT USING (true);

-- ============================================================================
-- TRIGGERS (Auto-update 'updated_at')
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_updated_at ON onboarding_responses;
CREATE TRIGGER update_onboarding_updated_at BEFORE UPDATE ON onboarding_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Force Schema Cache Reload

-- ============================================================================
-- 15. User Milestones (Hijri Calendar Progress)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  milestone_date DATE NOT NULL,
  plan_suggestion TEXT,
  objective TEXT,
  problems_faced TEXT,
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, milestone_date)
);

ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own milestones" ON user_milestones;
    DROP POLICY IF EXISTS "Users can insert own milestones" ON user_milestones;
    DROP POLICY IF EXISTS "Users can update own milestones" ON user_milestones;
END $$;

CREATE POLICY "Users can view own milestones" ON user_milestones FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own milestones" ON user_milestones FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own milestones" ON user_milestones FOR UPDATE USING (auth.uid()::text = user_id);

