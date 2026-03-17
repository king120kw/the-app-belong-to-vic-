-- Ensure companies table exists with necessary columns
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    invest_israel BOOLEAN DEFAULT FALSE,
    invest_uae BOOLEAN DEFAULT FALSE,
    political_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure products table exists with branding linkage
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand_id UUID REFERENCES public.companies(id),
    manufacturer TEXT,
    nutritional_data JSONB DEFAULT '{}'::jsonb,
    country_of_origin TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure IP location cache exists
CREATE TABLE IF NOT EXISTS public.ip_location_cache (
    ip_address TEXT PRIMARY KEY,
    country_code TEXT,
    country_name TEXT,
    city TEXT,
    region TEXT,
    currency_code TEXT,
    currency_symbol TEXT,
    timezone TEXT,
    latitude FLOAT,
    longitude FLOAT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate core brands with political data
INSERT INTO public.companies (name, invest_israel, invest_uae, political_reason)
VALUES 
    ('Nestlé', TRUE, FALSE, 'Nestlé operates factories in illegal Israeli settlements (Beit El)'),
    ('Coca-Cola', TRUE, FALSE, 'Coca-Cola operates bottling plants in Israel'),
    ('PepsiCo', TRUE, FALSE, 'PepsiCo acquired SodaStream, an Israeli company operating in occupied territories'),
    ('SodaStream', TRUE, FALSE, 'SodaStream manufactures in Israeli-occupied West Bank'),
    ('Strauss Group', TRUE, FALSE, 'Strauss Group directly funds Israeli military units'),
    ('McDonald''s', TRUE, FALSE, 'McDonald''s Israel provides free meals to Israeli army'),
    ('Starbucks', TRUE, FALSE, ' Howard Schultz (former CEO) is a known pro-Israel donor'),
    ('HP', TRUE, FALSE, 'Hewlett-Packard provides technology used in Israeli military checkpoints'),
    ('Intel', TRUE, FALSE, 'Intel has major manufacturing facilities in Israel'),
    ('Siemens', TRUE, FALSE, 'Siemens has contracts with Israeli infrastructure projects'),
    ('Volvo', TRUE, FALSE, 'Volvo equipment used in demolishing Palestinian homes'),
    ('Caterpillar', TRUE, FALSE, 'Caterpillar bulldozers used in demolishing Palestinian homes'),
    ('Disney', TRUE, FALSE, 'Disney supports pro-Israel lobbying organizations'),
    ('Google', TRUE, FALSE, 'Project Nimbus: Google provides cloud services to Israeli military'),
    ('Amazon', TRUE, FALSE, 'Project Nimbus: Amazon provides cloud services to Israeli military'),
    ('Microsoft', TRUE, FALSE, 'Microsoft Azure provides services to Israeli defense ministry'),
    ('Teva', TRUE, FALSE, 'Teva Pharmaceuticals is an Israeli multinational pharmaceutical company')
ON CONFLICT (name) DO UPDATE SET
    invest_israel = EXCLUDED.invest_israel,
    invest_uae = EXCLUDED.invest_uae,
    political_reason = EXCLUDED.political_reason;
