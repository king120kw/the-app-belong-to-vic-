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
        const { barcode, apiKey: clientApiKey, userId } = await req.json();

        if (!barcode) {
            throw new Error("Barcode is required");
        }

        console.log(`Scanning barcode: ${barcode} for user: ${userId}`);

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        let currentBalance = 0;
        let onboardingData = null;

        if (userId) {
            const { data: budget } = await supabase
                .from('user_budgets')
                .select('current_balance')
                .eq('user_id', userId)
                .single();
            currentBalance = budget?.current_balance || 0;

            const { data: onboarding } = await supabase
                .from('onboarding_responses')
                .select('*')
                .eq('user_id', userId)
                .single();
            onboardingData = onboarding;
        }

        // 1. Dual API Lookup (Open Food Facts + Nutritionix fallback)
        const [offResponse, nxResponse] = await Promise.all([
            fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`),
            fetch(`https://trackapi.nutritionix.com/v2/search/item?upc=${barcode}`, {
                headers: {
                    'x-app-id': Deno.env.get('NUTRITIONIX_APP_ID') || '',
                    'x-app-key': Deno.env.get('NUTRITIONIX_API_KEY') || ''
                }
            }).catch(() => null)
        ]);

        const offData = await offResponse.json();
        const nxData = nxResponse?.ok ? await nxResponse.json() : null;

        if (offData.status === 0 && !nxData) {
            return new Response(JSON.stringify({ found: false, message: "Product not found across databases" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const product = offData.product || (nxData?.foods ? nxData.foods[0] : {});
        const estimatedPrice = 5; // Simulating price check

        // 2. AI Intelligence for Budget & Goal Alignment
        const apiKey = clientApiKey || Deno.env.get('OPENAI_API_KEY');
        let aiAnalysis = {};

        if (apiKey) {
            const prompt = `Analyze this scanned product for the VicCalary app using clinical precision.
Product: ${product.product_name || product.food_name}
Nutrients: ${JSON.stringify(product.nutriments || product)}
User Balance: $${currentBalance}
User Goal: ${onboardingData?.goal || 'General Health'}

TASKS:
1. CLINICAL EVALUATION: Reference exact label values to assess ingredient quality (processing level, additives, preservatives, sugar types).
2. MACRO BALANCE: Evaluate the macronutrient ratio relative to the user's goal (${onboardingData?.goal || 'General Health'}).
3. FINANCIAL IMPACT: Is this product a good $${currentBalance} investment?
4. SUBSTITUTIONS: Provide 2 structured alternatives with improved macro ratios, lower sugars, or cleaner lists. Format as "Product Name: Reason".

STRICT JSON OUTPUT:
{
  "insight": "1 sentence clinical summary",
  "clinical_synopsis": "A detailed clinical explanation (4-6 sentences) of the product's quality, nutritional gaps, and impact on goals.",
  "ingredient_quality": "string",
  "macro_balance_evaluation": "string",
  "health_impact_rationale": "string",
  "financialImpact": "LOW" | "MODERATE" | "HIGH",
  "financialAdvice": "string",
  "alternatives": ["string"],
  "health_impact_score": number (1-10),
  "healthRating": number (1-10)
}
`;

            const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                }),
            });

            if (aiRes.ok) {
                const aiData = await aiRes.json();
                aiAnalysis = JSON.parse(aiData.choices[0].message.content);
            }
        }

        const result = {
            found: true,
            name: product.product_name || product.food_name,
            brand: product.brands || product.brand_name,
            image: product.image_url || product.photo?.thumb,
            calories: product.nutriments?.['energy-kcal_100g'] || product.nf_calories || 0,
            protein: product.nutriments?.['proteins_100g'] || product.nf_protein || 0,
            carbs: product.nutriments?.['carbohydrates_100g'] || product.nf_total_carbohydrate || 0,
            fat: product.nutriments?.['fat_100g'] || product.nf_total_fat || 0,
            serving_size: product.serving_size || product.nf_serving_size_unit,
            allergens: product.allergens_from_ingredients,
            country_of_origin: product.countries || "Global",
            ...aiAnalysis,
            currentBalance
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
