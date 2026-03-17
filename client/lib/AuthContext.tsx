import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: any | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        };

        getInitialSession();

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Listen for profile changes
    useEffect(() => {
        if (!user) {
            setProfile(null);
            return;
        }

        // Initial profile fetch
        const fetchProfile = async () => {
            const { data } = await supabase
                .from('user_profiles')
                .select('*, chat_users!chat_users_user_id_fkey(phone_number, is_verified)')
                .eq('id', user.id)
                .maybeSingle();

            if (data) setProfile(data);
        };

        fetchProfile();

        // Real-time subscription to profile updates
        const profileSubscription = supabase
            .channel(`profile:${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'user_profiles',
                filter: `id=eq.${user.id}`
            }, (payload) => {
                console.log('Profile update received:', payload.new);
                setProfile((prev: any) => ({ ...prev, ...payload.new }));
            })
            .subscribe();

        return () => {
            profileSubscription.unsubscribe();
        };
    }, [user]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    const value = React.useMemo(() => ({
        user,
        session,
        profile,
        loading,
        signOut,
    }), [user, session, profile, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
