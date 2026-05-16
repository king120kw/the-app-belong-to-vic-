"use client"
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { detectLocation, getPrimaryLanguage } from './location';
import { updateSettings } from './settings';
import { toast } from 'sonner';

import { en } from '../translations/en';
import { ar } from '../translations/ar';
import { ur } from '../translations/ur';
import { bn } from '../translations/bn';
import { hi } from '../translations/hi';
import { zh } from '../translations/zh';
import { es } from '../translations/es';
import { fr } from '../translations/fr';
import { pt } from '../translations/pt';
import { ru } from '../translations/ru';
import { id } from '../translations/id';
import { sw } from '../translations/sw';
import { mr } from '../translations/mr';
import { te } from '../translations/te';
import { ta } from '../translations/ta';
import { vi } from '../translations/vi';
import { so } from '../translations/so';
import { my } from '../translations/my';
import { ko } from '../translations/ko';
import { tr } from '../translations/tr';
import { de } from '../translations/de';

export type Language = 'en' | 'ar' | 'ur' | 'bn' | 'hi' | 'zh' | 'es' | 'fr' | 'pt' | 'ru' | 'id' | 'sw' | 'mr' | 'te' | 'ta' | 'vi' | 'so' | 'my' | 'ko' | 'tr' | 'de';

const translations: Record<Language, Record<string, string>> = {
    en, ar, ur, bn, hi, zh, es, fr, pt, ru, id, sw, mr, te, ta, vi, so, my, ko, tr, de
};

export const getTranslation = (lang: string = 'en', key: string): string => {
    const l = (translations[lang as Language] ? lang : 'en') as Language;
    return translations[l][key] || translations['en'][key] || key;
};

