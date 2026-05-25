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
        const cacheKey = `prayer_times_${loc.city}_${date}`;
        
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(cacheKey);
            if (cached) return JSON.parse(cached);
        }

        // Ensure valid coordinates to prevent Aladhan API geocoding timeouts
        // Fallback to Jakarta coordinates if location doesn't have lat/lon
        const lat = loc.latitude || -6.2088;
        const lon = loc.longitude || 106.8456;

        // Aladhan API for prayer times - using precise coordinates avoids their slow internal geocoding which causes 504 Timeouts
        const timestamp = Math.floor(Date.now() / 1000);
        const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lon}&method=2`;

        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error("API failure");
        const data = await response.json();
        
        if (data.code === 200) {
            if (typeof window !== 'undefined') {
                localStorage.setItem(cacheKey, JSON.stringify(data.data.timings));
            }
            return data.data.timings;
        }
        return null;
    } catch (error) {
        console.warn("[PrayerTimes] Fetch failed, using fallback:", error);
        // Fallback to static times for Semarang if API fails (as requested for regional accuracy)
        return {
            Fajr: "04:30", Sunrise: "05:45", Dhuhr: "11:45", Asr: "15:00",
            Maghrib: "17:45", Isha: "18:55", Imsak: "04:20", Midnight: "23:45", Sunset: "17:45"
        } as PrayerTimes;
    }
};

export const getPersonalizedSpiritualReminder = async (userId: string, phase: 'pre-prayer' | 'post-prayer'): Promise<{ 
    type: 'quran' | 'hadith', 
    content: string, 
    content_ar?: string,
    reference: string, 
    verifyUrl?: string 
} | null> => {
    try {
        // Post-prayer = Quranic verse, Pre-prayer = Hadith
        if (phase === 'post-prayer') {
            // Seed randomness based on user + day so it stays consistent for the session but unique to user
            const dateStr = new Date().toISOString().split('T')[0];
            const hashStr = userId + dateStr;
            let hash = 0;
            for (let i = 0; i < hashStr.length; i++) hash = hashStr.charCodeAt(i) + ((hash << 5) - hash);
            const randomAyah = (Math.abs(hash) % 6236) + 1;

            // Fetch English (Asad) and Arabic with timeout
            const [resEn, resAr] = await Promise.all([
                fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/en.asad`, { signal: AbortSignal.timeout(3000) }),
                fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/ar.alafasy`, { signal: AbortSignal.timeout(3000) })
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
            // Public Hadith APIs are often unstable or block CORS.
            // Using a reliable, curated local list for instant, zero-latency rendering.
            const HADITHS = [
                { content: "The best among you are those who have the best manners and character.", content_ar: "خياركم أحسنكم أخلاقا", reference: "Sahih Bukhari 6029", url: "https://sunnah.com/bukhari:6029" },
                { content: "God does not look at your forms and possessions but he looks at your hearts and your deeds.", content_ar: "إن الله لا ينظر إلى صوركم وأموالكم، ولكن ينظر إلى قلوبكم وأعمالكم", reference: "Sahih Muslim 2564", url: "https://sunnah.com/muslim:2564" },
                { content: "He who does not show mercy to others, will not be shown mercy.", content_ar: "من لا يرحم لا يرحم", reference: "Sahih Bukhari 5997", url: "https://sunnah.com/bukhari:5997" },
                { content: "Make things easy for people and not difficult.", content_ar: "يسروا ولا تعسروا", reference: "Sahih Bukhari 69", url: "https://sunnah.com/bukhari:69" },
                { content: "A kind word is a form of charity.", content_ar: "والكلمة الطيبة صدقة", reference: "Sahih Bukhari 2989", url: "https://sunnah.com/bukhari:2989" },
                { content: "The strong man is not the one who can wrestle, but the one who controls himself in a fit of anger.", content_ar: "ليس الشديد بالصرعة، إنما الشديد الذي يملك نفسه عند الغضب", reference: "Sahih Bukhari 6114", url: "https://sunnah.com/bukhari:6114" }
            ];
            
            // Generate a random index based on user ID and current day for consistency across the day
            const dateStr = new Date().toISOString().split('T')[0];
            const hashStr = userId + dateStr + "hadith";
            let hash = 0;
            for (let i = 0; i < hashStr.length; i++) hash = hashStr.charCodeAt(i) + ((hash << 5) - hash);
            const selected = HADITHS[Math.abs(hash) % HADITHS.length];

            return {
                type: 'hadith',
                content: selected.content,
                content_ar: selected.content_ar,
                reference: selected.reference,
                verifyUrl: selected.url
            };
        }
    } catch (error: any) {
        if (error.name !== 'TimeoutError') {
            console.error("Spiritual reminder error:", error);
        }
        return {
            type: 'hadith',
            content: "The best among you are those who have the best manners and character.",
            content_ar: "خياركم أحسنكم أخلاقا",
            reference: "Sahih Bukhari",
            verifyUrl: "https://sunnah.com/bukhari"
        };
    }
};


export const getPrayerWindow = (prayerTimes: PrayerTimes): { inWindow: boolean, phase: 'pre-prayer' | 'post-prayer' | 'none' } => {
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

    for (const t of timings) {
        // Skip Sunrise/Sunset which are non-standard prayer bounds if you want strictly the 5 prayers, 
        // but typically users want reminders around all of them.
        if (t.name === 'Imsak' || t.name === 'Midnight') continue;

        const diff = currentTime - t.minutes;
        if (diff >= -15 && diff < 0) {
            // 15 mins before up to exactly prayer time -> Hadith
            return { inWindow: true, phase: 'pre-prayer' };
        } else if (diff >= 0 && diff <= 15) {
            // exactly prayer time to 15 mins after -> Quran
            return { inWindow: true, phase: 'post-prayer' };
        }
    }

    return { inWindow: false, phase: 'none' };
};
