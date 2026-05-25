import { supabase } from '../supabase'

export interface LocationData {
  country_code: string
  country_name: string
  city?: string
  currency?: string
  currency_symbol?: string
  timezone?: string
  languages?: string[]
  flag?: string
  method?: 'EDGE' | 'BROWSER' | 'CACHE' | 'FALLBACK'
}

let pendingRequest: Promise<LocationData | null> | null = null;

const countryToLangMap: Record<string, string[]> = {
  'ID': ['id', 'en'], 'US': ['en'], 'GB': ['en'], 'FR': ['fr', 'en'],
  'DE': ['de', 'en'], 'ES': ['es', 'en'], 'SA': ['ar', 'en'],
  'AE': ['ar', 'en'], 'IN': ['hi', 'en'], 'BD': ['bn', 'en'],
  'PK': ['ur', 'en'], 'CN': ['zh', 'en'], 'RU': ['ru', 'en'],
  'BR': ['pt', 'en'], 'VN': ['vi', 'en'], 'TR': ['tr', 'en']
};

const countryToCurrencyMap: Record<string, { code: string, symbol: string }> = {
  'ID': { code: 'IDR', symbol: 'Rp' }, 'US': { code: 'USD', symbol: '$' },
  'GB': { code: 'GBP', symbol: '£' }, 'FR': { code: 'EUR', symbol: '€' },
  'DE': { code: 'EUR', symbol: '€' }, 'ES': { code: 'EUR', symbol: '€' },
  'SA': { code: 'SAR', symbol: 'SR' }, 'AE': { code: 'AED', symbol: 'DH' },
  'IN': { code: 'INR', symbol: '₹' }, 'BD': { code: 'BDT', symbol: '৳' },
  'PK': { code: 'PKR', symbol: 'Rs' }, 'CN': { code: 'CNY', symbol: '¥' },
  'RU': { code: 'RUB', symbol: '₽' }, 'BR': { code: 'BRL', symbol: 'R$' },
  'VN': { code: 'VND', symbol: '₫' }, 'TR': { code: 'TRY', symbol: '₺' },
  'KE': { code: 'KES', symbol: 'KSh' }, 'SO': { code: 'SOS', symbol: 'Sh' }
};

export const detectLocation = async (forceRefresh = false): Promise<LocationData | null> => {
  const CACHE_KEY = 'vicalary_location_v3';
  if (!forceRefresh && typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return { ...data, method: 'CACHE' };
      }
    }
  }

  if (pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    try {
      // Primary: ipwho.is
      try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const countryCode = data.country_code || 'US';
            const currencyInfo = countryToCurrencyMap[countryCode] || { code: 'USD', symbol: '$' };
            const langInfo = countryToLangMap[countryCode] || ['en'];

            const result: LocationData = {
              country_code: countryCode,
              country_name: data.country || 'United States',
              city: data.city || 'Unknown',
              timezone: data.timezone?.id || 'UTC',
              flag: data.flag?.img || '',
              currency: data.currency?.code || currencyInfo.code,
              currency_symbol: data.currency?.symbol || currencyInfo.symbol,
              languages: langInfo,
              method: 'EDGE'
            };
            
            if (typeof window !== 'undefined') {
               localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
            }
            return result;
          }
        }
      } catch (e) {
        console.warn("[Location] ipwho.is failed:", e);
      }

      // Secondary: ipapi.co
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          const countryCode = data.country_code || 'US';
          const currencyInfo = countryToCurrencyMap[countryCode] || { code: 'USD', symbol: '$' };
          const langInfo = countryToLangMap[countryCode] || ['en'];

          const result: LocationData = {
            country_code: countryCode,
            country_name: data.country_name || 'United States',
            city: data.city || 'Unknown',
            timezone: data.timezone || 'UTC',
            flag: `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`,
            currency: data.currency || currencyInfo.code,
            currency_symbol: currencyInfo.symbol,
            languages: data.languages ? data.languages.split(',') : langInfo,
            method: 'EDGE'
          };
          
          if (typeof window !== 'undefined') {
             localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
          }
          return result;
        }
      } catch (e) {
        console.warn("[Location] ipapi.co failed:", e);
      }

      // Fallback
      return {
        country_code: 'US',
        country_name: 'United States',
        currency: 'USD',
        currency_symbol: '$',
        timezone: 'UTC',
        languages: ['en'],
        method: 'FALLBACK'
      };
    } finally {
      pendingRequest = null;
    }
  })();

  const result = await pendingRequest;
  if (result && typeof window !== 'undefined' && (!result.languages || result.languages.length === 0)) {
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
