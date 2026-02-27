-- 1. Create Storage Bucket for Avatars if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for avatars
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "User Upload" ON storage.objects;
    DROP POLICY IF EXISTS "User Update" ON storage.objects;
    DROP POLICY IF EXISTS "User Delete" ON storage.objects;
END $$;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
CREATE POLICY "User Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "User Update" ON storage.objects FOR UPDATE USING (bucket_id = 'user-avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "User Delete" ON storage.objects FOR DELETE USING (bucket_id = 'user-avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 2. Align Database Schema with Code
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT '$';

ALTER TABLE food_analysis_history 
ADD COLUMN IF NOT EXISTS analysis JSONB,
ADD COLUMN IF NOT EXISTS total_calories INTEGER;

-- Handle case where columns might already be renamed or exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_measurements' AND column_name = 'weight') THEN
        ALTER TABLE progress_measurements RENAME COLUMN weight TO weight_kg;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_measurements' AND column_name = 'height') THEN
        ALTER TABLE progress_measurements RENAME COLUMN height TO height_cm;
    END IF;
END $$;

-- Fix food_items to link back to analysis if needed
ALTER TABLE food_items 
ADD COLUMN IF NOT EXISTS analysis_id UUID;

-- 3. Ensure Meals Table exists and has seed data
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  calories INTEGER,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fat DECIMAL(6,2),
  meal_type TEXT,
  cuisine_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
