import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { imageUrl, imageBase64, apiKey: clientApiKey, userId } = body;

        if (!imageUrl && !imageBase64) {
            throw new Error("Image URL or base64 data is required");
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        let profileContext = "USER PROFILE: General healthy adult. No specific dietary restrictions on file.";
        let userGoalSummary = "maintain a healthy lifestyle";
        let userRestrictions = "none known";

        if (userId) {
            const { data: onboarding } = await supabase
                .from('onboarding_responses')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (onboarding) {
                const goal = onboarding.goal || 'maintain a healthy lifestyle';
                const restrictions = (onboarding.dietary_lifestyle || []).join(', ') || 'none';
                const medical = onboarding.medical_conditions || 'None reported';
                const health = onboarding.health_conditions || 'None reported';
                const calorieTarget = onboarding.daily_calorie_goal || 2000;
                userGoalSummary = goal;
                userRestrictions = restrictions;

                profileContext = `USER PROFILE & CONSTRAINTS:
- PRIMARY GOAL: ${goal}
- DIETARY LIFESTYLE / RESTRICTIONS: ${restrictions}
- MEDICAL CONDITIONS: ${medical}
- HEALTH CONCERNS: ${health}
- DAILY CALORIE TARGET: ${calorieTarget} kcal/day
- ASSESSMENT RULE: Based on the above profile, explicitly state whether this meal is GOOD, MODERATE, or POOR for this user and why.`;
            }
        }

        const aiPrompt = `You are a world-class Clinical Nutritional AI and Certified Food Scientist with deep expertise in food composition databases (USDA, NCCDB, Atwater).

Analyze the provided food image with extreme precision.

${profileContext}

LOCATION CONTEXT: ${JSON.stringify(body.locationContext || {})}

━━━━━━━━━━━━━━━━━━━━━━━━━
PART 1 — NARRATIVE REPORT (mandatory style)
━━━━━━━━━━━━━━━━━━━━━━━━━
Write a detailed nutritional report in professional paragraph form — NOT bullet points or lists.

NARRATIVE SECTIONS:
• description: EXACTLY 3 full paragraphs (minimum 80 words each):
   - Para 1: Identify the dish, its main visible ingredients, and overall character/presentation.
   - Para 2: How the ingredients synergize nutritionally, how they support energy, satiety, and health.
   - Para 3: Overall assessment — who benefits from this meal, when to eat it, and its lifestyle fit.

• vitamins_and_nutrition: EXACTLY 3-4 full paragraphs (minimum 60 words each), one paragraph per main ingredient, covering specific vitamins (A, B-complex, C, D, E, K), minerals (iron, zinc, magnesium, potassium, calcium), and their systemic health benefits (immune support, heart health, muscle function, etc.).

• recommended_pairings: EXACTLY 2-3 full paragraphs suggesting specific nutritional enhancements (lemon juice, seeds, herbs, fermented foods, beverages) and explaining WHY each one improves the dish nutritionally and in flavor.

• recommendation: ONE sentence tailored to the user's goal (${userGoalSummary}) and restrictions (${userRestrictions}).

━━━━━━━━━━━━━━━━━━━━━━━━━
PART 2 — CALORIE & MACRO CALCULATION (mission-critical accuracy required)
━━━━━━━━━━━━━━━━━━━━━━━━━
Using USDA food composition data and visual portion estimation:
1. Identify each visible ingredient and estimate its portion weight (grams).
2. Look up its nutritional values per 100g.
3. Calculate total calories (kcal), protein (g), carbohydrates (g), fat (g), sugar (g), fiber (g) for the FULL MEAL.

CRITICAL RULES:
- DO NOT use generic round numbers like 500 or 520 kcal.
- DO NOT copy example values from the prompt. All numbers MUST be calculated from the actual food visible.
- Calorie estimates must vary based on actual food: a salad ≈ 150-350 kcal, rice bowl ≈ 500-750 kcal, burger ≈ 700-1200 kcal, smoothie ≈ 200-450 kcal.
- All macros must be nutritionally consistent (e.g., fat calories + protein calories + carb calories ≈ total calories).

━━━━━━━━━━━━━━━━━━━━━━━━━
PART 3 — PROFILE ALIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━
Based on the user's profile above:
- verdict: "GOOD" if the meal strongly supports their goals, "MODERATE" if neutral/mixed, "POOR" if it conflicts with their restrictions or health conditions.
- user_alignment_boolean: true only if the meal genuinely aligns with the user's stated goal and restrictions.
- is_compliant: true if meal respects all stated dietary restrictions.

ACCURACY RULES (universal):
- Only identify ingredients CLEARLY VISIBLE in the image — do NOT hallucinate.
- All narrative sections must be full paragraphs with NO bullet points.
- Separate all paragraphs within each field using \\n\\n.
- DO NOT output pricing, political warnings, or brand data (these are for the product scanner only).

━━━━━━━━━━━━━━━━━━━━━━━━━
JSON OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "name": "Exact meal name based on what you see",
  "description": "paragraph1\\n\\nparagraph2\\n\\nparagraph3",
  "vitamins_and_nutrition": "ingredient1 paragraph\\n\\ningredient2 paragraph\\n\\ningredient3 paragraph\\n\\nsummary paragraph",
  "recommended_pairings": "first enhancement paragraph\\n\\nsecond enhancement paragraph\\n\\nthird enhancement paragraph",
  "recommendation": "Single sentence personalized to the user's profile",
  "verdict": "GOOD or MODERATE or POOR",
  "user_alignment_boolean": true,
  "calories": 487,
  "protein": 31,
  "carbs": 52,
  "fat": 18,
  "sugar": 6,
  "fiber": 7,
  "is_compliant": true
}

REMINDER: Calculate real values from the actual food in the image. Every meal has a different caloric density. Portion size matters — a large plate has more calories than a small bowl. Adjust accordingly.`;

        const apiKey = clientApiKey || Deno.env.get('OPENAI_API_KEY');

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
                            { type: "text", text: aiPrompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageBase64
                                        ? `data:image/jpeg;base64,${imageBase64}`
                                        : imageUrl,
                                    detail: "high"
                                }
                            },
                        ],
                    },
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "food_analysis",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                description: { type: "string" },
                                vitamins_and_nutrition: { type: "string" },
                                recommended_pairings: { type: "string" },
                                recommendation: { type: "string" },
                                verdict: { type: "string", enum: ["GOOD", "MODERATE", "POOR"] },
                                user_alignment_boolean: { type: "boolean" },
                                calories: { type: "number" },
                                protein: { type: "number" },
                                carbs: { type: "number" },
                                fat: { type: "number" },
                                sugar: { type: "number" },
                                fiber: { type: "number" },
                                is_compliant: { type: "boolean" }
                            },
                            required: [
                                "name", "description", "vitamins_and_nutrition", "recommended_pairings",
                                "recommendation", "verdict", "user_alignment_boolean", "calories", "protein",
                                "carbs", "fat", "sugar", "fiber", "is_compliant"
                            ],
                            additionalProperties: false
                        }
                    }
                }
            }),
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            throw new Error(`OpenAI error: ${errText}`);
        }

        const aiResult = await aiResponse.json();
        const parsed = JSON.parse(aiResult.choices[0].message.content);

        return new Response(JSON.stringify({ ...parsed, healthStatus: parsed.verdict }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error in food-analysis:", message);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
