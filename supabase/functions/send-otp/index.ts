import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { userId, phoneNumber, countryCode, channel = 'sms' } = await req.json();

        if (!userId || !phoneNumber) {
            throw new Error("User ID and Phone Number are required");
        }

        // 1. Generate a secure 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        // 2. Initialize Supabase Admin client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. Update or Insert into chat_users
        const { error: dbError } = await supabaseAdmin
            .from('chat_users')
            .upsert({
                user_id: userId,
                phone_number: phoneNumber,
                country_code: countryCode,
                is_verified: false,
                verification_code: verificationCode,
                verification_expires_at: expiresAt
            }, { onConflict: 'user_id' });

        if (dbError) throw dbError;

        // 4. Send the code (Integration Placeholder)
        // Here you would integrate with Infobip, Twilio, or another provider.
        console.log(`[VERIFICATION] Sending ${verificationCode} to ${phoneNumber} via ${channel}`);

        const providerApiKey = Deno.env.get('TELEPHONY_PROVIDER_API_KEY');

        if (providerApiKey) {
            // Example: Simple fetch call to an SMS provider API
            // await fetch('https://api.provider.com/v1/send', { ... });
        } else {
            console.warn("TELEPHONY_PROVIDER_API_KEY not set. Falling back to console log for development.");
        }

        return new Response(JSON.stringify({ success: true, message: "Code sent" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
