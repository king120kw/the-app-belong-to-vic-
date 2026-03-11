import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { barcode, apiKey: clientApiKey, userId, currentTime, locationContext } = await req.json();

        if (!barcode) {
            throw new Error("Barcode is required");
        }

        console.log(`Scanning barcode: ${barcode} for user: ${userId} at ${currentTime}`);
        console.log(`Location Context: ${JSON.stringify(locationContext)}`);

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        let onboardingData = null;

        if (userId) {
            const { data: onboarding } = await supabase
                .from('onboarding_responses')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
            onboardingData = onboarding;
        }

        // 1. Dual API Lookup
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
            return new Response(JSON.stringify({ found: false, message: "Product not found" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const product = offData.product || (nxData?.foods ? nxData.foods[0] : {});
        const brandName = product.brands || product.brand_name || "";

        // 2. Localization & IP Caching
        const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '8.8.8.8';
        let geoInfo: any = null;

        // Use passed context if valid, otherwise check cache/IP
        if (locationContext && locationContext.country && locationContext.currency_symbol) {
            console.log("Using provided location context:", locationContext);
            geoInfo = {
                country_code: locationContext.country,
                currency_symbol: locationContext.currency_symbol,
                currency_code: locationContext.currency_code || "USD" // Fallback code
            };
        } else {
            const { data: cachedGeo } = await supabase
                .from('ip_location_cache')
                .select('*')
                .eq('ip_address', clientIp)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            if (cachedGeo) {
                geoInfo = cachedGeo;
            } else {
                try {
                    const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
                    if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        geoInfo = {
                            ip_address: clientIp,
                            country_code: geoData.country_code || "US",
                            country_name: geoData.country_name,
                            city: geoData.city,
                            currency_code: geoData.currency || "USD",
                            currency_symbol: geoData.currency_symbol || "$",
                            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                        };
                        await supabase.from('ip_location_cache').upsert(geoInfo);
                    }
                } catch (e) {
                    console.error("Geo lookup failed:", e);
                    geoInfo = { country_code: "US", currency_code: "USD", currency_symbol: "$" };
                }
            }
        }

        const countryCode = geoInfo.country_code;
        const currencySymbol = geoInfo.currency_symbol || "$";

        // 3. Database Product & Political Check
        let politicalAffiliation = null;
        let regionalPrice = null;

        // Try to find product in our DB first
        const { data: dbProduct } = await supabase
            .from('products')
            .select('*, companies(*)')
            .eq('barcode', barcode)
            .maybeSingle();

        if (dbProduct) {
            politicalAffiliation = dbProduct.companies;

            // Get regional price
            const { data: priceData } = await supabase
                .from('regional_pricing')
                .select('*')
                .eq('barcode', barcode)
                .eq('country_code', countryCode)
                .maybeSingle();
            regionalPrice = priceData;
        } else {
            // Search by brand name if product not found
            if (brandName) {
                const { data: companyData } = await supabase
                    .from('companies')
                    .select('*')
                    .ilike('name', `%${brandName}%`)
                    .maybeSingle();
                politicalAffiliation = companyData;
            }
        }

        // 4. Budget Status Check
        let budgetStatus = "Active";
        if (userId) {
            const { data: activeBudget } = await supabase
                .from('user_budgets')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .maybeSingle();

            if (activeBudget && regionalPrice && activeBudget.current_balance < regionalPrice.price) {
                budgetStatus = "Insufficient";
                // Proactive Health Coach Warning
                await supabase.from('notifications').insert({
                    user_id: userId,
                    title: "Budget Alert",
                    message: `Scanning "${dbProduct?.name || product.product_name || 'this item'}" (${currencySymbol}${regionalPrice.price}) will exceed your remaining budget of ${currencySymbol}${activeBudget.current_balance}.`,
                    type: 'budget_alert'
                });

                // 4.1 Automatically notify Health Coach Chat
                const { data: convs } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('conversation_type', 'ai')
                    .or('name.ilike.%Health Coach%,name.ilike.%Coach%')
                    .limit(1);

                if (convs && convs.length > 0) {
                    await supabase.from('messages').insert({
                        conversation_id: convs[0].id,
                        sender_id: '00000000-0000-0000-0000-000000000000', // AI/System Sender
                        message_type: 'system',
                        content: `⚠️ BUDGET ALERT: The scanned product "${dbProduct?.name || product.product_name}" costs ${currencySymbol}${regionalPrice.price}, which exceeds your remaining budget of ${currencySymbol}${activeBudget.current_balance}. I suggest looking for a more cost-effective alternative.`,
                        metadata: { product_id: dbProduct?.id, price: regionalPrice.price, budget_balance: activeBudget.current_balance }
                    });
                }
            }
        }

        // 5. AI Analysis with Structured Output (JSON Schema)
        const apiKey = clientApiKey || Deno.env.get('OPENAI_API_KEY');
        const userProfileStr = onboardingData ? `GOAL: ${onboardingData.goal}, MEDICAL: ${onboardingData.medical_conditions}, RESTRICTIONS: ${onboardingData.dietary_lifestyle?.join(', ')}` : "None";

        const prompt = `You are a world-class Consumer Health AI and Food Scientist.
Analyze the following product data precisely.

PRODUCT DATA: ${JSON.stringify(product)}
USER PROFILE: ${userProfileStr}
LOCATION: ${geoInfo.city}, ${geoInfo.country_name} (${countryCode})
BUDGET STATUS: ${budgetStatus}

STRICT ANALYTICAL MANDATE:
1. Cross-reference against USER PROFILE (Allergies, Diabetes, Weight Loss, Diet Focus, etc.).
2. Evaluate ethical compliance (Israel/UAE investments):
   - MANDATORY BRAND CHECK: If the brand is ${politicalAffiliation?.name || 'found in data'} AND (invest_israel=${politicalAffiliation?.invest_israel || false} OR invest_uae=${politicalAffiliation?.invest_uae || false}), you MUST set 'is_compliant' to false AND output a red-themed string in 'political_warning' (e.g., "🔴 ETHICAL CONCERN: Linked to [Company Name]...").
   - IF NO AFFILIATION FOUND: Set 'political_warning' to "🟢 ETHICAL STATUS: No known affiliation with restricted investments."
3. LOCALIZATION:
   - Identify ingredients and nutritional facts precisely.
   - Output 'estimated_price' in the local currency (${currencySymbol}) based on the user's location.
   - Suggest localized smart alternatives available in ${geoInfo.country_name}.
4. BRANDING: Distinctly identify and state the product's BRAND name in the response.

JSON OUTPUT:
{
  "name": "Product Name",
  "brand": "Brand Name",
  "manufacturer": "Manufacturer",
  "country_of_origin": "Country Name",
  "ingredients": "Ingredient list...",
  "description": "Professional 3-sentence bio...",
  "vitamins_and_nutrition": "Micronutrient audit...",
  "recommendation": "Contextual advice based on health + budget...",
  "estimated_price": "${currencySymbol}${regionalPrice?.price || '...'}",
  "is_compliant": boolean,
  "political_warning": "Warning string",
  "cheaper_alternatives": [
    { "name": "Name", "price": "${currencySymbol}...", "reason": "Better value/health" }
  ],
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "sugar": number,
  "fiber": number,
  "healthStatus": "GOOD" | "MODERATE" | "POOR",
  "user_alignment_boolean": boolean
}`;

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "product_audit",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                brand: { type: "string" },
                                manufacturer: { type: "string" },
                                country_of_origin: { type: "string" },
                                ingredients: { type: "string" },
                                description: { type: "string" },
                                vitamins_and_nutrition: { type: "string" },
                                recommendation: { type: "string" },
                                estimated_price: { type: "string" },
                                is_compliant: { type: "boolean" },
                                political_warning: { type: "string" },
                                cheaper_alternatives: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string" },
                                            price: { type: "string" },
                                            reason: { type: "string" }
                                        },
                                        required: ["name", "price", "reason"],
                                        additionalProperties: false
                                    }
                                },
                                calories: { type: "number" },
                                protein: { type: "number" },
                                carbs: { type: "number" },
                                fat: { type: "number" },
                                sugar: { type: "number" },
                                fiber: { type: "number" },
                                healthStatus: { type: "string", enum: ["GOOD", "MODERATE", "POOR"] },
                                user_alignment_boolean: { type: "boolean" }
                            },
                            required: [
                                "name", "brand", "manufacturer", "country_of_origin", "ingredients",
                                "description", "vitamins_and_nutrition", "recommendation",
                                "estimated_price", "is_compliant", "political_warning",
                                "cheaper_alternatives", "calories", "protein", "carbs",
                                "fat", "sugar", "fiber", "healthStatus", "user_alignment_boolean"
                            ],
                            additionalProperties: false
                        }
                    }
                }
            }),
        });

        if (!aiRes.ok) throw new Error(`OpenAI error: ${await aiRes.text()}`);
        const aiData = await aiRes.json();
        const aiAnalysis = JSON.parse(aiData.choices[0].message.content);

        // 6. Final political check override from DB
        if (politicalAffiliation && (politicalAffiliation.invest_israel || politicalAffiliation.invest_uae) && userId) {
            aiAnalysis.is_compliant = false;
            aiAnalysis.political_warning = `🔴 ETHICAL CONCERN: Linked to ${politicalAffiliation.name}, which has investments in restricted regions.`;

            await supabase.from('notifications').insert({
                user_id: userId,
                title: "Ethical Concern Detected",
                message: `The product "${brandName}" is associated with ${politicalAffiliation.name}, which has investments in restricted regions.`,
                type: 'political_alert'
            });
        }

        const result = {
            found: true,
            barcode,
            image: product.image_url || product.photo?.thumb || "",
            ...aiAnalysis
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
