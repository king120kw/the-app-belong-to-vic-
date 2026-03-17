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
        const { record, type, table, system_context } = payload;
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
        const rawTime = system_context?.current_time || new Date().toISOString();
        const currentTime = new Date(rawTime).toLocaleString(system_context?.language || 'en-US', {
            timeZone: system_context?.time_zone || geoInfo.timezone || 'UTC',
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
LATEST DEPTH ANALYSIS (Context)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${system_context?.latest_analysis ? JSON.stringify(system_context.latest_analysis, null, 2) : 'No manual analysis context provided.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE MANDATES (NEVER BREAK THESE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. YOU KNOW THE EXACT DATE, TIME, AND USER LOCATION. Never claim you don't.
   - If asked "what time is it?", answer: "${currentTime}"
   - If asked "where am I?" or "what's my location?", answer: "${geoInfo.city}, ${geoInfo.country_name}"
2. CURRENCY & BUDGET AWARENESS: Always use ${geoInfo.currency_symbol} for prices. You know the user's monthly food budget is ${onboarding.budget || 'not set'}. If they scan something expensive, advise on cheaper alternatives found in their history or database.
3. MEDICAL PRECISION: Always factor in user's conditions (${onboarding.medical_conditions || 'none'}) in recommendations.
4. ETHICAL & POLITICAL BRAND TRACKING: If a scan or message mentions brands, check if they cross ethical lines. Mention political flags if present in the context. Be factual and supportive of the user's choices.
5. CALORIE INTELLIGENCE: You know the user has consumed ${totalCaloriesToday} kcal today out of a ${calorieGoal} kcal goal. Use this in advice.
6. MULTIMODAL: If given an image, provide expert food/product analysis. If given a voice transcript, respond to it naturally.
7. BE ARTICULATE: Give specific, personalized, data-driven answers. Be concise but thorough. Focus on answering the user's specific query with data from their history.
8. LANGUAGE MANDATE: Auto-detect the user's language. If they write in Arabic or Urdu, you MUST respond in that EXACT language using professional and warm tones. If English, standard professional English applies. You are fluent in ARABIC, URDU, and ENGLISH.
9. ACCURACY & HALLUCINATION PREVENTION: If you do not have data for a specific question, be honest. Do not make up nutritional values or medical history.

RESPONSE FORMAT: Respond directly with your detailed markdown message. Do NOT wrap it in a JSON object.
Use markdown formatting (bolding, lists) for clarity. The reply should be conversational and warm.`;

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
        let content = record.content || '';
        const scanCtx = record.metadata?.scannedProductContext;
        let ctxSummary = '';

        if (scanCtx) {
            ctxSummary = `[Context for Health Coach: User scanned ${scanCtx.productName || scanCtx.name}. ` +
                `Macros: ${scanCtx.calories}kcal, P:${scanCtx.protein}g, C:${scanCtx.carbs}g, F:${scanCtx.fat}g. ` +
                `Budget: ${scanCtx.price || 'Unknown'} (Budget: ${onboarding.budget || 'Not set'}). ` +
                `Political/Ethical: ${scanCtx.political_warning || 'None'}]`;
            content = `${ctxSummary}\n\n${content}`;
        }

        const currentUserMsg: any = { role: 'user', content };
        if (imageUrl) {
            currentUserMsg.content = [
                { type: 'text', text: content || 'Please analyze this image.' },
                { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
            ];
        } else if (msgType === 'voice' && transcribedText) {
            currentUserMsg.content = `[Voice message]: ${transcribedText}${ctxSummary ? `\n\n${ctxSummary}` : ''}`;
        }

        // Replace last message if it's the same as current user message
        const chatWithCurrent = chatContext.filter((m: any, i: number) =>
            !(i === chatContext.length - 1 && m.role === 'user' && m.content === record.content)
        );
        chatWithCurrent.push(currentUserMsg);

        // ── 5. IDEMPOTENCY CHECK ──
        // Check if we've already replied to this exact message record
        const { data: existingReply } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('sender_id', COACH_ID)
            .gt('created_at', record.created_at)
            .limit(1)
            .maybeSingle();

        if (existingReply) {
            console.log(`[Coach] Already replied to message ${record.id}, skipping.`);
            return new Response(JSON.stringify({ message: "Already replied", id: existingReply.id }), { headers: corsHeaders });
        }

        // ── 6. CREATE DB ROW FOR STREAMING UPDATE ──
        const { data: newMsg, error: insertErr } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: COACH_ID,
            content: '', // Empty initially
            message_type: 'text',
            is_read: false,
            metadata: { replying_to: record.id }
        }).select().single();

        if (insertErr || !newMsg) {
            console.error("Placeholder creation failed:", insertErr);
            throw new Error(`Failed to create message placeholder: ${insertErr.message}`);
        }

        // ── 7. AI CALL (STREAMING) ──
        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "system", content: systemPrompt }, ...chatWithCurrent.slice(-20)],
                stream: true, // Enable streaming
                temperature: 0.7,
                max_tokens: 1500
            })
        });

        if (!openAiRes.ok) throw new Error(`OpenAI error: ${await openAiRes.text()}`);
        if (!openAiRes.body) throw new Error('No stream body from AI');

        const reader = openAiRes.body.getReader();
        const decoder = new TextDecoder("utf-8");

        let fullReply = "";
        let lastUpdateTime = Date.now();

        // Consume the stream
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;

                if (trimmed.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        const content = data.choices[0]?.delta?.content || "";
                        if (content) fullReply += content;
                    } catch (e) {
                        // Ignore parse errors on partial chunks
                    }
                }
            }

            // Rate-limit DB updates to ~2 times per second to avoid stressing Postgres
            if (Date.now() - lastUpdateTime > 500 && fullReply.length > 0) {
                lastUpdateTime = Date.now();
                // Send chunk update in background (fire and forget for intermediate chunks)
                supabase.from('messages').update({ content: fullReply }).eq('id', newMsg.id).then();
            }
        }

        if (!fullReply) {
            fullReply = "I apologize, but I encountered a technical glitch while thinking. Could you please try asking that again? I'm ready to help!";
        }

        // ── 8. FINAL SAVE ──
        await supabase.from('messages').update({ 
            content: fullReply,
            delivered_at: new Date().toISOString()
        }).eq('id', newMsg.id);

        // Update conversation last message
        await supabase.from('conversations').update({
            last_message_at: new Date().toISOString(),
            last_message_content: fullReply.substring(0, 200),
            last_message_type: 'text',
            last_message_sender_id: COACH_ID
        } as any).eq('id', conversationId);

        return new Response(JSON.stringify({ success: true, message_id: newMsg.id }), { headers: corsHeaders });

    } catch (err: any) {
        console.error("Coach Reply Error:", err.message);
        // Return a structured error response that the client can optionally display
        return new Response(JSON.stringify({ 
            error: true, 
            message: err.message,
            actionable_feedback: "The AI Coach is momentarily overwhelmed. Re-sending your message might help."
        }), { status: 200, headers: corsHeaders });
    }
});
