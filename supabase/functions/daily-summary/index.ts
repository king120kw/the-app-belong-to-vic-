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
        const { userId } = await req.json();

        if (!userId) {
            throw new Error("User ID is required");
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const today = new Date().toISOString().split('T')[0];

        // 1. Fetch daily progress
        const { data: progress } = await supabase
            .from('daily_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('progress_date', today)
            .single();

        // 2. Fetch food history for today
        const { data: history } = await supabase
            .from('food_analysis_history')
            .select(`
                *,
                food_items (*)
            `)
            .eq('user_id', userId)
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`);

        // 3. Fetch budget
        const { data: budget } = await supabase
            .from('user_budgets')
            .select('*')
            .eq('user_id', userId)
            .single();

        // 4. Fetch onboarding context
        const { data: onboarding } = await supabase
            .from('onboarding_responses')
            .select('*')
            .eq('user_id', userId)
            .single();

        // 5. Generate AI Summary
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        const COACH_ID = '00000000-0000-0000-0000-000000000001';
        let conversationId = null;
        let summary = "I haven't seen any logs from you today yet. Keep tracking your meals and budget!";

        if (apiKey && (progress || history?.length > 0)) {
            const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: "You are Health Coach, a high-performance health and financial coach. Your tone is professional, encouraging, but direct. You help users stay on track with their calories and their grocery budget."
                        },
                        {
                            role: "user",
                            content: `Analyze my performance for today (${today}).
                            
                            GOALS:
                            Daily Calorie Goal: ${onboarding?.daily_calorie_goal || 2000} kcal
                            Current Consumed: ${progress?.calories_consumed || 0} kcal
                            Meals Logged: ${progress?.meals_logged || 0}
                            
                            FINANCIALS:
                            Monthly Budget: $${budget?.monthly_limit || 0}
                            Current Balance: $${budget?.current_balance || 0}
                            
                            MEALS LOGGED:
                            ${history?.map(h => `- ${h.food_items.name} (${h.calories_consumed} kcal)`).join('\n') || 'No meals logged yet.'}
                            
                            TASK:
                            Provide a concise 2-3 sentence summary of my day. If I'm over calories, give a specific tip. If my budget is low, warn me. End with a motivational one-liner.`
                        }
                    ],
                    max_tokens: 300,
                }),
            });

            if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                summary = aiData.choices[0]?.message?.content || summary;

                // 6. Post to Chat - Use RPC to ensure we target the CORRECT 'ai' conversation
                const { data: systemConvs, error: rpcError } = await supabase.rpc('provision_user_system_chats', { p_user_id: userId });

                if (rpcError) {
                    console.error("RPC Error provisioning chats:", rpcError);
                    throw rpcError;
                }

                conversationId = systemConvs.coach_conversation_id;

                // Insert the summary message
                if (conversationId) {
                    await supabase.from('messages').insert({
                        conversation_id: conversationId,
                        sender_id: COACH_ID,
                        content: `📊 **Daily Briefing** (${today})\n\n${summary}`,
                        message_type: 'text'
                    });
                }
            }
        }

        return new Response(JSON.stringify({
            status: "ok",
            message: "Daily briefing sent to chat"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
