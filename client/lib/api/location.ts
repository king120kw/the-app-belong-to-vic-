import { supabase } from '../supabase'

export interface GeoLocationData {
    ip: string;
    location: {
        country_code: string;
        country_name: string;
        city: string;
        region: string;
        timezone: string;
    };
    currency: {
        code: string;
        symbol: string;
    };
    regional_config: {
        cost_of_living_tier: number;
        budget_hints: {
            low: number;
            high: number;
        };
    };
}

export interface LocationData {
    country: string;
    country_code: string;
    city: string;
    currency: string;
    currency_symbol: string;
    timezone: string;
    language: string;
}

let cachedGeoData: GeoLocationData | null = null;
let fetchPromise: Promise<GeoLocationData> | null = null;

export const getUserLocation = async (): Promise<GeoLocationData> => {
    // Return memory cache if present
    if (cachedGeoData) return cachedGeoData;

    // Check localStorage
    try {
        const localCache = localStorage.getItem('geo_location_data');
        if (localCache) {
            const parsed = JSON.parse(localCache);
            cachedGeoData = parsed;
            return parsed;
        }
    } catch (e) {
        console.warn('Failed to parse geo location from local storage');
    }

    // Prevent duplicate concurrent requests
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
        try {
            console.log('[Location API] Fetching user location from edge function...');
            const { data, error } = await supabase.functions.invoke('detectUserLocation');

            if (error) throw error;

            cachedGeoData = data;

            try {
                localStorage.setItem('geo_location_data', JSON.stringify(data));
            } catch (e) { }

            return data as GeoLocationData;
        } catch (error) {
            console.error('[Location API] Error detecting location:', error);

            // Fallback
            const fallback: GeoLocationData = {
                ip: 'unknown',
                location: { country_code: 'US', country_name: 'United States', city: 'Unknown', region: 'Unknown', timezone: 'UTC' },
                currency: { code: 'USD', symbol: '$' },
                regional_config: { cost_of_living_tier: 3, budget_hints: { low: 300, high: 800 } }
            };
            return fallback;
        } finally {
            fetchPromise = null;
        }
    })();

    return fetchPromise;
};

export const detectLocation = async (): Promise<LocationData> => {
    const data = await getUserLocation();
    return {
        country: data.location.country_name,
        country_code: data.location.country_code,
        city: data.location.city,
        currency: data.currency.code,
        currency_symbol: data.currency.symbol,
        timezone: data.location.timezone,
        language: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'EG', 'JO', 'LB'].includes(data.location.country_code) ? 'ar' : 'en'
    };
};
