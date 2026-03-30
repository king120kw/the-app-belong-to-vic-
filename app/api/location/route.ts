import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const clientIp =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      '8.8.8.8'

    const { data: cachedGeo } = await supabase
      .from('ip_location_cache')
      .select('*')
      .eq('ip_address', clientIp)
      .single()

    let geoData: any

    if (cachedGeo && new Date(cachedGeo.expires_at) > new Date()) {
      geoData = cachedGeo
    } else {
      const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`)
      if (!geoRes.ok) throw new Error('Failed to fetch geo data')
      const data = await geoRes.json()

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
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      supabase
        .from('ip_location_cache')
        .upsert(geoData, { onConflict: 'ip_address' })
        .then()
    }

    const { data: currencyMap } = await supabase
      .from('country_currency_map')
      .select('*')
      .eq('country_code', geoData.country_code)
      .maybeSingle()

    return NextResponse.json({
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
          high: currencyMap?.budget_range_high_monthly || 800,
        },
      },
    })
  } catch (error: any) {
    console.error('[Geo] Error:', error)
    return NextResponse.json({
      ip: 'unknown',
      location: { country_code: 'US', country_name: 'United States', city: 'Unknown', timezone: 'UTC' },
      currency: { code: 'USD', symbol: '$' },
      regional_config: { cost_of_living_tier: 3, budget_hints: { low: 300, high: 800 } },
    })
  }
}
