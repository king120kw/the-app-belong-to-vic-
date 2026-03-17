-- Create the country_currency_map table for localizing budgets and pricing
CREATE TABLE IF NOT EXISTS public.country_currency_map (
    country_code TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    currency_symbol TEXT NOT NULL,
    cost_of_living_tier INTEGER NOT NULL DEFAULT 1, -- 1=Low, 2=Medium, 3=High
    budget_range_low_monthly INTEGER NOT NULL,
    budget_range_high_monthly INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.country_currency_map ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users
CREATE POLICY "Allow public read access to country_currency_map"
    ON public.country_currency_map FOR SELECT
    USING (true);

-- Insert common mappings
INSERT INTO public.country_currency_map (country_code, country_name, currency_code, currency_symbol, cost_of_living_tier, budget_range_low_monthly, budget_range_high_monthly)
VALUES 
    ('US', 'United States', 'USD', '$', 3, 300, 800),
    ('GB', 'United Kingdom', 'GBP', '£', 3, 200, 600),
    ('DE', 'Germany', 'EUR', '€', 3, 200, 500),
    ('FR', 'France', 'EUR', '€', 3, 200, 500),
    ('IT', 'Italy', 'EUR', '€', 2, 180, 450),
    ('ES', 'Spain', 'EUR', '€', 2, 150, 400),
    ('AU', 'Australia', 'AUD', '$', 3, 400, 1000),
    ('CA', 'Canada', 'CAD', '$', 3, 350, 900),
    ('JP', 'Japan', 'JPY', '¥', 3, 30000, 80000),
    ('IN', 'India', 'INR', '₹', 1, 3000, 15000),
    ('ID', 'Indonesia', 'IDR', 'Rp', 1, 1000000, 4000000),
    ('BR', 'Brazil', 'BRL', 'R$', 1, 500, 1500),
    ('MX', 'Mexico', 'MXN', '$', 1, 2000, 6000),
    ('ZA', 'South Africa', 'ZAR', 'R', 1, 1500, 5000),
    ('NG', 'Nigeria', 'NGN', '₦', 1, 20000, 100000),
    ('AE', 'United Arab Emirates', 'AED', 'د.إ', 3, 1000, 3000),
    ('SA', 'Saudi Arabia', 'SAR', '﷼', 3, 1000, 3000)
ON CONFLICT (country_code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    cost_of_living_tier = EXCLUDED.cost_of_living_tier,
    budget_range_low_monthly = EXCLUDED.budget_range_low_monthly,
    budget_range_high_monthly = EXCLUDED.budget_range_high_monthly;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_country_currency_map_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_country_currency_map_modtime
    BEFORE UPDATE ON public.country_currency_map
    FOR EACH ROW
    EXECUTE FUNCTION update_country_currency_map_modtime();
