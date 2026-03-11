import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { 
            status: 200,
            headers: corsHeaders 
        });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
            throw new Error("Missing server configuration");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '8.8.8.8';
        console.log(`Processing geolocation for IP: ${clientIp}`);
        
        // 1. Check cache
        try {
            const { data: cachedGeo, error: cacheError } = await supabase
                .from('ip_location_cache')
                .select('*')
                .eq('ip_address', clientIp)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            if (cacheError) {
                console.error("Cache fetch error:", cacheError);
            } else if (cachedGeo) {
                console.log("Serving from cache for IP:", clientIp);
                return new Response(JSON.stringify(cachedGeo), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        } catch (cacheExc) {
            console.error("Cache exception:", cacheExc);
        }

        // 2. Fetch from external API
        console.log("Fetching from external API for IP:", clientIp);
        const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
        if (!geoRes.ok) {
            console.warn(`External Geo API failed (${geoRes.status}). Using fallback.`);
            const defaultGeo = {
                ip_address: clientIp,
                country_code: "US",
                country_name: "United States",
                currency_code: "USD",
                currency_symbol: "$",
                timezone: "UTC",
                expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
            };
            return new Response(JSON.stringify(defaultGeo), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const geoData = await geoRes.json();
        if (geoData.error) {
            console.error("External API returned error object:", geoData);
            // Return a default object if the API is rate limited
            const defaultGeo = {
                ip_address: clientIp,
                country_code: "US",
                country_name: "United States",
                currency_code: "USD",
                currency_symbol: "$",
                timezone: "UTC",
                expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // Cache for 1 hour
            };
            return new Response(JSON.stringify(defaultGeo), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        
        const geoInfo = {
            ip_address: clientIp,
            country_code: geoData.country_code || "US",
            country_name: geoData.country_name || "United States",
            currency_code: geoData.currency || "USD",
            currency_symbol: geoData.currency_symbol || "$",
            timezone: geoData.timezone || "UTC",
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        // 3. Cache the result
        const { error: upsertError } = await supabase.from('ip_location_cache').upsert(geoInfo);
        if (upsertError) {
            console.error("Cache upsert error:", upsertError);
        }

        return new Response(JSON.stringify(geoInfo), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Geolocation function FATAL error:", error);
        return new Response(JSON.stringify({ 
            error: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
