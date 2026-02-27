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
        const { userId, apiKey: clientApiKey } = await req.json();

        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch user context
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        const { data: onboarding } = await supabase
            .from('onboarding_responses')
            .select('*')
            .eq('user_id', userId)
            .single();

        const apiKey = clientApiKey || Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error("OPENAI_API_KEY not set in Edge Function secrets or request");

        const prompt = `You are a personalized chef and nutritionist.
        User Profile: ${JSON.stringify(profile)}
        Dietary Preferences: ${JSON.stringify(onboarding)}

        Suggest 3 personalized recipes based on their preferences, goals, and restrictions.
        Return ONLY valid JSON in this format:
        {
            "suggestions": [
                {
                    "name": "Recipe Name",
                    "description": "Short description",
                    "calories": 500,
                    "carbs": 20,
                    "protein": 30,
                    "fat": 15,
                    "prepTime": "20 mins"
                }
            ]
        }`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                max_tokens: 1500,
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "OpenAI API failed");
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";
        const parsed = JSON.parse(content);

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error in personalized-recommendations:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
