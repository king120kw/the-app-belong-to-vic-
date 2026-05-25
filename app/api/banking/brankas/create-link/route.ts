import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const BRANKAS_API_KEY = process.env.BRANKAS_API_KEY;

export async function POST(request: Request) {
    try {
        const { userId, bankId, countryCode } = await request.json();

        if (!BRANKAS_API_KEY) {
            return NextResponse.json({ success: false, error: 'Brankas API Key is missing in backend' }, { status: 500 });
        }

        // Generate a deterministic or random transaction ID for tracking
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const payload = {
            bank_id: bankId,
            country: countryCode || 'ID',
            callback: {
                success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/banking/brankas/callback?status=SUCCESS&user_id=${userId}&bank_id=${bankId}&transaction_id=${transactionId}`,
                fail_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/banking/brankas/callback?status=FAIL&user_id=${userId}&bank_id=${bankId}`
            }
        };

        const response = await fetch('https://statement.bnk.to/v2/statement/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BRANKAS_API_KEY!
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Brankas Live Error:", errorText);
            throw new Error('Failed to connect to Brankas Live Environment');
        }

        const data = await response.json();

        if (data.redirect_uri) {
            return NextResponse.json({ success: true, redirect_url: data.redirect_uri });
        } else {
            throw new Error('No redirect URI returned from Brankas');
        }

    } catch (err: any) {
        console.error('Brankas Create Link Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
