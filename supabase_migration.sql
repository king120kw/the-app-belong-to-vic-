-- VicCalary Backend Database Schema
-- Complete migration for all app features

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  google_id TEXT UNIQUE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding Responses
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  goals TEXT[], -- e.g., ['weight_loss', 'muscle_gain', 'healthy_eating']
  dietary_restrictions TEXT[], -- e.g., ['vegetarian', 'gluten_free']
  allergies TEXT[],
  preferred_cuisines TEXT[],
  budget_preference TEXT, -- e.g., 'low', 'medium', 'high'
  activity_level TEXT, -- e.g., 'sedentary', 'moderate', 'active'
  daily_calorie_goal INTEGER,
  target_weight DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- FOOD & NUTRITION SYSTEM
-- ============================================================================

-- Food Items
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
  category TEXT, -- e.g., 'fruit', 'vegetable', 'protein', 'grain'
  health_rating INTEGER CHECK (health_rating BETWEEN 1 AND 10),
  barcode TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  serving_size TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Food Analysis History
CREATE TABLE IF NOT EXISTS food_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES food_items(id),
  analysis_type TEXT, -- 'scan' or 'manual'
  image_url TEXT,
  calories_consumed INTEGER,
  price_paid DECIMAL(10,2),
  notes TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  meal_type TEXT -- 'breakfast', 'lunch', 'dinner', 'snack'
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL, -- Consistent image across app
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  servings INTEGER,
  difficulty TEXT, -- 'easy', 'medium', 'hard'
  cuisine_type TEXT,
  total_calories INTEGER,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fat DECIMAL(6,2),
  ingredients JSONB, -- Array of {name, amount, unit}
  instructions TEXT[],
  tags TEXT[], -- for filtering and matching preferences
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Recipe Interactions
CREATE TABLE IF NOT EXISTS user_recipe_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'viewed', 'favorited', 'cooked', 'rated'
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  interacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, recipe_id, interaction_type, interacted_at)
);

-- ============================================================================
-- BUDGET & FINANCE TRACKING
-- ============================================================================

-- User Budgets
CREATE TABLE IF NOT EXISTS user_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_budget DECIMAL(10,2) NOT NULL,
  remaining_budget DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start, is_active)
);

-- Budget Transactions
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

-- Progress Measurements (weight/height every 7 days)
CREATE TABLE IF NOT EXISTS progress_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) NOT NULL, -- kg
  height DECIMAL(5,2), -- cm
  measurement_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, measurement_date)
);

-- Daily Progress
CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
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

-- Chat Users (separate phone authentication)
CREATE TABLE IF NOT EXISTS chat_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  country_code TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(phone_number)
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type TEXT NOT NULL, -- 'private' or 'group'
  name TEXT, -- For group chats
  avatar_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation Participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- 'text', 'voice', 'video', 'image', 'file', 'link'
  content TEXT, -- Text content or file URL
  metadata JSONB, -- Duration for voice, file size, etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call History
CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES user_profiles(id),
  call_type TEXT NOT NULL, -- 'voice' or 'video'
  duration INTEGER, -- seconds
  status TEXT, -- 'completed', 'missed', 'declined'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'alert', 'update', 'verse', 'hadith', 'reminder'
  title TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SETTINGS
-- ============================================================================

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light', -- 'light' or 'dark'
  push_notifications_enabled BOOLEAN DEFAULT TRUE,
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'USD',
  timezone TEXT,
  subscription_status TEXT DEFAULT 'free', -- 'free', 'premium'
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_food_analysis_user_date ON food_analysis_history(user_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, progress_date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_interactions_user ON user_recipe_interactions(user_id, interacted_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
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

-- User Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Onboarding: Users can manage their own onboarding
CREATE POLICY "Users can view own onboarding" ON onboarding_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding" ON onboarding_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding" ON onboarding_responses FOR UPDATE USING (auth.uid() = user_id);

-- Food Analysis: Users can view/insert their own analysis
CREATE POLICY "Users can view own food analysis" ON food_analysis_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food analysis" ON food_analysis_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recipe Interactions: Users can manage their own interactions
CREATE POLICY "Users can view own recipe interactions" ON user_recipe_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recipe interactions" ON user_recipe_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Budgets: Users can manage their own budgets
CREATE POLICY "Users can view own budgets" ON user_budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON user_budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON user_budgets FOR UPDATE USING (auth.uid() = user_id);

-- Progress: Users can manage their own progress
CREATE POLICY "Users can view own progress" ON progress_measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON progress_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own daily progress" ON daily_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily progress" ON daily_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily progress" ON daily_progress FOR UPDATE USING (auth.uid() = user_id);

-- Chat: Users can view conversations they're part of
CREATE POLICY "Users can view own chat profile" ON chat_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat profile" ON chat_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat profile" ON chat_users FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view conversations they're in" ON conversation_participants 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their conversations" ON messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages" ON messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Settings: Users can manage their own settings
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Public read for food items and recipes (all users can browse)
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view food items" ON food_items FOR SELECT USING (true);
CREATE POLICY "Anyone can view recipes" ON recipes FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_updated_at BEFORE UPDATE ON onboarding_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_progress_updated_at BEFORE UPDATE ON daily_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create default settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert some sample recipes
INSERT INTO recipes (name, description, image_url, prep_time, cook_time, servings, difficulty, cuisine_type, total_calories, protein, carbs, fat, ingredients, instructions, tags)
VALUES 
  ('Grilled Chicken Salad', 'Healthy and delicious grilled chicken with fresh greens', '/grilled-chicken.jpg', 15, 20, 2, 'easy', 'Mediterranean', 350, 35, 15, 12, 
   '[{"name": "Chicken breast", "amount": "200", "unit": "g"}, {"name": "Mixed greens", "amount": "100", "unit": "g"}, {"name": "Cherry tomatoes", "amount": "50", "unit": "g"}]'::jsonb,
   ARRAY['Grill chicken until cooked through', 'Chop vegetables', 'Combine and serve'],
   ARRAY['healthy', 'protein', 'low-carb', 'mediterranean']),
   
  ('Avocado Toast', 'Simple and nutritious breakfast option', '/avocado-toast.jpg', 5, 5, 1, 'easy', 'American', 280, 8, 25, 18,
   '[{"name": "Whole wheat bread", "amount": "2", "unit": "slices"}, {"name": "Avocado", "amount": "1", "unit": "whole"}, {"name": "Lemon juice", "amount": "1", "unit": "tsp"}]'::jsonb,
   ARRAY['Toast bread', 'Mash avocado with lemon juice', 'Spread on toast'],
   ARRAY['breakfast', 'vegetarian', 'quick', 'healthy']);
