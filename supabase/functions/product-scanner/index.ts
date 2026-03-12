import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// ─── Ethical Brand Database ───────────────────────────────────────────────────
// Hardcoded political affiliations - no DB dependency for accuracy
const POLITICAL_BRANDS: Record<string, { invest_israel: boolean; invest_uae: boolean; reason: string }> = {
    'nestle': { invest_israel: true, invest_uae: false, reason: 'Nestlé operates factories in illegal Israeli settlements (Beit El)' },
    'coca-cola': { invest_israel: true, invest_uae: false, reason: 'Coca-Cola operates bottling plants in Israel' },
    'pepsico': { invest_israel: true, invest_uae: false, reason: 'PepsiCo acquired SodaStream, an Israeli company operating in occupied territories' },
    'pepsi': { invest_israel: true, invest_uae: false, reason: 'PepsiCo acquired SodaStream, an Israeli company' },
    'sodastream': { invest_israel: true, invest_uae: false, reason: 'SodaStream manufactures in Israeli-occupied West Bank' },
    'strauss': { invest_israel: true, invest_uae: false, reason: 'Strauss Group directly funds Israeli military units' },
    'elite': { invest_israel: true, invest_uae: false, reason: 'Elite Café is a Strauss Group brand' },
    'mcdonald': { invest_israel: true, invest_uae: false, reason: "McDonald's Israel provides free meals to Israeli army" },
    'starbucks': { invest_israel: true, invest_uae: false, reason: 'Howard Schultz (former CEO) is a known pro-Israel donor' },
    'hp': { invest_israel: true, invest_uae: false, reason: 'Hewlett-Packard provides technology used in Israeli military checkpoints' },
    'intel': { invest_israel: true, invest_uae: false, reason: 'Intel has major manufacturing facilities in Israel' },
    'siemens': { invest_israel: true, invest_uae: false, reason: 'Siemens has contracts with Israeli infrastructure projects' },
    'volvo': { invest_israel: true, invest_uae: false, reason: 'Volvo equipment used in demolishing Palestinian homes' },
    'caterpillar': { invest_israel: true, invest_uae: false, reason: 'Caterpillar bulldozers used in demolishing Palestinian homes' },
    'disney': { invest_israel: true, invest_uae: false, reason: 'Disney supports pro-Israel lobbying organizations' },
    'google': { invest_israel: true, invest_uae: false, reason: 'Project Nimbus: Google provides cloud services to Israeli military' },
    'amazon': { invest_israel: true, invest_uae: false, reason: 'Project Nimbus: Amazon provides cloud services to Israeli military' },
    'microsoft': { invest_israel: true, invest_uae: false, reason: 'Microsoft Azure provides services to Israeli defense ministry' },
    'unilever': { invest_israel: false, invest_uae: false, reason: '' },
    'halal': { invest_israel: false, invest_uae: false, reason: '' },
};

function checkPoliticalAffiliation(brand: string): { invest_israel: boolean; invest_uae: boolean; warning: string | null } {
    if (!brand) return { invest_israel: false, invest_uae: false, warning: null };

    const brandLower = brand.toLowerCase();
    for (const [key, data] of Object.entries(POLITICAL_BRANDS)) {
        if (brandLower.includes(key) && (data.invest_israel || data.invest_uae)) {
            return {
                invest_israel: data.invest_israel,
                invest_uae: data.invest_uae,
                warning: `🔴 ETHICAL ALERT: ${brand} — ${data.reason}`
            };
        }
    }
    return { invest_israel: false, invest_uae: false, warning: null };
}

