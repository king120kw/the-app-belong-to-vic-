CREATE TABLE IF NOT EXISTS public.ip_location_cache (
    ip_address TEXT PRIMARY KEY,
    country_code VARCHAR(10),
    country_name TEXT,
    city TEXT,
    currency_code VARCHAR(10),
    currency_symbol VARCHAR(10),
    timezone TEXT,
    languages TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ip_location_cache ENABLE ROW LEVEL SECURITY;

-- Allow the service_role (Edge Functions) to do everything
DROP POLICY IF EXISTS "Service role can manage IP cache" ON public.ip_location_cache;
CREATE POLICY "Service role can manage IP cache"
    ON public.ip_location_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Optional: Allow users to read their own IP info
DROP POLICY IF EXISTS "Users can read IP cache" ON public.ip_location_cache;
CREATE POLICY "Users can read IP cache"
    ON public.ip_location_cache
    FOR SELECT
    USING (true);
