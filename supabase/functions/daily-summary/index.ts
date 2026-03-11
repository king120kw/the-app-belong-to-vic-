import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { userId } = await req.json();
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const today = new Date().toISOString().split('T')[0];

        // 1. Fetch Today's Data
        const [{ data: progress }, { data: mealHistory }, { data: onboarding }] = await Promise.all([
            supabase.from('daily_progress').select('*').eq('user_id', userId).eq('progress_date', today).maybeSingle(),
            supabase.from('food_analysis_history').select('*, food_items(*)').eq('user_id', userId).gte('analyzed_at', today),
            supabase.from('onboarding_responses').select('*').eq('user_id', userId).maybeSingle()
        ]);

        if (!progress) return new Response(JSON.stringify({ message: "No progress found for today" }), { headers: corsHeaders });

        // 2. AI Summary Generation
        const prompt = `You are a helpful and professional Health Coach. 
Generate a concise, encouraging end-of-day summary for the user.
Today's Stats: ${progress.calories_consumed}/${progress.calories_goal} kcal.
Meals: ${mealHistory?.map(m => m.food_items?.name).join(', ')}.
User Goal: ${onboarding?.goal}.

Instructions:
1. Praise their progress.
2. If they were over/under budget or calories, offer a supportive tip.
3. Keep it to 3-4 sentences.
4. Tone: Friendly, scientific, and encouraging.`;

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }]
            }),
        });

        const aiData = await aiRes.json();
        const summary = aiData.choices[0].message.content;

        // 3. Send to Chat (AI/System Message)
        const { data: convs } = await supabase
            .from('conversations')
            .select('id')
            .eq('conversation_type', 'ai')
            .limit(1);

        if (convs && convs.length > 0) {
            await supabase.from('messages').insert({
                conversation_id: convs[0].id,
                sender_id: '00000000-0000-0000-0000-000000000000',
                message_type: 'system',
                content: `🌙 DAILY SUMMARY: ${summary}`,
                metadata: { type: 'daily_summary', date: today, stats: progress }
            });
        }

        return new Response(JSON.stringify({ summary }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
