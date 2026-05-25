import { NextResponse } from 'next/server';

const TRUELAYER_CLIENT_ID = process.env.TRUELAYER_CLIENT_ID;

export async function POST(request: Request) {
    try {
        const { userId, bankId } = await request.json();

        if (!TRUELAYER_CLIENT_ID) {
            return NextResponse.json({ success: false, error: 'TrueLayer API Key is missing in backend' }, { status: 500 });
        }

        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/banking/truelayer/callback`;
        
        // Pass userId and bankId through the state parameter to recover them in the callback
        const state = Buffer.from(JSON.stringify({ userId, bankId })).toString('base64');

        const truelayerAuthUrl = `https://auth.truelayer-sandbox.com/?response_type=code&client_id=${TRUELAYER_CLIENT_ID}&scope=info%20accounts%20balance%20cards%20transactions%20direct_debits%20standing_orders%20offline_access&redirect_uri=${encodeURIComponent(redirectUri)}&providers=uk-ob-all%20uk-oauth-all&state=${state}`;

        return NextResponse.json({ 
            success: true, 
            redirect_url: truelayerAuthUrl
        });

    } catch (err: any) {
        console.error('TrueLayer Create Link Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
