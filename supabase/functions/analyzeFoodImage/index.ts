import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// ─── Ethical Brand Database Logic ──────────────────────────────────────────
// Refactored to use Supabase DB 'companies' table

async function checkPoliticalAffiliation(supabase: any, brand: string): Promise<{ invest_israel: boolean; invest_uae: boolean; warning: string | null }> {
    if (!brand) return { invest_israel: false, invest_uae: false, warning: null };

    const { data: company } = await supabase
        .from('companies')
        .select('*')
        .ilike('name', `%${brand}%`)
        .maybeSingle();

    if (company && (company.invest_israel || company.invest_uae)) {
        return {
            invest_israel: company.invest_israel,
            invest_uae: company.invest_uae,
            warning: `🔴 ETHICAL ALERT: ${brand} — ${company.reason}`
        };
    }
    
    return { invest_israel: false, invest_uae: false, warning: null };
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { imageUrl, imageBase64, apiKey: clientApiKey, userId, locationContext, isProductScan } = body;

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

        // 1. Identify food item name first (Pre-analysis to enable DB lookup)
        const identificationPrompt = isProductScan 
            ? `Identify the object in this image. It may be a packaged food product, a dietary supplement, or a medication. Return ONLY a JSON object with "name", "brand", and "type" ("food", "medication", or "unknown"). Example: {"name": "Instant Noodle Cup", "brand": "Nissin", "type": "food"}`
            : `Identify the food in this image. Return ONLY a JSON object with a "name" field. Example: {"name": "Apple"}`;
        const idApiKey = clientApiKey || Deno.env.get('OPENAI_API_KEY');
        const idResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idApiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Use mini for fast identification
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: identificationPrompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : imageUrl,
                                    detail: "low"
                                }
                            },
                        ],
                    },
                ],
                response_format: { type: "json_object" }
            }),
        });

        const idData = await idResponse.json();
        const idContent = JSON.parse(idData.choices[0].message.content);
        const identifiedName = idContent.name;
        const identifiedBrand = idContent.brand || '';
        const identifiedType = idContent.type || 'food';
        console.log(`Identified product: ${identifiedName}, brand: ${identifiedBrand}, type: ${identifiedType}`);

        // 2. Query Database for Verified Nutritional Data
        const { data: verifiedFood } = await supabase
            .from('food_items')
            .select('*')
            .ilike('name', `%${identifiedName}%`)
            .order('calories', { ascending: false }) // Get the most substantial entry if multiple
            .limit(1)
            .maybeSingle();

        let dbVerifiedContext = "";
        let isHallucinated = true;

        if (verifiedFood) {
            console.log("✓ Found verified data in database.");
            isHallucinated = false;
            dbVerifiedContext = `
VERIFIED NUTRITIONAL DATA FOUND IN DATABASE:
- Calories: ${verifiedFood.calories} kcal
- Protein: ${verifiedFood.protein}g
- Carbs: ${verifiedFood.carbs}g
- Fat: ${verifiedFood.fat}g
- Fiber: ${verifiedFood.fiber}g
- Sugar: ${verifiedFood.sugar}g
- Serving Size: ${verifiedFood.serving_size} ${verifiedFood.serving_size_unit}

MANDATORY: You MUST use these exact verified numbers in your output. Do NOT estimate or hallucinate numbers when verified data is provided above.`;
        } else {
            console.log("! No verified data found. AI will estimate (flagged).");
        }

        const geoInfo = {
            country_name: locationContext?.country || 'Unknown',
            city: locationContext?.city || 'Unknown',
            currency_code: locationContext?.currency_code || 'USD',
            currency_symbol: locationContext?.currency_symbol || '$'
        };

        const currencySymbol = geoInfo.currency_symbol;
        
        let aiPrompt = "";
        let responseFormat: any = { type: "json_schema" };

        const political = await checkPoliticalAffiliation(supabase, identifiedBrand);
        const politicalWarningText = political.invest_israel
            ? (political.warning || `🔴 ETHICAL ALERT: ${identifiedBrand} has documented investments in Israeli-occupied territories.`)
            : `Company is not involved in these two countries (Israel/UAE).`;
        const isCompliantBool = !political.invest_israel;

        if (isProductScan && identifiedType === 'medication') {
            aiPrompt = `You are a clinical pharmacist AI. Analyze this medication image.
NAME: ${identifiedName}
BRAND: ${identifiedBrand}

USER PROFILE: Location ${geoInfo.country_name} (${currencySymbol})

Provide a JSON response. All fields required:
{
  "name": "${identifiedName}",
  "brand": "${identifiedBrand}",
  "generic_name": "Generic Name",
  "description": "2-3 paragraph clinical overview of the drug and what condition it treats",
  "purpose": "A detailed explanation of how it works in the body (mechanism of action)",
  "side_effects": "List common and serious side effects clearly, including what users should monitor",
  "interactions": "Key drug or food interactions the patient should know",
  "warnings": "FDA black box warnings and contraindications",
  "storage": "Storage requirements",
  "healthStatus": "SAFE",
  "is_compliant": ${isCompliantBool},
  "political_warning": "${politicalWarningText}"
}`;
            responseFormat = { type: "json_object" };
        } else if (isProductScan) {
            aiPrompt = `You are a Consumer Health AI. Provide a "Factory Analysis" for this packaged food product for a user in ${geoInfo.city}, ${geoInfo.country_name}.
PRODUCT NAME: ${identifiedName}
BRAND: ${identifiedBrand}

USER PROFILE: ${profileContext}

${dbVerifiedContext}

MANDATORY FACTORY ANALYSIS RULES:
1. ${verifiedFood ? 'USE THE VERIFIED NUTRITION NUMBERS EXACTLY. Never change them.' : 'Provide your best scientific estimate for macros.'}
2. POLITICAL STATUS: invest_israel=${political.invest_israel}, invest_uae=${political.invest_uae}. If true, SET is_compliant=false and political_warning="${political.warning}". If false, SET is_compliant=true and political_warning="Company is not involved in these two countries (Israel/UAE)."
3. Provide a realistic estimated_price in ${currencySymbol} for the ${geoInfo.country_name} market.
4. Provide 2-3 cheaper_alternatives specific to ${geoInfo.country_name} market.

Respond with ONLY this JSON (no markdown):
{
  "name": "${identifiedName}",
  "brand": "${identifiedBrand}",
  "description": "1-2 paragraph general description of the product",
  "usage_instructions": "How the product is used",
  "factory_ingredients": "Detailed breakdown of the factory ingredients based on standard packaging",
  "suitability_analysis": "Whether the product is healthy and suitable for the user",
  "country_origin_details": "Specifically state the likely country of origin of the brand/product.",
  "vitamins_and_nutrition": "2-3 paragraph vitamin and health impact analysis",
  "recommendation": "one personalized sentence about whether they should consume it",
  "recommended_pairings": "2 paragraphs",
  "estimated_price": "${currencySymbol}X.XX",
  "cheaper_alternatives": [{"name": "...", "price": "${currencySymbol}X.XX", "reason": "..."}],
  "is_compliant": ${isCompliantBool},
  "political_warning": "${politicalWarningText}",
  "calories": ${verifiedFood ? verifiedFood.calories : 'number'},
  "protein": ${verifiedFood ? verifiedFood.protein : 'number'},
  "carbs": ${verifiedFood ? verifiedFood.carbs : 'number'},
  "fat": ${verifiedFood ? verifiedFood.fat : 'number'},
  "sugar": ${verifiedFood ? verifiedFood.sugar : 'number'},
  "fiber": ${verifiedFood ? verifiedFood.fiber : 'number'},
  "verdict": "GOOD|MODERATE|POOR",
  "user_alignment_boolean": true
}`;
            responseFormat = { type: "json_object" };
        } else {
            aiPrompt = `You are a world-class Clinical Nutritional AI and Certified Food Scientist.
Analyze the provided food image with extreme precision.

${profileContext}

${dbVerifiedContext}

LOCATION CONTEXT: ${JSON.stringify(locationContext || {})}

━━━━━━━━━━━━━━━━━━━━━━━━━
PART 1 — NARRATIVE REPORT (mandatory style)
━━━━━━━━━━━━━━━━━━━━━━━━━
Write a detailed nutritional report in professional paragraph form.

• description: EXACTLY 3 full paragraphs (minimum 80 words each).
• vitamins_and_nutrition: EXACTLY 3-4 full paragraphs covering vitamins and minerals.
• recommended_pairings: EXACTLY 2-3 full paragraphs suggesting enhancements.
• recommendation: ONE sentence tailored to the user's goal (${userGoalSummary}).

━━━━━━━━━━━━━━━━━━━━━━━━━
PART 2 — CALORIE & MACRO CALCULATION
━━━━━━━━━━━━━━━━━━━━━━━━━
${verifiedFood ? "MANDATORY: Use the VERIFIED NUTRITIONAL DATA provided above." : "ESTIMATION RULE: As no DB record was found, provide your best clinical estimate based on portion size."}

━━━━━━━━━━━━━━━━━━━━━━━━━
PART 3 — PROFILE ALIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━
- verdict: "GOOD" | "MODERATE" | "POOR"
- user_alignment_boolean: true/false
- is_compliant: true/false

━━━━━━━━━━━━━━━━━━━━━━━━━
JSON OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "name": "${identifiedName}",
  "description": "...",
  "vitamins_and_nutrition": "...",
  "recommended_pairings": "...",
  "recommendation": "...",
  "verdict": "GOOD" | "MODERATE" | "POOR",
  "user_alignment_boolean": true,
  "calories": ${verifiedFood?.calories || 'number'},
  "protein": ${verifiedFood?.protein || 'number'},
  "carbs": ${verifiedFood?.carbs || 'number'},
  "fat": ${verifiedFood?.fat || 'number'},
  "sugar": ${verifiedFood?.sugar || 'number'},
  "fiber": ${verifiedFood?.fiber || 'number'},
  "is_compliant": true,
  "confidence_interval": ${verifiedFood ? 1.0 : 0.8},
  "is_verified": ${!isHallucinated}
}

REMINDER: Calculate real values from the actual food in the image. Every meal has a different caloric density. Portion size matters — a large plate has more calories than a small bowl. Adjust accordingly.

LANGUAGE MANDATE: Auto-detect the user's language from their request or location. If they are in a region primarily speaking Arabic or Urdu, or if they write in those languages, respond in that language. You are fluent in ARABIC, URDU, and ENGLISH. Translate all descriptive fields (description, vitamins_and_nutrition, recommended_pairings, recommendation) into the detected language.`;
            responseFormat = {
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
            };
        }

        const apiKey = clientApiKey || Deno.env.get('OPENAI_API_KEY');

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "user", content: [
                    { type: "text", text: aiPrompt },
                    { type: "image_url", image_url: { url: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : imageUrl, detail: "high" } }
                ]}],
                response_format: responseFormat
            }),
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            throw new Error(`OpenAI error: ${errText}`);
        }

        const aiResult = await aiResponse.json();
        const parsed = JSON.parse(aiResult.choices[0].message.content);

        // ⚡ POST-AI ENFORCEMENT & DEVIATION VALIDATION
        
        // Force political warning to always come through even if AI forgets
        if (isProductScan && political.invest_israel && !parsed.political_warning) {
            parsed.political_warning = politicalWarningText;
            parsed.is_compliant = false;
        }
        // Always ensure political_warning is set for product scans
        if (isProductScan && !parsed.political_warning) {
            parsed.political_warning = politicalWarningText;
            parsed.is_compliant = isCompliantBool;
        }

        if (verifiedFood && identifiedType !== 'medication') {
            const calDeviation = Math.abs(parsed.calories - verifiedFood.calories) / verifiedFood.calories;
            if (calDeviation > 0.01) {
                console.warn(`[Anti-Hallucination] Significant calorie deviation detected: AI estimated ${parsed.calories}, DB has ${verifiedFood.calories}. Rejecting AI estimate and forcing DB verified values.`);
            }

            parsed.calories = verifiedFood.calories;
            parsed.protein = verifiedFood.protein;
            parsed.carbs = verifiedFood.carbs;
            parsed.fat = verifiedFood.fat;
            parsed.sugar = verifiedFood.sugar ?? parsed.sugar;
            parsed.fiber = verifiedFood.fiber ?? parsed.fiber;
        }

        const fallbackType = identifiedType === 'medication' ? 'medication' : 'food';

        return new Response(JSON.stringify({
            ...parsed,
            type: fallbackType,
            healthStatus: parsed.verdict || parsed.healthStatus,
            confidence_interval: verifiedFood ? 1.0 : 0.8,
            is_verified: !isHallucinated
        }), {
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
