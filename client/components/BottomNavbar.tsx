import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/lib/api/translation';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

export const BottomNavbar: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();

    const { user } = useAuth();

    // Fetch unread count using the efficient RPC fix (V10)
    const { data: unreadCount = 0, refetch } = useQuery({
        queryKey: ['unread-messages-global', user?.id],
        queryFn: async () => {
            if (!user) return 0;
            const { data, error } = await (supabase as any).rpc('get_unread_count', { p_user_id: user.id });
            if (error) {
                console.error('[Navbar] Error fetching unread count:', error);
                return 0;
            }
            return Number(data || 0);
        },
        enabled: !!user,
        refetchInterval: 30000 // Polling backup
    });

    // Global listener in App.tsx handles real-time updates for unread counts


    // Hide navbar on certain pages
    const hiddenPaths = ['/', '/auth', '/onboarding', '/phone-input', '/verification-code'];
    const isChatDetail = location.pathname.startsWith('/chat/') && location.pathname !== '/chat';
    const isExpertDetail = location.pathname.startsWith('/expert/');

    if (hiddenPaths.includes(location.pathname) || isChatDetail || isExpertDetail) {
        return null;
    }

    const navItems = [
        {
            path: '/dashboard',
            label: t('home') || 'Home',
            icon: 'home',
        },
        {
            path: '/notifications',
            label: t('alerts') || 'Alerts',
            icon: 'notifications',
        },
        {
            path: '/chat',
            label: t('chat') || 'Chat',
            icon: 'forum',
            badge: unreadCount,
        },
        {
            path: '/settings',
            label: t('profile') || 'Profile', // The request specifically asked for Profile to lead to Settings
            icon: 'account_circle',
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#0d1418] border-t border-slate-200 dark:border-slate-800 safe-area-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto relative px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 relative
                            ${isActive ? 'text-vic-green' : 'text-slate-400 dark:text-slate-500'}
                        `}
                    >
                        <div className="relative">
                            <span className={`material-symbols-outlined transition-all duration-300 ${location.pathname === item.path ? 'scale-110 font-fill' : 'scale-100'}`}>
                                {item.icon}
                            </span>
                            {/* Red Dot Badge */}
                            {!!item.badge && item.badge > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#0d1418]">
                                    {item.badge > 9 ? '9+' : item.badge}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            {item.label}
                        </span>

                        {/* Active Indicator Bar */}
                        {location.pathname === item.path && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-vic-green rounded-full shadow-[0_2px_8px_rgba(19,236,55,0.4)]" />
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};