export const useTranslation = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: settings } = useQuery({
        queryKey: ['settings', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .limit(1);
            return data && data.length > 0 ? data[0] : null;
        },
        enabled: !!user?.id
    });

    const { data: detectedLoc, refetch: refreshLocation } = useQuery({
        queryKey: ['detected-location'],
        queryFn: () => detectLocation(),
        staleTime: 60 * 60 * 1000, // Increase to 1 hour to prevent frequent refetching
        refetchOnWindowFocus: false, // Prevent looping on window focus
        refetchOnMount: true
    });

    const isAuto = (settings as any)?.is_language_auto !== false;

    // Use localStorage as a fast-cache for visual consistency
    const cachedLang = (typeof window !== 'undefined' ? localStorage.getItem('app_lang') : null) as Language;

    // Core Precedence Logic: 
    // Manual settings ALWAYS win if auto is off.
    // If auto is on, detected location wins, then settings, then cache.
    const rawLang = !isAuto
        ? ((settings as any)?.language || cachedLang || 'en')
        : (getPrimaryLanguage(detectedLoc?.languages) || (settings as any)?.language || cachedLang || 'en');

    useEffect(() => {
        const primaryLang = getPrimaryLanguage(detectedLoc?.languages);
        if (primaryLang && primaryLang !== 'en') {
            localStorage.setItem('app_lang', primaryLang);
        }
    }, [detectedLoc]);

    useEffect(() => {
        if (user && detectedLoc && isAuto) {
            const syncKey = `location_synced_${user.id}`;
            const toastKey = `location_toasted_${user.id}`;
            
            // If already synced this day, skip to avoid spamming Supabase
            const lastSync = localStorage.getItem(syncKey);
            const todayStr = new Date().toISOString().split('T')[0];
            if (lastSync === todayStr) return;

            const s = settings as any;
            // Sync if any core location attribute is missing or different
            const needsSync = !s ||
                s.language !== getPrimaryLanguage(detectedLoc?.languages) ||
                s.country_code !== detectedLoc?.country_code ||
                s.currency !== detectedLoc?.currency ||
                (s.timezone !== detectedLoc?.timezone);

            if (needsSync) {
                updateSettings(user.id, {
                    language: getPrimaryLanguage(detectedLoc?.languages),
                    currency: detectedLoc?.currency,
                    timezone: detectedLoc?.timezone,
                    country_code: detectedLoc?.country_code,
                    is_language_auto: true
                }).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['settings', user.id] });

                    // Only toast if it's a significant change and we haven't toasted recently
                    if (s && s.country_code !== detectedLoc?.country_code && !localStorage.getItem(toastKey)) {
                        toast.success(t('location_updated_toast').replace('%s', detectedLoc?.country_name || ''), {
                            icon: '🌎',
                            duration: 5000
                        });
                        localStorage.setItem(toastKey, todayStr);
                    }
                    localStorage.setItem(syncKey, todayStr);
                }).catch(err => {
                    console.error("Failed to sync location settings:", err);
                });
            } else {
                localStorage.setItem(syncKey, todayStr);
            }
        }
    }, [detectedLoc, isAuto, user, settings, queryClient]);

    const langMap: Record<string, Language> = {
        'ind': 'id', 'eng': 'en', 'fra': 'fr', 'deu': 'de', 'ger': 'de',
        'hin': 'hi', 'msa': 'id', 'may': 'id', 'nld': 'de', 'dut': 'de',
        'spa': 'es', 'ita': 'es', 'jpn': 'zh', 'kor': 'ko', 'chi': 'zh', 'zho': 'zh',
        'ara': 'ar', 'urd': 'ur', 'ben': 'bn', 'por': 'pt', 'rus': 'ru',
        'swa': 'sw', 'mar': 'mr', 'tel': 'te', 'tam': 'ta', 'vie': 'vi',
        'som': 'so', 'mya': 'my', 'tur': 'tr'
    };

    const finalLang = langMap[rawLang.toLowerCase()] || (translations[rawLang as Language] ? rawLang : 'en') as Language;

    const lang = finalLang;
    const currency = (settings as any)?.currency || detectedLoc?.currency || 'USD';
    const timezone = (settings as any)?.timezone || detectedLoc?.timezone || 'UTC';
    const country = (settings as any)?.country || detectedLoc?.country_name || 'Global';

    const currencySymbols: Record<string, string> = {
        'USD': '$', 'GBP': '£', 'EUR': '€', 'IDR': 'Rp', 'NGN': '₦', 'MYR': 'RM', 'INR': '₹',
        'SAR': 'SR', 'AED': 'DH', 'PKR': 'Rs', 'BDT': '৳', 'BRL': 'R$', 'RUB': '₽', 'KES': 'KSh',
        'VND': '₫', 'SOS': 'Sh', 'MMK': 'K', 'TRY': '₺'
    };

    const currencySymbol = (settings as any)?.currency_symbol || detectedLoc?.currency_symbol || currencySymbols[currency] || '$';
    const t = (key: string) => getTranslation(lang, key);

    const formatCurrency = (amount: number) => {
        return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getLocalHour = () => {
        try {
            const now = new Date();
            const options: Intl.DateTimeFormatOptions = { hour: 'numeric', hour12: false, timeZone: timezone };
            const formatter = new Intl.DateTimeFormat('en-US', options);
            return parseInt(formatter.format(now));
        } catch (e) {
            return new Date().getHours();
        }
    };

    const localHour = getLocalHour();

    const speak = (text: string) => {
        if (!text) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const langCodeMap: Record<Language, string> = {
            'en': 'en-US', 'ar': 'ar-SA', 'ur': 'ur-PK', 'bn': 'bn-BD',
            'hi': 'hi-IN', 'zh': 'zh-CN', 'es': 'es-ES', 'fr': 'fr-FR',
            'pt': 'pt-PT', 'ru': 'ru-RU', 'id': 'id-ID', 'sw': 'sw-KE',
            'mr': 'mr-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'vi': 'vi-VN',
            'so': 'so-SO', 'my': 'my-MM', 'ko': 'ko-KR', 'tr': 'tr-TR', 'de': 'de-DE'
        };
        utterance.lang = langCodeMap[lang] || 'en-US';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    };

    return { t, lang: finalLang, currency, currencySymbol, timezone, country, localHour, formatCurrency, speak, refreshLocation, isAuto };
};
