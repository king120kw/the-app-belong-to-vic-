import { useState, useEffect } from 'react';
import { getPrayerTimes, getPersonalizedSpiritualReminder, isPrayerTime } from '../lib/api/prayerTimes';
import { useTranslation } from '../lib/api/translation';
import { motion, AnimatePresence } from 'framer-motion';

interface SpiritualReminderProps {
    userId: string;
}

export const SpiritualReminder = ({ userId }: SpiritualReminderProps) => {
    const { t } = useTranslation();
    const [reminder, setReminder] = useState<{ type: 'quran' | 'hadith', content: string, reference: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkSpiritualWindow = async () => {
            const prayerTimes = await getPrayerTimes();
            if (prayerTimes && isPrayerTime(prayerTimes)) {
                // It's prayer time window, check if we already have a reminder for this session
                const sessionKey = `spiritual_reminder_${new Date().toDateString()}`;
                const alreadyShown = localStorage.getItem(sessionKey);

                if (!alreadyShown) {
                    const data = await getPersonalizedSpiritualReminder(userId);
                    if (data) {
                        setReminder(data);
                        setIsVisible(true);
                        localStorage.setItem(sessionKey, 'true');
                    }
                }
            }
        };

        checkSpiritualWindow();
        // Check every 5 minutes
        const interval = setInterval(checkSpiritualWindow, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [userId]);

    if (!isVisible || !reminder) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mx-4 my-6 p-6 rounded-[32px] bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-white/10 shadow-2xl relative overflow-hidden group"
            >
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 size-40 bg-vic-green/10 rounded-full blur-3xl group-hover:bg-vic-green/20 transition-colors duration-700" />
                <div className="absolute -bottom-10 -left-10 size-40 bg-vic-pink/10 rounded-full blur-3xl group-hover:bg-vic-pink/20 transition-colors duration-700" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-vic-green/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-vic-green text-2xl">
                                    {reminder.type === 'quran' ? 'auto_stories' : 'menu_book'}
                                </span>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm tracking-tight uppercase">
                                    {reminder.type === 'quran' ? 'Quranic Verse' : 'Hadith Reminder'}
                                </h4>
                                <p className="text-vic-green text-[10px] font-bold uppercase tracking-widest">{t('prayer_time_window')}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsVisible(false)} className="text-white/20 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <p className="text-slate-200 text-lg font-medium leading-relaxed italic mb-4 font-serif">
                        "{reminder.content}"
                    </p>

                    <div className="flex items-center justify-between">
                        <span className="text-vic-pink text-xs font-bold uppercase tracking-wider">— {reminder.reference}</span>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="size-1 rounded-full bg-vic-green/30" />
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
