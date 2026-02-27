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
        const { userId, year, month, apiKey: clientApiKey } = await req.json();

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Fetch 30 Days of Data
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0).toISOString();

        const [progressRes, budgetRes, profileRes] = await Promise.all([
            supabase.from('daily_progress').select('*').eq('user_id', userId).gte('progress_date', startDate).lte('progress_date', endDate),
            supabase.from('budget_transactions').select('*').eq('user_id', userId).gte('created_at', startDate).lte('created_at', endDate),
            supabase.from('user_profiles').select('*').eq('id', userId).single()
        ]);

        const apiKey = clientApiKey || Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error("OPENAI_API_KEY not configured.");

        const prompt = `Perform a high-level longitudinal health and financial analysis for the user.
Month: ${month}/${year}
User Goals: ${profileRes.data?.full_name}'s daily targets.
Daily Metrics (30 days): ${JSON.stringify(progressRes.data)}
Spending Data: ${JSON.stringify(budgetRes.data)}

TASKS:
1. TREND ANALYSIS: Evaluate calorie consistency and goal adherence %.
2. FINANCIAL EFFICIENCY: Analyze spending patterns vs. nutritional ROI.
3. PREDICTIVE ADVICE: What should they change next month to hit their goals?

STRICT JSON OUTPUT:
{
    "summary": "Deep analytical reflection",
    "insights": ["Nutritional trend", "Financial efficiency", "Behavioral pattern"],
    "adherencePercentage": number,
    "spendingEfficiency": "EXCELLENT" | "GOOD" | "POOR",
    "tips": ["Concrete tip 1", "Concrete tip 2"],
    "trend": "improving" | "maintaining" | "struggling"
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

        if (!response.ok) throw new Error(`OpenAI failed: ${await response.text()}`);

        const data = await response.json();
        const parsed = JSON.parse(data.choices[0]?.message?.content || "{}");

        // 4. Store the report for future reference
        await supabase.from('monthly_reports').upsert({
            user_id: userId,
            report_year: year,
            report_month: month,
            ...parsed
        });

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
