import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Extract IP
    const clientIp = (
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      '8.8.8.8' // Fallback to a known IP for local dev testing
    );

    console.log(`[Geo] Incoming request from IP: ${clientIp}`);

    // 2. Check Database Cache
    const { data: cachedGeo } = await supabase
      .from('ip_location_cache')
      .select('*')
      .eq('ip_address', clientIp)
      .single();

    let geoData;

    if (cachedGeo && new Date(cachedGeo.expires_at) > new Date()) {
      console.log(`[Geo] Cache hit for IP: ${clientIp}`);
      geoData = cachedGeo;
    } else {
      console.log(`[Geo] Cache miss. Fetching from ipapi.co for IP: ${clientIp}`);
      const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
      if (!geoRes.ok) throw new Error('Failed to fetch geo data');
      const data = await geoRes.json();

      geoData = {
        ip_address: clientIp,
        country_code: data.country_code || 'US',
        country_name: data.country_name || 'United States',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        currency_code: data.currency || 'USD',
        currency_name: data.currency_name || 'US Dollar',
        timezone: data.timezone || 'UTC',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Cache for 24 hours
      };

      // Save to IP cache
      const { error: upsertError } = await callUpsertGeo(supabase, geoData);
      if (upsertError) console.warn('[Geo] Failed to cache geo data:', upsertError.message);
    }

    // 3. Look up Currency and Budget Mapping
    const { data: currencyMap } = await supabase
      .from('country_currency_map')
      .select('*')
      .eq('country_code', geoData.country_code)
      .maybeSingle();

    // 4. Construct Final Response Payload
    const responsePayload = {
      ip: clientIp,
      location: {
        country_code: geoData.country_code,
        country_name: geoData.country_name,
        city: geoData.city,
        region: geoData.region,
        timezone: geoData.timezone,
      },
      currency: {
        code: currencyMap?.currency_code || geoData.currency_code || 'USD',
        symbol: currencyMap?.currency_symbol || '$',
      },
      regional_config: {
        cost_of_living_tier: currencyMap?.cost_of_living_tier || 3,
        budget_hints: {
          low: currencyMap?.budget_range_low_monthly || 300,
          high: currencyMap?.budget_range_high_monthly || 800
        }
      }
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[Geo] Error processing location:', error);

    // Fallback generic response to not break frontend
    return new Response(JSON.stringify({
      ip: 'unknown',
      location: { country_code: 'US', country_name: 'United States', city: 'Unknown', timezone: 'UTC' },
      currency: { code: 'USD', symbol: '$' },
      regional_config: { cost_of_living_tier: 3, budget_hints: { low: 300, high: 800 } }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});

// Helper for upsert to ignore failures gracefully
async function callUpsertGeo(supabase: any, data: any) {
  try {
    return await supabase.from('ip_location_cache').upsert(data, { onConflict: 'ip_address' });
  } catch (e) {
    return { error: e };
  }
}
