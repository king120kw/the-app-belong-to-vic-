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

        if (type !== 'INSERT' || table !== 'messages') {
            return new Response(JSON.stringify({ message: "Ignored event type" }), { headers: corsHeaders });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const conversationId = record.conversation_id;
        const senderId = record.sender_id;
        const COACH_ID = '00000000-0000-0000-0000-000000000001';

        // 1. Fetch participants and identify user
        const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId);

        const userId = participants?.find(p => p.user_id !== COACH_ID)?.user_id;
        if (!userId || senderId === COACH_ID) {
            return new Response(JSON.stringify({ message: "No user found or already replied" }), { headers: corsHeaders });
        }

        // 2. Fetch 7-Day Context
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString();

        const [onboarding, foodHistory, budgetHistory, measurements, recentMessages] = await Promise.all([
            supabase.from('onboarding_responses').select('*').eq('user_id', userId).single(),
            supabase.from('food_analysis_history').select('*').eq('user_id', userId).gte('created_at', startDate).limit(10),
            supabase.from('budget_transactions').select('*').eq('user_id', userId).gte('created_at', startDate).limit(10),
            supabase.from('progress_measurements').select('*').eq('user_id', userId).gte('measurement_date', startDate.split('T')[0]).limit(10),
            supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(5)
        ]);

        // 3. Generate Contextual AI Reply
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        const prompt = `You are a high-performance AI Health Coach.
User Profile: ${JSON.stringify(onboarding.data)}
Last 7 Days Food: ${JSON.stringify(foodHistory.data)}
Last 7 Days Budget: ${JSON.stringify(budgetHistory.data)}
Last 7 Days Mood/Weight: ${JSON.stringify(measurements.data)}

CONTEXT:
Provide a coaching reply that references their recent trends.
- If they've been eating well but overspending, mention it.
- If their mood has been low, be more empathetic.
- Align with their primary goal of ${onboarding.data?.goal}.

Recent Messages:
${recentMessages.data?.reverse().map(m => `${m.sender_id === COACH_ID ? 'Health Coach' : 'User'}: ${m.content}`).join('\n')}

New User Message: "${record.content}"

Reply concisely (max 3 sentences) in a direct, supportive tone.`;

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 400,
            }),
        });

        if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const reply = aiData.choices[0]?.message?.content;

            await supabase.from('messages').insert({
                conversation_id: conversationId,
                sender_id: COACH_ID,
                content: reply,
                message_type: 'text'
            });
        }

        return new Response(JSON.stringify({ status: "ok" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
