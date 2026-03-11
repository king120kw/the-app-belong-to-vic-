CREATE TABLE IF NOT EXISTS public.currency_lookup (
    country_code VARCHAR(10) PRIMARY KEY,
    country_name TEXT NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    currency_symbol VARCHAR(10) NOT NULL
);

-- Basic setup of major currencies
INSERT INTO public.currency_lookup (country_code, country_name, currency_code, currency_symbol) VALUES
('US', 'United States', 'USD', '$'),
('GB', 'United Kingdom', 'GBP', '£'),
('EU', 'European Union', 'EUR', '€'),
('JP', 'Japan', 'JPY', '¥'),
('CN', 'China', 'CNY', '¥'),
('IN', 'India', 'INR', '₹'),
('AU', 'Australia', 'AUD', 'A$'),
('CA', 'Canada', 'CAD', 'C$'),
('CH', 'Switzerland', 'CHF', 'CHF'),
('AE', 'United Arab Emirates', 'AED', 'د.إ'),
('SA', 'Saudi Arabia', 'SAR', 'ر.س'),
('MY', 'Malaysia', 'MYR', 'RM'),
('ID', 'Indonesia', 'IDR', 'Rp'),
('SG', 'Singapore', 'SGD', 'S$'),
('TH', 'Thailand', 'THB', '฿'),
('VN', 'Vietnam', 'VND', '₫'),
('TR', 'Turkey', 'TRY', '₺'),
('BR', 'Brazil', 'BRL', 'R$'),
('ZA', 'South Africa', 'ZAR', 'R'),
('KR', 'South Korea', 'KRW', '₩'),
('MX', 'Mexico', 'MXN', '$'),
('RU', 'Russia', 'RUB', '₽'),
('EG', 'Egypt', 'EGP', 'E£'),
('PH', 'Philippines', 'PHP', '₱')
ON CONFLICT (country_code) DO UPDATE 
SET 
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    country_name = EXCLUDED.country_name;

-- Standard policies
ALTER TABLE public.currency_lookup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.currency_lookup;
CREATE POLICY "Enable read access for all users"
    ON public.currency_lookup FOR SELECT
    USING (true);
