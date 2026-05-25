import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

const TRUELAYER_CLIENT_ID = process.env.TRUELAYER_CLIENT_ID;
const TRUELAYER_CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const stateStr = searchParams.get('state');
        const error = searchParams.get('error');

        if (error || !code || !stateStr) {
             return NextResponse.redirect(new URL('/dashboard?error=BankAuthFailed', request.url));
        }

        const stateObj = JSON.parse(Buffer.from(stateStr, 'base64').toString('ascii'));
        const { userId, bankId } = stateObj;

        // Exchange code for access token
        const tokenRes = await fetch('https://auth.truelayer-sandbox.com/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: TRUELAYER_CLIENT_ID!,
                client_secret: TRUELAYER_CLIENT_SECRET!,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/banking/truelayer/callback`,
                code: code,
            })
        });

        if (!tokenRes.ok) {
            throw new Error("Failed to exchange TrueLayer token");
        }

        const tokenData = await tokenRes.json();
        const access_token = tokenData.access_token;

        // Store secure token
        const supabase = createAdminSupabaseClient();
        await supabase.from('banking_tokens').upsert({
            user_id: userId,
            provider: 'truelayer',
            access_token: access_token,
            institution_id: bankId || 'truelayer_bank'
        }, { onConflict: 'user_id,institution_id' });

        // Fetch Accounts to get balance
        const dataRes = await fetch('https://api.truelayer-sandbox.com/data/v1/accounts', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });

        let balance = 0;
        let currency = 'GBP';

        if (dataRes.ok) {
            const accData = await dataRes.json();
            if (accData.results && accData.results.length > 0) {
                const account_id = accData.results[0].account_id;
                
                // Fetch specific balance
                const balRes = await fetch(`https://api.truelayer-sandbox.com/data/v1/accounts/${account_id}/balance`, {
                    headers: { 'Authorization': `Bearer ${access_token}` }
                });
                
                if (balRes.ok) {
                    const balData = await balRes.json();
                    if (balData.results && balData.results.length > 0) {
                        balance = balData.results[0].available;
                        currency = balData.results[0].currency;
                    }
                }
            }
        }

        // Save to public user_banks for UI
        await supabase.from('user_banks').upsert({
            user_id: userId,
            bank_id: bankId || 'truelayer_bank',
            bank_name: 'Connected via TrueLayer',
            account_type: 'checking',
            balance: balance,
            currency: currency
        }, { onConflict: 'user_id,bank_id' });

        return NextResponse.redirect(new URL('/dashboard?success=true', request.url));

    } catch (err: any) {
        console.error('TrueLayer Callback Error:', err.message);
        return NextResponse.redirect(new URL('/dashboard?error=InternalError', request.url));
    }
}
