import { NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

const configuration = new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV],
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
            'PLAID-SECRET': PLAID_SECRET,
        },
    },
});

const plaidClient = new PlaidApi(configuration);

export async function POST(request: Request) {
    try {
        const { public_token, userId, institution_id, institution_name } = await request.json();

        if (!public_token || !userId) {
            return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Exchange the public token for an access token
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: public_token,
        });

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        // 2. Store securely in backend (NOT accessible to frontend)
        const supabase = createServerSupabaseClient();
        
        const { error: dbError } = await supabase.from('banking_tokens').upsert({
            user_id: userId,
            provider: 'plaid',
            access_token: accessToken,
            item_id: itemId,
            institution_id: institution_id || 'unknown'
        }, { onConflict: 'user_id,institution_id' });

        if (dbError) {
            console.error("Database Error Storing Token:", dbError);
            throw new Error("Failed to secure access token in backend");
        }

        // 3. We also need to get account data to return some public info to the frontend
        const authResponse = await plaidClient.authGet({
            access_token: accessToken,
        });

        const accounts = authResponse.data.accounts;
        const primaryAccount = accounts[0]; // For MVP, grab the first account

        // Check if this account already exists for the user in user_banks
        const { data: existingBank } = await supabase
            .from('user_banks')
            .select('id')
            .eq('user_id', userId)
            .eq('account_id', primaryAccount.account_id)
            .limit(1)
            .maybeSingle();

        const bankData = {
            user_id: userId,
            provider: 'plaid',
            bank_name: institution_name || primaryAccount.name,
            account_id: primaryAccount.account_id,
            account_name: primaryAccount.name,
            balance: primaryAccount.balances.available || primaryAccount.balances.current || 0,
            currency: primaryAccount.balances.iso_currency_code || 'USD',
            is_active: true,
            updated_at: new Date().toISOString()
        };

        let userBanksError;
        if (existingBank) {
            const { error } = await supabase
                .from('user_banks')
                .update(bankData)
                .eq('id', existingBank.id);
            userBanksError = error;
        } else {
            const { error } = await supabase
                .from('user_banks')
                .insert(bankData);
            userBanksError = error;
        }

        if (userBanksError) console.error("Error updating user_banks:", userBanksError);

        // Return non-sensitive details to frontend
        return NextResponse.json({
            success: true,
            account: {
                bank_name: institution_name || primaryAccount.name,
                account_name: primaryAccount.name,
                balance: primaryAccount.balances.available || primaryAccount.balances.current || 0,
                currency: primaryAccount.balances.iso_currency_code || 'USD'
            }
        });

    } catch (err: any) {
        console.error('Plaid Exchange Token Error:', err.response?.data || err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
