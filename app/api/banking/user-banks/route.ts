import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const urlUserId = searchParams.get('userId');

        const supabase = createServerSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        const userId = urlUserId || session?.user?.id;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: banks, error } = await supabase
            .from('user_banks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase user_banks query error:", error);
            throw error;
        }

        return NextResponse.json({ success: true, banks: banks || [] });

    } catch (err: any) {
        console.error("Fetch user banks error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
