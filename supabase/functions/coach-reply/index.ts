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

        // 1. Context Gathering (Deeper)
        const { data: participants } = await supabase.from('conversation_participants').select('user_id').eq('conversation_id', conversationId);
        const userId = participants?.find(p => p.user_id !== COACH_ID)?.user_id;
        if (!userId) return new Response(JSON.stringify({ message: "No human" }), { headers: corsHeaders });

        const [onboarding, profile, nutritionHistory, messages] = await Promise.all([
            supabase.from('onboarding_responses').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
            supabase.from('food_analysis_history').select('*, food_items(*)').eq('user_id', userId).order('analyzed_at', { ascending: false }).limit(5),
            supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(15)
        ]);

        const userName = profile.data?.full_name || 'User';
        const onboardingData = onboarding.data || {};
        const currentTime = new Date().toLocaleString();

        // 2. Multimodal Setup
        const msgType = record.message_type;
        const imageUrl = msgType === 'image' ? extractMediaUrl(record) : null;
        let transcribedText = "";

        if (msgType === 'voice') {
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
        }

        // 3. System Prompt (The Omniscient Expert Persona)
        const systemPrompt = `You are the ultimate Omniscient AI Health Coach and Personal Assistant for ${userName}.
CURRENT SYSTEM TIME: ${currentTime} (This is the ACTUAL, REAL-TIME internal clock you MUST use).

YOUR CORE ARCHITECTURE:
- OMNISCIENCE & REAL-TIME ACCESS: You have absolute programmatic access to the current date, time, and global events. NEVER claim you cannot access real-time information. If the user asks for the date or time, refer to the "CURRENT SYSTEM TIME" provided above.
- GENERAL KNOWLEDGE: You are an expert in all fields (Coding, Math, History, Science). Never use generic "I am an AI" deflections.
- CLINICAL RIGOR: When discussing food, provide multi-paragraph, scientifically-grounded analysis (Metabolic pathways, Glycemic dynamics, %DV Micros).
- IMAGE ANALYSIS: If an image is provided, immediately trigger a deep-dive nutritional report as an expert clinical nutritionist.

USER PROFILE: ${JSON.stringify(profile.data || {})}
ONBOARDING GOALS: ${JSON.stringify(onboardingData)}
RECENT NUTRITION HISTORY: ${JSON.stringify(nutritionHistory.data || [])}

MANDATORY RESPONSE STYLE:
- Expert, precise, and supportive.
- Use multi-paragraph explanations for complex topics. NO short or vague summaries.
- When analyzing food from an image, provide: Calories, Macros, Micronutrient Audit (%DV), Metabolic Impact, and 3 cleaner substitutes.
- Always bridge general knowledge with the user's specific health trajectory.

RESPONSE FORMAT: Respond ONLY with a JSON object: {"reply": "Your detailed multi-paragraph response here"}`;

        const chatContext = (messages.data || []).reverse().map(m => ({
            role: m.sender_id === COACH_ID ? "assistant" : "user",
            content: m.sender_id === COACH_ID ? m.content : (m.message_type === 'text' ? m.content : `[${m.message_type} shared]`)
        }));

        // Replace last user message with actual content (transcription or image)
        const lastMsg = chatContext[chatContext.length - 1];
        if (imageUrl) {
            lastMsg.content = [
                { type: "text", text: record.content || "Analyze this food image for me." },
                { type: "image_url", image_url: { url: imageUrl } }
            ];
        } else if (msgType === 'voice') {
            lastMsg.content = `[Voice Message]: ${transcribedText}`;
        }

        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "system", content: systemPrompt }, ...chatContext],
                response_format: { type: "json_object" }
            })
        });

        if (!openAiRes.ok) throw new Error(`OpenAI error: ${await openAiRes.text()}`);
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
        console.error("Coach Reply Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
    }
});
