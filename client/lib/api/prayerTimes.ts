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
        const url = `https://api.aladhan.com/v1/timingsByAddress/${date}?address=${encodeURIComponent(loc.country)}&timezone=${encodeURIComponent(loc.timezone)}`;

        const response = await fetch(url);
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

export const getPersonalizedSpiritualReminder = async (userId: string): Promise<{ type: 'quran' | 'hadith', content: string, reference: string } | null> => {
    try {
        // 1. Get user onboarding goal
        const { data: onboardingRows } = await supabase
            .from('onboarding_responses')
            .select('goal')
            .eq('user_id', userId)
            .limit(1);

        const onboarding = onboardingRows && onboardingRows.length > 0 ? onboardingRows[0] : null;
        const goal = onboarding?.goal || 'General';

        // 2. Find content that matches category or is general, which hasn't been viewed
        // First, get history
        const { data: history } = await supabase
            .from('user_spiritual_history')
            .select('content_id')
            .eq('user_id', userId);

        const viewedIds = history?.map(h => h.content_id) || [];

        // 3. Query content
        let query = supabase
            .from('spiritual_content')
            .select('*')
            .or(`category.eq."${goal}",category.eq.General`);

        if (viewedIds.length > 0) {
            query = query.not('id', 'in', `(${viewedIds.join(',')})`);
        }

        const { data: candidates } = await query.limit(10);

        if (!candidates || candidates.length === 0) return null;

        // Pick a random one from candidates
        const selected = candidates[Math.floor(Math.random() * candidates.length)];

        // 4. Log to history
        await supabase.from('user_spiritual_history').insert({
            user_id: userId,
            content_id: selected.id
        });

        return {
            type: selected.type as 'quran' | 'hadith',
            content: selected.content,
            reference: selected.reference
        };
    } catch (error) {
        console.error("Spiritual reminder error:", error);
        return null;
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

    // Check if within 30 minutes window for any prayer
    return timings.some(t => {
        const diff = Math.abs(t.minutes - currentTime);
        return diff <= 15; // 15 mins before or after
    });
};
