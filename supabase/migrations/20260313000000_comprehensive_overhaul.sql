-- ============================================================================
-- COMPREHENSIVE SYSTEM OVERHAUL: MEDICATIONS, LOCALIZATION & INTEGRATION
-- ============================================================================

-- 1. Medications Table (FDA NDC Verified)
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ndc_code TEXT UNIQUE,
    proprietary_name TEXT,
    generic_name TEXT,
    active_ingredients JSONB,
    dosage_form TEXT,
    strength TEXT,
    manufacturer TEXT,
    indications TEXT,
    warnings TEXT,
    contraindications TEXT,
    adverse_reactions TEXT,
    dosage_guidelines TEXT,
    safety_assessment JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Regional Configuration Table (Localization & Budget Tiers)
CREATE TABLE IF NOT EXISTS public.regional_configuration (
    country_code VARCHAR(10) PRIMARY KEY,
    country_name TEXT NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    currency_symbol VARCHAR(10) NOT NULL,
    decimal_separator CHAR(1) DEFAULT '.',
    thousands_separator CHAR(1) DEFAULT ',',
    cost_of_living_index DECIMAL(5,2),
    budget_tiers JSONB, -- Example: [{"label": "Economy", "monthly": 500}, {"label": "Balanced", "monthly": 1500}]
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update User Profiles for Persistent Location
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='location_metadata') THEN
        ALTER TABLE user_profiles ADD COLUMN location_metadata JSONB;
    END IF;
END $$;

-- 4. Update Food Analysis History for Unified Linking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='food_analysis_history' AND column_name='medication_id') THEN
        ALTER TABLE food_analysis_history ADD COLUMN medication_id UUID REFERENCES medications(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='food_analysis_history' AND column_name='product_id') THEN
        ALTER TABLE food_analysis_history ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Update Messages for Contextual Sharing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='pending_analysis_id') THEN
        ALTER TABLE messages ADD COLUMN pending_analysis_id UUID REFERENCES food_analysis_history(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Seed Basic Regional Configurations
INSERT INTO public.regional_configuration (country_code, country_name, currency_code, currency_symbol, decimal_separator, thousands_separator, budget_tiers) VALUES
('US', 'United States', 'USD', '$', '.', ',', '[{"label": "Saver", "amount": 400}, {"label": "Balanced", "amount": 800}, {"label": "Premium", "amount": 1500}]'),
('ID', 'Indonesia', 'IDR', 'Rp', ',', '.', '[{"label": "Ekonomi", "amount": 2000000}, {"label": "Standar", "amount": 5000000}, {"label": "Eksklusif", "amount": 12000000}]'),
('GB', 'United Kingdom', 'GBP', '£', '.', ',', '[{"label": "Basic", "amount": 300}, {"label": "Standard", "amount": 600}, {"label": "Luxury", "amount": 1200}]')
ON CONFLICT (country_code) DO NOTHING;

-- 7. Enable RLS
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_configuration ENABLE ROW LEVEL SECURITY;

-- 8. Policies
DROP POLICY IF EXISTS "Public medication read access" ON medications;
CREATE POLICY "Public medication read access" ON medications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public regional config read access" ON regional_configuration;
CREATE POLICY "Public regional config read access" ON regional_configuration FOR SELECT USING (true);

-- Trigger for medications updated_at
DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