// ─── Parse OpenFoodFacts nutriments to standard fields ────────────────────────
function parseNutriments(nutriments: any): { calories: number; protein: number; carbs: number; fat: number; sugar: number; fiber: number } | null {
    if (!nutriments) return null;
    const cal = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || nutriments['energy_100g'] / 4.184 || 0;
    const protein = nutriments['proteins_100g'] || nutriments['proteins'] || 0;
    const carbs = nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0;
    const fat = nutriments['fat_100g'] || nutriments['fat'] || 0;
    const sugar = nutriments['sugars_100g'] || nutriments['sugars'] || 0;
    const fiber = nutriments['fiber_100g'] || nutriments['fiber'] || 0;

    if (cal === 0 && protein === 0) return null; // Incomplete data
    return {
        calories: Math.round(cal),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        sugar: Math.round(sugar * 10) / 10,
        fiber: Math.round(fiber * 10) / 10,
    };
}

// ─── Geo Lookup ───────────────────────────────────────────────────────────────
async function getGeoInfo(supabase: any, clientIp: string) {
    // Try cache first (valid for 24h)
    const { data: cached } = await supabase
        .from('ip_location_cache')
        .select('*')
        .eq('ip_address', clientIp)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

    if (cached) return cached;

    // Fallback: fetch fresh geo data
    try {
        const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
        if (geoRes.ok) {
            const g = await geoRes.json();
            if (g.error) throw new Error(g.reason || 'Invalid IP');
            const geoInfo = {
                ip_address: clientIp,
                country_code: g.country_code || 'US',
                country_name: g.country_name || 'United States',
                city: g.city || 'Unknown',
                timezone: g.timezone || 'UTC',
                currency_code: g.currency || 'USD',
                currency_symbol: g.currency_symbol || '$',
                expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
            };
            await supabase.from('ip_location_cache').upsert(geoInfo, { onConflict: 'ip_address' });
            return geoInfo;
        }
    } catch (e) {
        console.error('Geo lookup failed:', e);
    }

    // Hard fallback
    return { country_code: 'US', country_name: 'United States', city: 'Unknown', currency_code: 'USD', currency_symbol: '$', timezone: 'UTC' };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body = await req.json();
        const { barcode, apiKey: clientApiKey, userId, locationContext } = body;

        if (!barcode) throw new Error("Barcode is required");

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // ── 1. GEO DETECTION (client-provided country takes priority, then IP) ──
        // We prefer locationContext from client as it's the most accurate
        let geoInfo: any;
        if (locationContext?.country) {
            geoInfo = {
                country_code: locationContext.country,
                country_name: locationContext.country_name || locationContext.country,
                city: locationContext.city || 'Unknown',
                currency_code: locationContext.currency_code || 'USD',
                currency_symbol: locationContext.currency_symbol || '$',
                timezone: locationContext.timezone || 'UTC'
            };
        } else {
            const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || '8.8.8.8';
            geoInfo = await getGeoInfo(supabase, clientIp);
        }

        const currencySymbol = geoInfo.currency_symbol || '$';
        const countryCode = geoInfo.country_code || 'US';

        // ── 2. PRODUCT / MEDICATION LOOKUP ──
        let productData: any = null;
        let medicationData: any = null;
        let verifiedNutrition: any = null;
        let isFromCache = false;

        // A. Is it a medication NDC? (10-11 digits, no dashes)
        const isPotentialNDC = /^\d{10,11}$/.test(barcode.replace(/-/g, ''));
        if (isPotentialNDC) {
            // Check local cache
            const { data: cachedMed } = await supabase.from('medications').select('*').eq('ndc_code', barcode).maybeSingle();
            if (cachedMed) {
                medicationData = cachedMed;
                isFromCache = true;
            } else {
                try {
                    const fdaRes = await fetch(`https://api.fda.gov/drug/ndc.json?search=product_ndc:"${barcode}"`);
                    if (fdaRes.ok) {
                        const fdaData = await fdaRes.json();
                        if (fdaData.results?.length > 0) {
                            const drug = fdaData.results[0];
                            medicationData = {
                                ndc_code: barcode,
                                proprietary_name: drug.brand_name,
                                generic_name: drug.generic_name,
                                active_ingredients: drug.active_ingredients,
                                dosage_form: drug.dosage_form,
                                route: (drug.route || []).join(', '),
                                manufacturer: drug.labeler_name,
                                marketing_status: drug.marketing_status,
                                is_verified: true
                            };
                            supabase.from('medications').insert(medicationData).then(() => console.log('✓ Med cached'));
                        }
                    }
                } catch (e) { console.error('OpenFDA error:', e); }
            }
        }

        if (medicationData) {
            productData = { type: 'medication', name: medicationData.proprietary_name || medicationData.generic_name, brand: medicationData.manufacturer };
        } else {
            // B. Food: local cache → OpenFoodFacts
            const { data: cachedProd } = await supabase.from('products').select('*, companies(*)').eq('barcode', barcode).maybeSingle();
            if (cachedProd) {
                isFromCache = true;
                productData = { type: 'food', name: cachedProd.name, brand: cachedProd.companies?.name || cachedProd.manufacturer, nutritional_data: cachedProd.nutritional_data, country_of_origin: cachedProd.country_of_origin };
                verifiedNutrition = parseNutriments(cachedProd.nutritional_data);
            } else {
                const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
                if (offRes.ok) {
                    const offData = await offRes.json();
                    if (offData.status === 1 && offData.product) {
                        const p = offData.product;
                        productData = { type: 'food', name: p.product_name || p.product_name_en || 'Unknown Product', brand: p.brands, manufacturer: p.manufacturer, nutritional_data: p.nutriments, image_url: p.image_url, country_of_origin: p.countries_en || p.countries };
                        verifiedNutrition = parseNutriments(p.nutriments);
                        // Background cache
                        const { data: brandRow } = await supabase.from('companies').select('id').ilike('name', `%${p.brands?.split(',')[0].trim()}%`).maybeSingle();
                        supabase.from('products').upsert({ barcode, name: productData.name, brand_id: brandRow?.id, manufacturer: p.brands, nutritional_data: p.nutriments, country_of_origin: productData.country_of_origin }, { onConflict: 'barcode' }).then(() => console.log('✓ Product cached'));
                    }
                }
            }
        }

        // ── 3. POLITICAL AFFILIATION CHECK ──
        const brandForCheck = productData?.brand || '';
        const political = checkPoliticalAffiliation(brandForCheck);

        // Also check against DB companies table for any additional flags
        if (!political.invest_israel && brandForCheck) {
            const { data: companyRow } = await supabase.from('companies').select('invest_israel, invest_uae, political_reason').ilike('name', `%${brandForCheck.split(',')[0].trim()}%`).maybeSingle();
            if (companyRow?.invest_israel) {
                political.invest_israel = true;
                political.warning = `🔴 ETHICAL ALERT: ${brandForCheck} — ${companyRow.political_reason || 'Known political affiliation detected'}`;
            }
        }

        // ── 4. AI ENRICHMENT ──
        const apiKey = clientApiKey || Deno.env.get('OPENAI_API_KEY');

        let prompt: string;

        if (productData?.type === 'medication') {
            prompt = `You are a clinical pharmacist AI. Analyze this verified FDA-registered medication.

FDA DATA: ${JSON.stringify(medicationData)}

Provide a JSON response. All fields required:
{
  "name": "${medicationData?.proprietary_name || medicationData?.generic_name}",
  "brand": "${medicationData?.manufacturer}",
  "generic_name": "${medicationData?.generic_name || ''}",
  "description": "2-3 paragraph clinical overview of the drug",
  "purpose": "What this medication treats and how it works",
  "side_effects": "List common and serious side effects clearly",
  "interactions": "Key drug interactions the patient should know",
  "warnings": "FDA black box warnings and contraindications",
  "storage": "Storage requirements",
  "healthStatus": "SAFE",
  "is_compliant": true
}`;
        } else {
            const hasVerifiedNutrition = verifiedNutrition !== null;
            prompt = `You are a Consumer Health AI. Analyze this food product for a user in ${geoInfo.city || 'Unknown'}, ${geoInfo.country_name || 'Unknown'}.

PRODUCT DETAILS: ${JSON.stringify(productData || { barcode })}
${hasVerifiedNutrition ? `
⚠️ VERIFIED NUTRITIONAL DATA (PER 100g) — MANDATORY: USE THESE EXACT NUMBERS. DO NOT HALLUCINATE:
- Calories: ${verifiedNutrition.calories} kcal
- Protein: ${verifiedNutrition.protein}g
- Carbs: ${verifiedNutrition.carbs}g
- Fat: ${verifiedNutrition.fat}g
- Sugar: ${verifiedNutrition.sugar}g
- Fiber: ${verifiedNutrition.fiber}g
` : '(No verified nutritional database entry found — estimate based on product type)'}

POLITICAL STATUS: invest_israel=${political.invest_israel}, invest_uae=${political.invest_uae}
USER LOCATION: ${geoInfo.city}, ${geoInfo.country_name} | CURRENCY: ${currencySymbol} (${geoInfo.currency_code})

MANDATORY RULES:
1. ${hasVerifiedNutrition ? 'USE THE VERIFIED NUMBERS ABOVE EXACTLY. Never change them.' : 'Provide your best scientific estimate for macros.'}
2. ${political.invest_israel ? `SET is_compliant=false. SET political_warning="${political.warning}"` : 'is_compliant=true unless you identify a known ethical issue.'}
3. Provide realistic estimated_price in ${currencySymbol} for ${geoInfo.country_name} market. Research typical local prices.
4. Provide 2-3 cheaper_alternatives specific to ${geoInfo.country_name}.
5. vitamins_and_nutrition must be 2-3 detailed paragraphs.
6. description must be 2-3 detailed paragraphs.

Respond with ONLY this JSON (no markdown):
{
  "name": "exact product name",
  "brand": "brand name",
  "description": "2-3 paragraph description",
  "vitamins_and_nutrition": "2-3 paragraph vitamin analysis",
  "recommendation": "one personalized sentence",
  "recommended_pairings": "2 paragraphs",
  "estimated_price": "${currencySymbol}X.XX",
  "cheaper_alternatives": [{"name": "...", "price": "${currencySymbol}X.XX", "reason": "..."}],
  "is_compliant": true,
  "political_warning": ${political.invest_israel ? `"${political.warning}"` : 'null'},
  "calories": ${hasVerifiedNutrition ? verifiedNutrition.calories : 'number'},
  "protein": ${hasVerifiedNutrition ? verifiedNutrition.protein : 'number'},
  "carbs": ${hasVerifiedNutrition ? verifiedNutrition.carbs : 'number'},
  "fat": ${hasVerifiedNutrition ? verifiedNutrition.fat : 'number'},
  "sugar": ${hasVerifiedNutrition ? verifiedNutrition.sugar : 'number'},
  "fiber": ${hasVerifiedNutrition ? verifiedNutrition.fiber : 'number'},
  "healthStatus": "GOOD|MODERATE|POOR",
  "user_alignment_boolean": true
}`;
        }

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });

        if (!aiRes.ok) throw new Error(`OpenAI error: ${await aiRes.text()}`);
        const aiData = await aiRes.json();
        const result = JSON.parse(aiData.choices[0].message.content);

        // Force political warning to always come through even if AI forgets
        if (political.invest_israel && !result.political_warning) {
            result.political_warning = political.warning;
            result.is_compliant = false;
        }

        // Force verified nutrition numbers if we have them (prevent AI override)
        if (verifiedNutrition) {
            result.calories = verifiedNutrition.calories;
            result.protein = verifiedNutrition.protein;
            result.carbs = verifiedNutrition.carbs;
            result.fat = verifiedNutrition.fat;
            result.sugar = verifiedNutrition.sugar;
            result.fiber = verifiedNutrition.fiber;
        }

        return new Response(JSON.stringify({
            found: !!productData,
            barcode,
            type: productData?.type || 'unknown',
            is_verified: !!(medicationData?.is_verified || verifiedNutrition),
            is_from_cache: isFromCache,
            image_url: productData?.image_url,
            country_of_origin: productData?.country_of_origin,
            ...result,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('product-scanner error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
