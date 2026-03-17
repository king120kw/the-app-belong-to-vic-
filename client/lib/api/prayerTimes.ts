import { LocationData, detectLocation } from './location';
import { getTranslation } from './translation';
import { supabase } from '../supabase';

export interface PrayerTimes {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Sunset: string;
    Maghrib: string;
    Isha: string;
    Imsak: string;
    Midnight: string;
}

export const getPrayerTimes = async (location?: LocationData): Promise<PrayerTimes | null> => {
    try {
        const loc = location || await detectLocation();
        const date = new Date().toISOString().split('T')[0];

        // Aladhan API for prayer times
        // Sanitize the address to remove any "(Fallback)" or other non-location text that might break the API
        const sanitizedAddress = loc.country.replace(/\s*\(.*?\)/g, '').trim();
        const url = `https://api.aladhan.com/v1/timingsByAddress/${date}?address=${encodeURIComponent(sanitizedAddress)}&timezone=${encodeURIComponent(loc.timezone)}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Aladhan API failed with status ${response.status} for address: ${sanitizedAddress}`);
            return null;
        }
        const data = await response.json();

        if (data.code === 200) {
            return data.data.timings;
        }
        return null;
    } catch (error) {
        console.error("Failed to fetch prayer times:", error);
        return null;
    }
};

export const getPersonalizedSpiritualReminder = async (userId: string): Promise<{ type: 'quran' | 'hadith', content: string, reference: string, verifyUrl?: string } | null> => {
    try {
        const prayerTimes = await getPrayerTimes();
        const isInPrayerWindow = prayerTimes ? isPrayerTime(prayerTimes) : false;

        // 1. Try Database First
        const { data: onboardingRows } = await (supabase
            .from('onboarding_responses') as any)
            .select('goal')
            .eq('user_id', userId)
            .limit(1);

        const onboarding = onboardingRows && onboardingRows.length > 0 ? onboardingRows[0] : null;
        const goal = onboarding?.goal || 'General';

        // Filter by type based on prayer window
        const typeFilter = isInPrayerWindow ? 'quran' : 'hadith';

        const { data: candidates } = await (supabase
            .from('spiritual_content') as any)
            .select('*')
            .eq('type', typeFilter)
            .or(`category.eq."${goal}",category.eq.General`)
            .limit(5);

        if (candidates && candidates.length > 0) {
            const selected = candidates[Math.floor(Math.random() * candidates.length)] as any;
            return {
                type: selected.type as 'quran' | 'hadith',
                content: selected.content,
                reference: selected.reference,
                verifyUrl: selected.verify_url
            };
        }

        // 2. Fallback to Public APIs if DB is empty
        if (isInPrayerWindow) {
            const randomAyah = Math.floor(Math.random() * 6236) + 1;
            const res = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/en.asad`);
            const data = await res.json();
            return {
                type: 'quran',
                content: data.data.text,
                reference: `Quran ${data.data.surah.numberOfSurah}:${data.data.numberInSurah}`
            };
        } else {
            const res = await fetch('https://random-hadith-generator.vercel.app/bukhari');
            const data = await res.json();
            return {
                type: 'hadith',
                content: data.data.hadith_english,
                reference: `Sahih Bukhari, Hadith ${data.data.hadith_number}`,
                verifyUrl: `https://sunnah.com/bukhari:${data.data.hadith_number}`
            };
        }
    } catch (error) {
        console.error("Spiritual reminder error:", error);
        // Ultimate fallback
        return {
            type: 'hadith',
            content: "The best among you are those who have the best manners and character.",
            reference: "Sahih Bukhari",
            verifyUrl: "https://sunnah.com/bukhari"
        };
    }
};

export const isPrayerTime = (prayerTimes: PrayerTimes): boolean => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const timeToMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const timings = Object.entries(prayerTimes).map(([name, time]) => ({
        name,
        minutes: timeToMinutes(time)
    }));

    // Check if within 10 minutes window for any prayer (strictly limited as requested)
    return timings.some(t => {
        const diff = Math.abs(t.minutes - currentTime);
        return diff <= 10; // 10 mins before or after
    });
};
