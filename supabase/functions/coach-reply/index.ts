import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractMediaUrl(record: any): string | null {
    const meta = record.metadata;
    if (!meta) return null;
    if (typeof meta === 'object') return meta.url || meta.publicUrl || null;
    if (typeof meta === 'string' && meta.startsWith('http')) return meta;
    return null;
}

async function getGeoInfo(supabase: any, clientIp: string) {
    // 1. Try valid cache
    const { data: cached } = await supabase
        .from('ip_location_cache')
        .select('*')
        .eq('ip_address', clientIp)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
    if (cached) return cached;

    // 2. Fetch fresh
    try {
        const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
        if (geoRes.ok) {
            const g = await geoRes.json();
            if (!g.error) {
                const geoInfo = {
                    ip_address: clientIp,
                    country_code: g.country_code || 'US',
                    country_name: g.country_name || 'United States',
                    city: g.city || 'Unknown',
                    timezone: g.timezone || 'UTC',
                    currency_code: g.currency || 'USD',
                    currency_symbol: g.currency_symbol || '$',
                    expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
                };
                await supabase.from('ip_location_cache').upsert(geoInfo, { onConflict: 'ip_address' });
                return geoInfo;
            }
        }
    } catch (e) {
        console.error('Geo lookup failed:', e);
    }

    // 3. Hard fallback
    return { country_code: 'US', country_name: 'United States', city: 'Unknown', currency_code: 'USD', currency_symbol: '$', timezone: 'UTC' };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const payload = await req.json();
        const { record, type, table } = payload;
        const COACH_ID = '00000000-0000-0000-0000-000000000001';

        if (type !== 'INSERT' || table !== 'messages' || record?.sender_id === COACH_ID) {
            return new Response(JSON.stringify({ message: "Ignored" }), { headers: corsHeaders });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error("OPENAI_API_KEY not set");

        const supabase = createClient(supabaseUrl, supabaseKey);
        const conversationId = record.conversation_id;

        // ── 1. GEO DETECTION ──
        // Try multiple header sources to get real client IP
        const clientIp = (
            req.headers.get('x-real-ip') ||
            req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            req.headers.get('cf-connecting-ip') ||
            '8.8.8.8'
        );
        const geoInfo = await getGeoInfo(supabase, clientIp);

        // ── 2. USER CONTEXT ──
        const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId);

        const userId = participants?.find((p: any) => p.user_id !== COACH_ID)?.user_id;
        if (!userId) return new Response(JSON.stringify({ message: "No human" }), { headers: corsHeaders });

        const [onboardingRes, profileRes, nutritionRes, messagesRes, scannedProductsRes] = await Promise.all([
            supabase.from('onboarding_responses').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
            supabase.from('food_analysis_history').select('*').eq('user_id', userId).order('analyzed_at', { ascending: false }).limit(7),
            supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(20),
            supabase.from('food_analysis_history').select('food_name, calories, protein, carbs, fat, analyzed_at').eq('user_id', userId).order('analyzed_at', { ascending: false }).limit(3)
        ]);

        const profile = profileRes.data;
        const onboarding = onboardingRes.data || {};
        const nutritionHistory = nutritionRes.data || [];
        const recentMessages = (messagesRes.data || []).reverse();
        const recentScans = scannedProductsRes.data || [];

        const userName = profile?.full_name || 'there';
        const currentTime = new Date().toLocaleString('en-US', {
            timeZone: geoInfo.timezone || 'UTC',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // ── 3. COMPUTE USER STATS ──
        const totalCaloriesToday = recentScans
            .filter((s: any) => s.analyzed_at && new Date(s.analyzed_at).toDateString() === new Date().toDateString())
            .reduce((sum: number, s: any) => sum + (s.calories || 0), 0);

        const calorieGoal = onboarding.daily_calorie_goal || 2000;
        const caloriesRemaining = calorieGoal - totalCaloriesToday;

        // ── 4. SYSTEM PROMPT ──
        const systemPrompt = `You are the Omni-Coach AI, a world-class clinical nutritionist, pharmacist, and personal health advisor for ${userName}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
REAL-TIME AWARENESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT DATE & TIME: ${currentTime}
USER'S LOCATION: ${geoInfo.city || 'Unknown'}, ${geoInfo.country_name || 'Unknown'}
LOCAL CURRENCY: ${geoInfo.currency_symbol || '$'} (${geoInfo.currency_code || 'USD'})

━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${userName}
Primary Goal: ${onboarding.goal || 'Maintain a healthy lifestyle'}
Dietary Restrictions: ${(onboarding.dietary_lifestyle || []).join(', ') || 'None specified'}
Medical Conditions: ${onboarding.medical_conditions || 'None reported'}
Health Concerns: ${onboarding.health_conditions || 'None reported'}
Daily Calorie Target: ${calorieGoal} kcal/day
Calories logged today: ${totalCaloriesToday} kcal (${caloriesRemaining > 0 ? `${caloriesRemaining} kcal remaining` : `${Math.abs(caloriesRemaining)} kcal over goal`})

━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECENT FOOD SCANS (Last 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${recentScans.length > 0 ? recentScans.map((s: any) => `• ${s.food_name || 'Unknown'}: ${s.calories || 0} kcal (${s.analyzed_at ? new Date(s.analyzed_at).toLocaleDateString() : 'recent'})`).join('\n') : 'No recent food scans.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE MANDATES (NEVER BREAK THESE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. YOU KNOW THE EXACT DATE, TIME, AND USER LOCATION. Never claim you don't.
   - If asked "what time is it?", answer: "${currentTime}"
   - If asked "where am I?" or "what's my location?", answer: "${geoInfo.city}, ${geoInfo.country_name}"
2. CURRENCY AWARENESS: Always use ${geoInfo.currency_symbol} for prices in ${geoInfo.country_name}.
3. MEDICAL PRECISION: Always factor in user's conditions (${onboarding.medical_conditions || 'none'}) in recommendations.
4. ETHICAL BRAND TRACKING: If asked about brands like Nestle, Coca-Cola, PepsiCo, McDonald's, Starbucks — flag their political affiliations (invest_israel). Be factual.
5. CALORIE INTELLIGENCE: You know the user has consumed ${totalCaloriesToday} kcal today out of a ${calorieGoal} kcal goal. Use this in advice.
6. MULTIMODAL: If given an image, provide expert food/product analysis. If given a voice transcript, respond to it naturally.
7. BE ARTICULATE: Give specific, personalized, data-driven answers. Never give generic advice when you have user data.
8. LANGUAGE: Match the user's language. If they write in Arabic, respond in Arabic. If English, respond in English.

RESPONSE FORMAT: Respond ONLY with a valid JSON object: {"reply": "your full response here"}
The reply should be conversational, warm, and detailed. Use markdown formatting (bold, bullets) inside the reply string for readability.`;

        // ── 5. MULTIMODAL MESSAGE HANDLING ──
        const msgType = record.message_type;
        const imageUrl = msgType === 'image' ? extractMediaUrl(record) : null;
        let transcribedText = '';

        if (msgType === 'voice') {
            const voiceUrl = extractMediaUrl(record);
            if (voiceUrl) {
                try {
                    const audioRes = await fetch(voiceUrl);
                    if (audioRes.ok) {
                        const audioBlob = await audioRes.blob();
                        const formData = new FormData();
                        formData.append('file', audioBlob, 'voice.webm');
                        formData.append('model', 'whisper-1');
                        const transRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${apiKey}` },
                            body: formData
                        });
                        if (transRes.ok) {
                            const tData = await transRes.json();
                            transcribedText = tData.text || '';
                        }
                    }
                } catch (e) { console.error('Voice transcription failed:', e); }
            }
        }

        // Build chat context
        const chatContext: any[] = recentMessages.map((m: any) => ({
            role: m.sender_id === COACH_ID ? 'assistant' : 'user',
            content: m.sender_id === COACH_ID
                ? (m.content || '')
                : (m.message_type === 'text' ? (m.content || '') : `[${m.message_type} message shared]`)
        })).filter((m: any) => m.content);

        // Add current message with multimodal content if needed
        const currentUserMsg: any = { role: 'user', content: record.content || '' };
        if (imageUrl) {
            currentUserMsg.content = [
                { type: 'text', text: record.content || 'Please analyze this image.' },
                { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
            ];
        } else if (msgType === 'voice' && transcribedText) {
            currentUserMsg.content = `[Voice message]: ${transcribedText}`;
        }

        // Replace last message if it's the same as current user message
        const chatWithCurrent = chatContext.filter((m: any, i: number) =>
            !(i === chatContext.length - 1 && m.role === 'user' && m.content === record.content)
        );
        chatWithCurrent.push(currentUserMsg);

        // ── 6. AI CALL ──
        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "system", content: systemPrompt }, ...chatWithCurrent.slice(-20)],
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: 1500
            })
        });

        if (!openAiRes.ok) throw new Error(`OpenAI error: ${await openAiRes.text()}`);
        const aiData = await openAiRes.json();
        const reply = JSON.parse(aiData.choices[0].message.content).reply;

        if (!reply) throw new Error('Empty reply from AI');

        // ── 7. SAVE COACH REPLY ──
        await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: COACH_ID,
            content: reply,
            message_type: 'text',
            is_read: false
        });

        // Update conversation last message
        await supabase.from('conversations').update({
            last_message_at: new Date().toISOString(),
            last_message_content: reply.substring(0, 200),
            last_message_type: 'text',
            last_message_sender_id: COACH_ID
        } as any).eq('id', conversationId);

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } catch (err: any) {
        console.error("Coach Reply Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
    }
});
