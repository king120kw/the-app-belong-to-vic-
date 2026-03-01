-- VicCalary Backend Database Schema (Robust & Clerk Compatible)
-- Complete migration for all app features

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY, -- Clerk User ID
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding Responses
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  full_name TEXT,
  age INTEGER,
  gender TEXT,
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  goal TEXT,
  budget DECIMAL(10,2),
  preferences TEXT[],
  target DECIMAL(5,2),
  daily_meal_frequency TEXT,
  liked_foods TEXT[],
  restrictions TEXT[],
  cooking_skill TEXT,
  meal_prep_time TEXT,
  dietary_lifestyle TEXT[],
  calorie_flexibility TEXT,
  activity_level TEXT,
  preferred_cuisines TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- FOOD & NUTRITION SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS food_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES food_items(id),
  analysis_type TEXT,
  image_url TEXT,
  calories_consumed INTEGER,
  price_paid DECIMAL(10,2),
  notes TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  meal_type TEXT
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  difficulty TEXT,
  cuisine_type TEXT,
  total_calories INTEGER,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fat DECIMAL(6,2),
  ingredients JSONB,
  instructions TEXT[],
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_recipe_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  interacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, recipe_id, interaction_type, interacted_at)
);

-- ============================================================================
-- BUDGET & FINANCE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_budget DECIMAL(10,2) NOT NULL,
  remaining_budget DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start, is_active)
);

CREATE TABLE IF NOT EXISTS budget_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES user_budgets(id) ON DELETE CASCADE,
  food_analysis_id UUID REFERENCES food_analysis_history(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PROGRESS & HEALTH TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS progress_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) NOT NULL,
  height DECIMAL(5,2),
  measurement_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, measurement_date)
);

CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ============================================================================
-- CHAT SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_by TEXT REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  content TEXT,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id TEXT NOT NULL REFERENCES user_profiles(id),
  call_type TEXT NOT NULL,
  duration INTEGER,
  status TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_food_analysis_user_date ON food_analysis_history(user_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, progress_date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_interactions_user ON user_recipe_interactions(user_id, interacted_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
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

-- Drop existing policies to avoid "already exists" errors
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Create Policies
-- Create Policies using standard auth.uid() function
CREATE POLICY "Allow individual read" ON user_profiles FOR SELECT TO authenticated USING (auth.uid()::text = id);
CREATE POLICY "Allow individual update" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid()::text = id);
CREATE POLICY "Allow individual insert" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Allow individual read" ON onboarding_responses FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON onboarding_responses FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual update" ON onboarding_responses FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "Allow individual read" ON user_settings FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual update" ON user_settings FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "Allow individual read" ON chat_users FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON chat_users FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual update" ON chat_users FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "Allow individual read" ON conversation_participants FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON conversation_participants FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "view_messages" ON messages FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()::text));

CREATE POLICY "send_messages" ON messages FOR INSERT TO authenticated 
WITH CHECK (auth.uid()::text = sender_id AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()::text));

CREATE POLICY "view_conversations" ON conversations FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversations.id AND user_id = auth.uid()::text));

CREATE POLICY "view_transactions" ON budget_transactions FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM user_budgets WHERE id = budget_transactions.budget_id AND user_id = auth.uid()::text));

CREATE POLICY "insert_transactions" ON budget_transactions FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_budgets WHERE id = budget_transactions.budget_id AND user_id = auth.uid()::text));

-- Generalized policies for other tables
CREATE POLICY "Allow individual read" ON daily_progress FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON daily_progress FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual update" ON daily_progress FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "Allow individual read" ON user_budgets FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON user_budgets FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Allow individual update" ON user_budgets FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "Allow individual read" ON food_analysis_history FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON food_analysis_history FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Allow individual read" ON progress_measurements FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON progress_measurements FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Allow individual read" ON notifications FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual update" ON notifications FOR UPDATE TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "Allow individual read" ON user_spiritual_history FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON user_spiritual_history FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Allow individual read" ON user_recipe_interactions FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Allow individual insert" ON user_recipe_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Anyone can view food items" ON food_items FOR SELECT USING (true);
CREATE POLICY "Anyone can view recipes" ON recipes FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
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

DROP TRIGGER IF EXISTS update_daily_progress_updated_at ON daily_progress;
CREATE TRIGGER update_daily_progress_updated_at BEFORE UPDATE ON daily_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
