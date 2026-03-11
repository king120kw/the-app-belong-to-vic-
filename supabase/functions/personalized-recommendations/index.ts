import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { userId, apiKey: clientApiKey } = await req.json();
        if (!userId) throw new Error("User ID is required");

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const [profile, onboarding] = await Promise.all([
            supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
            supabase.from('onboarding_responses').select('*').eq('user_id', userId).maybeSingle()
        ]);

        const apiKey = clientApiKey || Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error("OPENAI_API_KEY not set");

        const prompt = `You are a PhD Clinical Nutritionist and Michelin-star healthy chef.
User: ${profile.data?.full_name || 'User'}
Goal: ${onboarding.data?.goal || 'General Health'}
Lifestyle: ${onboarding.data?.dietary_lifestyle || 'Balanced'}

TASKS:
1. Suggest 3 elite, personalized recipes that specifically target the user's goal.
2. For each recipe, provide a "Clinical Justification" (2-3 sentences) explaining the biochemical advantage of the chosen ingredients.
3. Include precise macro counts.

STRICT JSON OUTPUT:
{
  "suggestions": [
    {
      "name": "string",
      "description": "string",
      "clinical_justification": "string",
      "calories": number,
      "carbs": number,
      "protein": number,
      "fat": number,
      "prepTime": "string",
      "difficulty": "Easy" | "Medium" | "Hard"
    }
  ]
}
`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) throw new Error(`OpenAI error: ${await response.text()}`);
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Recommendations Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders });
    }
});
