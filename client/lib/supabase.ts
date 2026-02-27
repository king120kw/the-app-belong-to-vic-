import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env.PROD) {
        console.error("CRITICAL: Supabase environment variables are missing! Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your deployment dashboard (e.g., Netlify).");
    }
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
})
