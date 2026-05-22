import { supabase } from '../supabase'

export interface LocationData {
  country_code: string
  country_name: string
  city?: string
  currency?: string
  currency_symbol?: string
  timezone?: string
  languages?: string[]
  method?: 'EDGE' | 'BROWSER' | 'CACHE' | 'FALLBACK'
}

let pendingRequest: Promise<LocationData | null> | null = null;

export const detectLocation = async (forceRefresh = false): Promise<LocationData | null> => {
  // 1. Strict Caching (sessionStorage + localStorage for persistence across sessions)
  const CACHE_KEY = 'vicalary_location_v2';
  if (!forceRefresh) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache for 24 hours
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return { ...data, method: 'CACHE' };
      }
    }
  }

  if (pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    try {
      // Priority 1: Fallback IP API (ipapi.co)
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          const result: LocationData = {
            country_code: data.country_code?.toUpperCase() || 'US',
            country_name: data.country_name || 'United States',
            city: data.city || 'Unknown',
            timezone: data.timezone || 'UTC',
            method: 'EDGE'
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
          return result;
        }
      } catch (e) {}

      // Priority 3: Browser Geolocation (Most accurate for Jakarta)
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true });
          });
          
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
          if (res.ok) {
            const data = await res.json();
            const country_code = data.address?.country_code?.toUpperCase();
            if (country_code) {
               const result: LocationData = {
                  country_code: country_code,
                  country_name: data.address?.country || 'Indonesia',
                  city: data.address?.city || data.address?.town || data.address?.village || 'Jakarta',
                  method: 'BROWSER',
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
               };
               localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
               return result;
            }
          }
        } catch (err) {
          console.warn("[Location] Browser Geolocation failed:", err);
        }
      }

      // Final Fallback (US)
      return {
        country_code: 'US',
        country_name: 'United States',
        currency: 'USD',
        currency_symbol: '$',
        timezone: 'UTC',
        method: 'FALLBACK'
      };
    } finally {
      pendingRequest = null;
    }
  })();

  const result = await pendingRequest;
  if (result && typeof window !== 'undefined' && !result.languages) {
    result.languages = navigator.languages as string[];
  }
  return result;
}

export const getUserLocation = detectLocation;

export const getPrimaryLanguage = (languages?: string[] | string): string => {
  if (!languages) return 'en';
  if (Array.isArray(languages)) {
    if (languages.length === 0) return 'en';
    return languages[0].split('-')[0].toLowerCase();
  }
  return languages.split(',')[0].split('-')[0].toLowerCase();
};
