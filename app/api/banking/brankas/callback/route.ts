import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

const BRANKAS_API_KEY = process.env.BRANKAS_API_KEY;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const transaction_id = searchParams.get('transaction_id');
        const statement_id = searchParams.get('statement_id');
        const status = searchParams.get('status');
        
        // Use Supabase server client to get authenticated session
        const supabaseUser = createServerSupabaseClient();
        const { data: { session } } = await supabaseUser.auth.getSession();
        const userId = searchParams.get('user_id') || session?.user?.id;
        
        // Read the bank ID cookie we set before redirecting
        const cookieStore = cookies();
        const bankId = searchParams.get('bank_id') || cookieStore.get('brankas_pending_bank_id')?.value;

        if (!userId) {
            return NextResponse.redirect(new URL('/dashboard?error=MissingUser', request.url));
        }

        if (status !== 'SUCCESS') {
             return NextResponse.redirect(new URL('/dashboard?error=BankAuthFailed', request.url));
        }

        // Securely store the statement_id / token in backend
        const supabase = createAdminSupabaseClient();
        await supabase.from('banking_tokens').upsert({
            user_id: userId,
            provider: 'brankas',
            access_token: statement_id || transaction_id || 'unknown',
            institution_id: bankId || 'brankas_bank'
        }, { onConflict: 'user_id,institution_id' });

        let balance = 0;
        let currency = 'IDR';
        let accountName = 'Indonesian Bank Account';

        // Fetch real account balance from Brankas Live Environment
        if (statement_id) {
            const response = await fetch(`https://statement.bnk.to/v2/statement/${statement_id}`, {
                method: 'GET',
                headers: {
                    'x-api-key': BRANKAS_API_KEY!
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.accounts && data.accounts.length > 0) {
                    balance = data.accounts[0].balance.amount || 0;
                    currency = data.accounts[0].balance.currency || 'IDR';
                    accountName = data.accounts[0].account_number || accountName;
                }
            } else {
                console.error("Failed to fetch statement from Brankas Live:", await response.text());
                return NextResponse.redirect(new URL('/dashboard?error=BankDataFetchFailed', request.url));
            }
        } else {
            return NextResponse.redirect(new URL('/dashboard?error=MissingStatementId', request.url));
        }

        // Save to public user_banks for UI
        await supabase.from('user_banks').upsert({
            user_id: userId,
            bank_id: bankId || 'brankas_bank',
            bank_name: 'Connected via Brankas',
            account_type: 'checking',
            balance: balance,
            currency: currency
        }, { onConflict: 'user_id,bank_id' });

        return NextResponse.redirect(new URL('/dashboard?success=true', request.url));

    } catch (err: any) {
        console.error('Brankas Callback Error:', err.message);
        return NextResponse.redirect(new URL('/dashboard?error=InternalError', request.url));
    }
}
