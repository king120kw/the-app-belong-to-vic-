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

        // 3. Generate Contextual AI Reply using OpenAI
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error("OPENAI_API_KEY not set");

        const prompt = `You are a high-performance AI Health Coach.
User Profile: ${JSON.stringify(onboarding.data || {})}
Last 7 Days Food: ${JSON.stringify(foodHistory.data || [])}
Last 7 Days Budget: ${JSON.stringify(budgetHistory.data || [])}
Last 7 Days Progress: ${JSON.stringify(measurements.data || [])}

CONTEXT:
Provide a coaching reply that references their recent trends.
- If they've been eating well but overspending, mention it.
- If their weight/mood has been fluctuating, be more empathetic.
- Align with their primary goal: ${onboarding.data?.goal || 'General Health'}.

Recent Messages:
${recentMessages.data?.reverse().map(m => `${m.sender_id === COACH_ID ? 'Health Coach' : 'User'}: ${m.content}`).join('\n')}

User Message: "${record.content}"

Reply concisely (max 3 sentences) in a direct, supportive, and professional tone.
Output MUST be a valid JSON object with a single key "reply" containing your message.`;

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                max_tokens: 400,
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
                message_type: 'text'
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
