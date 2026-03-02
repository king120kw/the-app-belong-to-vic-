import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        const { record, type, table } = payload;

        // Health Coach ID
        const COACH_ID = '00000000-0000-0000-0000-000000000001';

        // Ignore messages from the coach themselves or non-insert events
        if (type !== 'INSERT' || table !== 'messages' || record.sender_id === COACH_ID) {
            return new Response(JSON.stringify({ message: "Ignored event" }), { headers: corsHeaders });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const conversationId = record.conversation_id;

        // 1. Fetch conversation details to check type
        const { data: conversation } = await supabase
            .from('conversations')
            .select('conversation_type')
            .eq('id', conversationId)
            .single();

        // ONLY reply to AI conversations
        if (conversation?.conversation_type !== 'ai') {
            return new Response(JSON.stringify({ message: "Not an AI conversation" }), { headers: corsHeaders });
        }

        // 2. Fetch participants and identify the user
        const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId);

        const userId = participants?.find(p => p.user_id !== COACH_ID)?.user_id;
        if (!userId) {
            return new Response(JSON.stringify({ message: "No user participant found" }), { headers: corsHeaders });
        }

        // 2. Fetch 7-Day Context
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString();

        const [onboarding, foodHistory, budgetHistory, measurements, recentMessages] = await Promise.all([
            supabase.from('onboarding_responses').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('food_analysis_history').select('*').eq('user_id', userId).gte('analyzed_at', startDate).limit(10),
            supabase.from('budget_transactions').select('*').eq('user_id', userId).gte('transaction_date', startDate).limit(10),
            supabase.from('progress_measurements').select('*').eq('user_id', userId).gte('measurement_date', startDate.split('T')[0]).limit(10),
            supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(6)
        ]);

        // 3. Multimodal Handling (Vision & Voice)
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error("OPENAI_API_KEY not set");

        let transcribedText = "";
        let imageUrl: string | null = null;

        if (record.message_type === 'voice') {
            console.log("Transcribing voice message...");
            try {
                // Media URL is typically in record.metadata (from internal RPC/client) 
                // but we check record.content as fallback.
                const voiceUrl = record.metadata || record.content;

                if (!voiceUrl || !voiceUrl.startsWith('http')) {
                    throw new Error("Invalid voice URL: " + voiceUrl);
                }

                const audioResponse = await fetch(voiceUrl);
                const audioBlob = await audioResponse.blob();

                const formData = new FormData();
                formData.append('file', audioBlob, 'voice.m4a');
                formData.append('model', 'whisper-1');

                const transcriptionRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${apiKey}` },
                    body: formData
                });

                if (transcriptionRes.ok) {
                    const transData = await transcriptionRes.json();
                    transcribedText = transData.text;
                    console.log("Transcribed:", transcribedText);
                } else {
                    console.error("Whisper Error:", await transcriptionRes.text());
                    transcribedText = "[Voice message - transcription failed]";
                }
            } catch (err) {
                console.error("Transcription fetch error:", err);
                transcribedText = "[Voice message - could not fetch audio]";
            }
        } else if (record.message_type === 'image') {
            imageUrl = record.metadata || record.content;
            console.log("Image received:", imageUrl);
        }

        // 4. Generate Contextual AI Reply using OpenAI
        const now = new Date();
        const currentDateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const currentTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const prompt = `You are a professional AI Health Coach.
CURRENT DATE/TIME: ${currentDateStr} at ${currentTimeStr}

USER PROFILE: ${JSON.stringify(onboarding.data || {})}
FOOD LOGS (7 DAYS): ${JSON.stringify(foodHistory.data || [])}
BUDGET LOGS (7 DAYS): ${JSON.stringify(budgetHistory.data || [])}
PROGRESS LOGS (7 DAYS): ${JSON.stringify(measurements.data || [])}

STRICT INSTRUCTIONS:
1. GROUNDING: Only reference data explicitly provided in the LOGS above. If a log is empty, do not guess or exaggerate. 
2. ACCURACY: Today is ${currentDateStr}. When discussing trends, be chronologically accurate.
3. NO HALLUCINATION: If the user asks about something not in the logs (e.g., "What did I eat yesterday?" when logs are empty), state that you don't see that data yet and suggest they log it.
4. NO EXAGGERATION: Do not use hyperbolic language. Be direct, professional, and evidence-based.
5. MULTIMODAL: The user may have sent an image (screenshot/photo) or a voice message. If so, analyze the visual or audio content provided in their latest message.

Recent Conversation:
${recentMessages.data?.reverse().map(m => `${m.sender_id === COACH_ID ? 'Health Coach' : 'User'}: ${m.content}`).join('\n')}

User's Latest Message: "${record.message_type === 'voice' ? transcribedText : record.content}" ${imageUrl ? '[Attached Image]' : ''}

Response Requirement:
- Be concise but thorough enough to be accurate (no strict sentence limit, but keep it brief).
- Maintain a supportive, coaching tone.
- Output MUST be a valid JSON object: {"reply": "..."}`;

        // Prepare multimodal messages
        const messages: any[] = [
            {
                role: "user",
                content: [
                    { type: "text", text: prompt }
                ]
            }
        ];

        if (imageUrl) {
            (messages[0].content as any[]).push({
                type: "image_url",
                image_url: { url: imageUrl }
            });
        }

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: messages,
                response_format: { type: "json_object" },
                max_tokens: 400,
                temperature: 0.2,
            }),
        });

        if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            let rawContent = aiData.choices[0]?.message?.content || '';

            // gpt-4o returns json_object with {"reply": "..."}  — parse it
            let reply = rawContent;
            try {
                const parsed = JSON.parse(rawContent);
                reply = parsed.reply || parsed.message || parsed.content || rawContent;
            } catch {
                // If it's not JSON, use raw content as-is
            }

            // Insert the coach's message back into the conversation
            const { error: insertErr } = await supabase.from('messages').insert({
                conversation_id: conversationId,
                sender_id: COACH_ID,
                content: reply,
                message_type: 'text',
                read_at: new Date().toISOString() // AI reads everything immediately
            });

            if (insertErr) console.error("Error inserting coach reply:", insertErr);
        } else {
            const errorText = await aiResponse.text();
            console.error("OpenAI API Error:", errorText);
        }

        return new Response(JSON.stringify({ status: "ok" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Critical Coach Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
