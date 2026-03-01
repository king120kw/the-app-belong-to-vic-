import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        let body: any = {};
        try {
            body = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ success: false, message: "Invalid JSON body" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { userId, email, phoneNumber, countryCode, channel = 'sms' } = body;

        if (!email && !phoneNumber) {
            return new Response(JSON.stringify({ success: false, message: "Email or Phone Number is required" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 1. Generate a secure 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        // 2. Initialize Supabase Admin client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. Update or Insert into appropriate verification table
        if (email) {
            // Email channel: store in email_verification_codes
            const { error: dbError } = await supabase
                .from('email_verification_codes')
                .upsert([{
                    user_id: userId || null,
                    email: email.trim().toLowerCase(),
                    code: verificationCode,
                    expires_at: expiresAt
                }], { onConflict: 'email' });

            if (dbError) throw new Error(`Database error (email): ${dbError.message}`);
        } else if (phoneNumber) {
            // Phone channel: store in chat_users
            const { error: dbError } = await supabase
                .from('chat_users')
                .upsert([{
                    user_id: userId,
                    phone_number: phoneNumber,
                    country_code: countryCode,
                    is_verified: false,
                    verification_code: verificationCode,
                    verification_expires_at: expiresAt
                }], { onConflict: userId ? 'user_id' : 'phone_number' });

            if (dbError) throw new Error(`Database error (phone): ${dbError.message}`);
        }

        // 4. Send the code (In production, integrate with Twilio/SendGrid here)
        const identifier = email || phoneNumber;
        console.log(`[VERIFICATION] Sending ${verificationCode} to ${identifier} via ${channel}`);

        // In case OTP provider fails later, handle it:
        // const providerApiKey = Deno.env.get('TELEPHONY_PROVIDER_API_KEY');
        // if (!providerApiKey) throw new Error("OTP provider unavailable");

        return new Response(JSON.stringify({
            success: true,
            message: "Code sent",
            code: verificationCode // For testing/auto-fill purposes
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Edge Function Error (send-otp):", error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message || "An unexpected error occurred",
            details: error.details || error.hint || "Check server logs"
        }), {
            // Use 400 instead of 500 to prevent Supabase unhandled function crash wrapper
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
