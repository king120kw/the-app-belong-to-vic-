import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractMediaUrl(record: any): string | null {
    if (record.metadata && typeof record.metadata === 'object' && record.metadata.url) {
        return String(record.metadata.url);
    }
    if (record.metadata && typeof record.metadata === 'string' && record.metadata.startsWith('http')) {
        return record.metadata;
    }
    if (record.content && typeof record.content === 'string' && record.content.startsWith('http')) {
        return record.content;
    }
    return null;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const payload = await req.json();
        console.log("Receiving payload:", JSON.stringify(payload).substring(0, 500));

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

        // 1. Check conversation
        const { data: conv } = await supabase.from('conversations').select('conversation_type').eq('id', conversationId).single();
        if (conv?.conversation_type !== 'ai') return new Response(JSON.stringify({ message: "Not AI" }), { headers: corsHeaders });

        // 2. Find Human
        const { data: parts } = await supabase.from('conversation_participants').select('user_id').eq('conversation_id', conversationId);
        const userId = parts?.find(p => p.user_id !== COACH_ID)?.user_id;
        if (!userId) return new Response(JSON.stringify({ message: "No human" }), { headers: corsHeaders });

        console.log("Processing for user:", userId);

        // 3. Context gathering
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString();

        const [onboarding, profile, food, budget, progress, messages] = await Promise.all([
            supabase.from('onboarding_responses').select('goal, dietary_lifestyle, daily_calorie_goal').eq('user_id', userId).maybeSingle(),
            supabase.from('user_profiles').select('first_name, last_name').eq('id', userId).maybeSingle(),
            supabase.from('food_analysis_history').select('food_item_id, calories_consumed, meal_type, analyzed_at').eq('user_id', userId).gte('analyzed_at', startDate).limit(10),
            supabase.from('budget_transactions').select('amount, description, transaction_date').eq('user_id', userId).gte('transaction_date', startDate).limit(10),
            supabase.from('progress_measurements').select('weight, measurement_date').eq('user_id', userId).limit(5),
            supabase.from('messages').select('content, sender_id, message_type').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(8)
        ]);

        // 4. Multimodal Logic
        const messageType = record.message_type as string;
        let transcribedText = "";
        let imageUrl: string | null = null;

        if (messageType === 'voice') {
            const voiceUrl = extractMediaUrl(record);
            if (voiceUrl) {
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
                        transcribedText = tData.text || "";
                    }
                }
            }
        } else if (messageType === 'image') {
            imageUrl = extractMediaUrl(record);
        }

        // 5. Prompt Construction
        const userName = `${profile.data?.first_name || ''} ${profile.data?.last_name || ''}`.trim() || 'User';
        const userGoal = onboarding.data?.goal || 'General Health';

        const history = (messages.data || []).reverse().map((m: any) =>
            `${m.sender_id === COACH_ID ? 'Coach' : 'User'}: ${m.content || '[' + m.message_type + ']'}`
        ).join('\n');

        const systemPrompt = `You are an AI Health Coach for ${userName}. 
User Goal: ${userGoal}
Recent Food: ${JSON.stringify(food.data || [])}
Recent Budget: ${JSON.stringify(budget.data || [])}
Recent Weight: ${JSON.stringify(progress.data || [])}
History:
${history}

Last Message: ${messageType === 'voice' ? transcribedText : record.content}
Image attached: ${imageUrl ? 'YES' : 'NO'}

Respond as JSON: {"reply": "..."}`;

        const aiMsgs: any[] = [{ role: "user", content: [{ type: "text", text: systemPrompt }] }];
        if (imageUrl) aiMsgs[0].content.push({ type: "image_url", image_url: { url: imageUrl } });

        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "system", content: "Always respond with JSON {\"reply\": \"...\"}" }, ...aiMsgs],
                response_format: { type: "json_object" }
            })
        });

        if (!openAiRes.ok) throw new Error(`OpenAI error: ${openAiRes.status}`);
        const aiData = await openAiRes.json();
        const reply = JSON.parse(aiData.choices[0].message.content).reply;

        await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: COACH_ID,
            content: reply,
            message_type: 'text'
        });

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } catch (err: any) {
        console.error("FATAL ERROR:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
    }
});
