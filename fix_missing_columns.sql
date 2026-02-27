-- Run this in your Supabase SQL Editor to fix the missing column error

ALTER TABLE onboarding_responses 
ADD COLUMN IF NOT EXISTS calorie_flexibility TEXT;

-- Verify other potentially missing columns just in case
ALTER TABLE onboarding_responses 
ADD COLUMN IF NOT EXISTS dietary_lifestyle TEXT[];

ALTER TABLE onboarding_responses 
ADD COLUMN IF NOT EXISTS meal_prep_time TEXT;

ALTER TABLE onboarding_responses 
ADD COLUMN IF NOT EXISTS cooking_skill TEXT;

-- Force a schema cache reload (optional, but good practice)
NOTIFY pgrst, 'reload config';
