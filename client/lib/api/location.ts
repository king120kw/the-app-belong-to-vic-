export interface LocationData {
    country: string;
    countryCode: string;
    currency: string;
    currencySymbol: string;
    language: string;
    timezone: string;
}

const fetchIpapi = async () => {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) return null;
        const data = await response.json();
        if (data.error) return null;

        const languages = data.languages ? data.languages.split(',') : ['en'];
        const firstLangCode = languages[0].split('-')[0].toLowerCase();

        return {
            country: data.country_name,
            countryCode: data.country_code,
            currency: data.currency,
            timezone: data.timezone,
            language: firstLangCode
        };
    } catch (e) {
        return null;
    }
};

const fetchIpWhois = async () => {
    try {
        const response = await fetch('https://ipwhois.app/json/');
        if (!response.ok) return null;
        const data = await response.json();
        if (!data.success) return null;

        return {
            country: data.country,
            countryCode: data.country_code,
            currency: data.currency,
            timezone: data.timezone,
            language: 'en'
        };
    } catch (e) {
        return null;
    }
};

export const detectLocation = async (): Promise<LocationData> => {
    // 1. Try to get from sessionStorage
    const cached = sessionStorage.getItem('last_detected_location');
    const cachedTime = sessionStorage.getItem('last_detected_time');

    if (cached && cachedTime && (Date.now() - parseInt(cachedTime)) < 3600000) {
        return JSON.parse(cached);
    }

    // 2. Try browser geolocation as a secondary source if needed (optional, but for now let's stick to IP)

    // 3. Try IP services
    let rawData = await fetchIpapi();
    if (!rawData) {
        rawData = await fetchIpWhois();
    }

    const supported = ['en', 'fr', 'de', 'id', 'hi', 'ms', 'nl', 'es', 'it', 'ja', 'ko', 'zh'];

    if (rawData) {
        const finalLang = supported.includes(rawData.language) ? rawData.language : 'en';
        const result: LocationData = {
            country: rawData.country,
            countryCode: rawData.countryCode,
            currency: rawData.currency || 'USD',
            currencySymbol: '$',
            language: finalLang,
            timezone: rawData.timezone || 'UTC'
        };
        sessionStorage.setItem('last_detected_location', JSON.stringify(result));
        sessionStorage.setItem('last_detected_time', Date.now().toString());
        return result;
    }

    // 4. Ultimate Fallback
    const fallback: LocationData = {
        country: 'United States',
        countryCode: 'US',
        currency: 'USD',
        currencySymbol: '$',
        language: 'en',
        timezone: 'UTC'
    };

    return fallback;
};
