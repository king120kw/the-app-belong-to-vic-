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
        if (!loc) return null;
        const date = new Date().toISOString().split('T')[0];

        // Aladhan API for prayer times - using timingsByCity for faster lookups
        const url = `https://api.aladhan.com/v1/timingsByCity/${date}?city=${encodeURIComponent(loc.city || 'Semarang')}&country=${encodeURIComponent(loc.country_name || 'Indonesia')}&method=2`;

        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error("API failure");
        const data = await response.json();
        return data.code === 200 ? data.data.timings : null;
    } catch (error) {
        console.warn("[PrayerTimes] Fetch failed, using fallback:", error);
        // Fallback to static times for Semarang if API fails (as requested for regional accuracy)
        return {
            Fajr: "04:30", Sunrise: "05:45", Dhuhr: "11:45", Asr: "15:00",
            Maghrib: "17:45", Isha: "18:55", Imsak: "04:20", Midnight: "23:45", Sunset: "17:45"
        } as PrayerTimes;
    }
};

export const getPersonalizedSpiritualReminder = async (userId: string): Promise<{ 
    type: 'quran' | 'hadith', 
    content: string, 
    content_ar?: string,
    reference: string, 
    verifyUrl?: string 
} | null> => {
    try {
        const prayerTimes = await getPrayerTimes();
        const isInPrayerWindow = prayerTimes ? isPrayerTime(prayerTimes) : false;

        // Determine type based on prayer window
        const typeFilter = isInPrayerWindow ? 'quran' : 'hadith';

        // 1. Try public APIs for dual-language content
        if (isInPrayerWindow) {
            const randomAyah = Math.floor(Math.random() * 6236) + 1;
            // Fetch English (Asad) and Arabic
            const [resEn, resAr] = await Promise.all([
                fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/en.asad`),
                fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/ar.alafasy`)
            ]);
            const dataEn = await resEn.json();
            const dataAr = await resAr.json();

            return {
                type: 'quran',
                content: dataEn.data.text,
                content_ar: dataAr.data.text,
                reference: `Quran ${dataEn.data.surah.numberOfSurah}:${dataEn.data.numberInSurah}`
            };
        } else {
            // Public Hadith APIs are often English-only. 
            // We'll try to find a source with Arabic or use a fallback.
            const res = await fetch('https://random-hadith-generator.vercel.app/bukhari');
            const data = await res.json();
            return {
                type: 'hadith',
                content: data.data.hadith_english,
                content_ar: data.data.hadith_arabic || "", // Some APIs provide this
                reference: `Sahih Bukhari, Hadith ${data.data.hadith_number}`,
                verifyUrl: `https://sunnah.com/bukhari:${data.data.hadith_number}`
            };
        }
    } catch (error) {
        console.error("Spiritual reminder error:", error);
        return {
            type: 'hadith',
            content: "The best among you are those who have the best manners and character.",
            content_ar: "خياركم أحسنكم أخلاقا",
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
