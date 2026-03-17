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
            const inWindow = prayerTimes ? isPrayerTime(prayerTimes) : false;

            if (inWindow) {
                // If in window and not already visible, fetch and show
                if (!isVisible) {
                    const data = await getPersonalizedSpiritualReminder(userId);
                    if (data) {
                        setReminder(data);
                        setIsVisible(true);
                    }
                }
            } else {
                // Not in window, hide immediately
                if (isVisible) {
                    setIsVisible(false);
                    setReminder(null);
                }
            }
        };

        checkSpiritualWindow();
        // Check every minute for precision given the 10-min window
        const interval = setInterval(checkSpiritualWindow, 60 * 1000);
        return () => clearInterval(interval);
    }, [userId, isVisible]);

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
                                <div className="flex items-center gap-1.5">
                                    <div className="size-1.5 rounded-full bg-vic-green animate-pulse shadow-[0_0_8px_rgba(19,236,55,0.8)]" />
                                    <p className="text-vic-green text-[10px] font-bold uppercase tracking-widest">{t('prayer_time_window')}</p>
                                </div>
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
                        <div className="flex flex-col gap-1">
                            <span className="text-vic-pink text-xs font-bold uppercase tracking-wider">— {reminder.reference}</span>
                            {(reminder as any).verifyUrl && (
                                <a
                                    href={(reminder as any).verifyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-vic-green/60 hover:text-vic-green flex items-center gap-1 transition-colors font-bold uppercase"
                                >
                                    <span className="material-symbols-outlined text-xs">verified</span>
                                    Verify Online
                                </a>
                            )}
                        </div>
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
