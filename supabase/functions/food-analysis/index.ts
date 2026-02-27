import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { imageUrl, apiKey: clientApiKey, userId } = body;

        console.log("Analyzing image for user:", userId);

        if (!imageUrl) {
            throw new Error("Image URL is missing from request body");
        }

        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        let userGoal = "maintain a healthy lifestyle";
        let restrictions = "none";
        let dailyCalorieGoal = 2000;

        if (userId) {
            const { data: onboarding } = await supabase
                .from('onboarding_responses')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (onboarding) {
                userGoal = onboarding.goal || userGoal;
                restrictions = onboarding.dietary_restrictions || restrictions;
                dailyCalorieGoal = onboarding.daily_calorie_goal || dailyCalorieGoal;
            }
        }

        const apiKey = clientApiKey || Deno.env.get('OPENAI_API_KEY');
        const spoonacularKey = Deno.env.get('SPOONACULAR_API_KEY');

        const prompt = `You are an expert nutritional AI for the VicCalary app.
Analyze the provided image with extreme precision using GPT-4o multimodal vision.

USER CONTEXT:
- Goal: ${userGoal}
- Restrictions: ${restrictions}
- Daily Calorie Goal: ${dailyCalorieGoal} kcal

TASKS:
1. IDENTIFY: Detect the exact meal or packaged product.
2. PORTION ESTIMATION: Analyze visual cues (plates, hands, background) to estimate portion size.
3. NUTRITION: provide estimated Calories, Protein, Carbs, Fat, Fiber, and Sugar.
4. SEARCH QUERY: Provide a precise 1-3 word search query for this food.
5. DETAILS: packaging_details and country_of_origin.

STRICT JSON OUTPUT:
{
  "name": "Exact Name",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "packaging_details": "string or null",
  "portion_size_estimate": "string",
  "country_of_origin": "string or null",
  "searchQuery": "string"
}`;

        console.log("Calling OpenAI GPT-4o...");
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
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: imageUrl } },
                        ],
                    },
                ],
                response_format: { type: "json_object" },
            }),
        });

        if (!aiResponse.ok) throw new Error(`OpenAI error: ${await aiResponse.text()}`);
        const aiResult = await aiResponse.json();
        const parsed = JSON.parse(aiResult.choices[0].message.content);

        // --- SPOONACULAR INTEGRATION FOR VERIFIED DATA & HERO IMAGE ---
        let verifiedData = {};
        if (spoonacularKey) {
            try {
                const searchRes = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(parsed.searchQuery)}&number=1&apiKey=${spoonacularKey}`);
                const searchData = await searchRes.json();

                if (searchData.results && searchData.results.length > 0) {
                    const recipeId = searchData.results[0].id;
                    const infoRes = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?includeNutrition=true&apiKey=${spoonacularKey}`);
                    const info = await infoRes.json();

                    if (info.nutrition && info.nutrition.nutrients) {
                        const getNutrient = (name: string) => info.nutrition.nutrients.find((n: any) => n.name === name)?.amount;
                        verifiedData = {
                            calories: getNutrient('Calories') || parsed.calories,
                            protein: getNutrient('Protein') || parsed.protein,
                            carbs: getNutrient('Carbohydrates') || parsed.carbs,
                            fat: getNutrient('Fat') || parsed.fat,
                            heroImage: info.image
                        };
                    }
                }
            } catch (err) {
                console.warn("Spoonacular verification failed, using AI estimates:", err);
            }
        }

        const finalData = {
            ...parsed,
            ...verifiedData,
            healthRating: 8, // Simplified for this logic, will be refined by coach
            personalizedAdvice: `Based on your goal of ${userGoal}, this ${parsed.name} looks like a solid choice.`
        };

        // Map healthRating to visual status
        const healthStatus = finalData.calories > (dailyCalorieGoal * 0.4) ? 'POOR' : finalData.calories > (dailyCalorieGoal * 0.2) ? 'MODERATE' : 'GOOD';

        return new Response(JSON.stringify({
            ...finalData,
            healthStatus
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
