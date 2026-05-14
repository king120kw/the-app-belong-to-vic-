import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function checkPoliticalAffiliation(supabase: any, brand: string) {
  if (!brand) return { invest_israel: false, invest_uae: false, warning: null }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', `%${brand}%`)
    .maybeSingle()

  if (company && (company.invest_israel || company.invest_uae)) {
    return {
      invest_israel: company.invest_israel,
      invest_uae: company.invest_uae,
      warning: `🔴 ETHICAL ALERT: ${brand} — ${company.reason}`,
    }
  }

  return { invest_israel: false, invest_uae: false, warning: null }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageUrl, imageBase64, userId, locationContext, isProductScan } = body

    if (!imageUrl && !imageBase64) throw new Error('Image URL or base64 data is required')

    const supabase = createServerSupabaseClient()
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY

    let profileContext = 'USER PROFILE: General healthy adult. No specific dietary restrictions on file.'
    let userGoalSummary = 'maintain a healthy lifestyle'

    if (userId) {
      const { data: onboarding } = await supabase
        .from('onboarding_responses')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (onboarding) {
        const goal = onboarding.goal || 'maintain a healthy lifestyle'
        const restrictions = (onboarding.dietary_lifestyle || []).join(', ') || 'none'
        const medical = onboarding.medical_conditions || 'None reported'
        const health = onboarding.health_conditions || 'None reported'
        const calorieTarget = onboarding.daily_calorie_goal || 2000
        userGoalSummary = goal

        profileContext = `USER PROFILE & CONSTRAINTS:
- PRIMARY GOAL: ${goal}
- DIETARY LIFESTYLE / RESTRICTIONS: ${restrictions}
- MEDICAL CONDITIONS: ${medical}
- HEALTH CONCERNS: ${health}
- DAILY CALORIE TARGET: ${calorieTarget} kcal/day
- ASSESSMENT RULE: Based on the above profile, explicitly state whether this meal is GOOD, MODERATE, or POOR for this user and why.`
      }
    }

    // Step 1: Identify food
    const identificationPrompt = isProductScan
      ? `Identify the object in this image. It may be a packaged food product, a dietary supplement, or a medication. Return ONLY a JSON object with "name", "brand", and "type" ("food", "medication", or "unknown"). Example: {"name": "Instant Noodle Cup", "brand": "Nissin", "type": "food"}`
      : `Identify the food in this image. Return ONLY a JSON object with a "name" field. Example: {"name": "Apple"}`

    const idResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: identificationPrompt },
            { type: 'image_url', image_url: { url: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : imageUrl, detail: 'low' } },
          ],
        }],
        response_format: { type: 'json_object' },
      }),
    })

    const idData = await idResponse.json()
    const idContent = JSON.parse(idData.choices[0].message.content)
    const identifiedName = idContent.name
    const identifiedBrand = idContent.brand || ''
    const identifiedType = idContent.type || 'food'

    // Step 2: Check DB for verified nutrition
    const { data: verifiedFood } = await supabase
      .from('food_items')
      .select('*')
      .ilike('name', `%${identifiedName}%`)
      .order('calories', { ascending: false })
      .limit(1)
      .maybeSingle()

    let dbVerifiedContext = ''
    let isHallucinated = true

    if (verifiedFood) {
      isHallucinated = false
      dbVerifiedContext = `
VERIFIED NUTRITIONAL DATA FOUND IN DATABASE:
- Calories: ${verifiedFood.calories} kcal
- Protein: ${verifiedFood.protein}g
- Carbs: ${verifiedFood.carbs}g
- Fat: ${verifiedFood.fat}g
- Fiber: ${verifiedFood.fiber}g
- Sugar: ${verifiedFood.sugar}g

MANDATORY: You MUST use these exact verified numbers in your output.`
    }

    // V15: Automatic Geo-Detection if not provided by client
    const clientIp =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      '8.8.8.8';

    let geoInfo = {
      country_name: locationContext?.country || 'Unknown',
      city: locationContext?.city || 'Unknown',
      currency_code: locationContext?.currency_code || 'USD',
      currency_symbol: locationContext?.currency_symbol || '$',
    }

    if (geoInfo.country_name === 'Unknown') {
      try {
        const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
        if (geoRes.ok) {
          const g = await geoRes.json();
          geoInfo = {
            country_name: g.country_name || 'United States',
            city: g.city || 'Unknown',
            currency_code: g.currency || 'USD',
            currency_symbol: g.currency_symbol || '$',
          };
        }
      } catch (e) {
        console.warn('[Food-AI] Geo lookup failed, using fallbacks');
      }
    }

    const political = await checkPoliticalAffiliation(supabase, identifiedBrand)
    const politicalWarningText = political.invest_israel
      ? (political.warning || `🔴 ETHICAL ALERT: ${identifiedBrand} has documented investments in Israeli-occupied territories.`)
      : 'Company is not involved in these two countries (Israel/UAE).'
    const isCompliantBool = !political.invest_israel

    let aiPrompt = ''
    let responseFormat: any = { type: 'json_object' }

    if (isProductScan && identifiedType === 'medication') {
      aiPrompt = `You are a clinical pharmacist AI. Analyze this medication image.
NAME: ${identifiedName}
BRAND: ${identifiedBrand}
USER PROFILE: Location ${geoInfo.country_name} (${geoInfo.currency_symbol})

Provide a JSON response with all fields:
{"name":"${identifiedName}","brand":"${identifiedBrand}","generic_name":"Generic Name","description":"2-3 paragraph clinical overview","purpose":"mechanism of action","side_effects":"common and serious side effects","interactions":"key drug or food interactions","warnings":"FDA black box warnings","storage":"storage requirements","healthStatus":"SAFE","is_compliant":${isCompliantBool},"political_warning":"${politicalWarningText}"}`
    } else if (isProductScan) {
      aiPrompt = `You are a Consumer Health AI. Provide a "Factory Analysis" for this packaged food product for a user in ${geoInfo.city}, ${geoInfo.country_name}.
PRODUCT NAME: ${identifiedName}
BRAND: ${identifiedBrand}
USER PROFILE: ${profileContext}
${dbVerifiedContext}
REGIONAL STANDARDS: Use ${['US', 'UK', 'CA', 'AU'].includes(geoInfo.country_name) ? 'Imperial (oz/lbs)' : 'Metric (g/kg)'} units. Factor in ${geoInfo.country_name} food safety regulations.

RULES:
1. ${verifiedFood ? 'USE THE VERIFIED NUTRITION NUMBERS EXACTLY.' : 'Provide your best scientific estimate for macros.'}
2. POLITICAL STATUS: invest_israel=${political.invest_israel}. If true, SET is_compliant=false and political_warning="${political.warning}". If false, is_compliant=true and political_warning="${politicalWarningText}".
3. Provide a realistic estimated_price in ${geoInfo.currency_symbol} for the ${geoInfo.country_name} market.
4. Provide 2-3 cheaper_alternatives specific to ${geoInfo.country_name} market.

Respond with ONLY JSON:
{"name":"${identifiedName}","brand":"${identifiedBrand}","description":"...","usage_instructions":"...","factory_ingredients":"...","suitability_analysis":"...","country_origin_details":"...","vitamins_and_nutrition":"...","recommendation":"...","recommended_pairings":"...","estimated_price":"${geoInfo.currency_symbol}X.XX","cheaper_alternatives":[{"name":"...","price":"...","reason":"..."}],"is_compliant":${isCompliantBool},"political_warning":"${politicalWarningText}","calories":${verifiedFood ? verifiedFood.calories : 0},"protein":${verifiedFood ? verifiedFood.protein : 0},"carbs":${verifiedFood ? verifiedFood.carbs : 0},"fat":${verifiedFood ? verifiedFood.fat : 0},"sugar":${verifiedFood ? verifiedFood.sugar : 0},"fiber":${verifiedFood ? verifiedFood.fiber : 0},"verdict":"GOOD","user_alignment_boolean":true}`
    } else {
      aiPrompt = `You are a world-class Clinical Nutritional AI and Certified Food Scientist.
Analyze the provided food image with extreme precision.

${profileContext}
${dbVerifiedContext}
LOCATION CONTEXT: ${geoInfo.city}, ${geoInfo.country_name}
REGIONAL STANDARDS: Use ${['US', 'UK', 'CA', 'AU'].includes(geoInfo.country_name) ? 'Imperial' : 'Metric'} units. 

Write a detailed nutritional report:
• description: EXACTLY 3 full paragraphs (minimum 80 words each).
• vitamins_and_nutrition: EXACTLY 3-4 full paragraphs covering vitamins and minerals.
• recommended_pairings: EXACTLY 2-3 full paragraphs suggesting enhancements.
• recommendation: ONE sentence tailored to the user's goal (${userGoalSummary}).

${verifiedFood ? 'MANDATORY: Use the VERIFIED NUTRITIONAL DATA provided above.' : 'ESTIMATION RULE: Provide your best clinical estimate based on portion size.'}

JSON OUTPUT:
{"name":"${identifiedName}","description":"...","vitamins_and_nutrition":"...","recommended_pairings":"...","recommendation":"...","verdict":"GOOD|MODERATE|POOR","user_alignment_boolean":true,"calories":${verifiedFood?.calories || 0},"protein":${verifiedFood?.protein || 0},"carbs":${verifiedFood?.carbs || 0},"fat":${verifiedFood?.fat || 0},"sugar":${verifiedFood?.sugar || 0},"fiber":${verifiedFood?.fiber || 0},"is_compliant":true,"confidence_interval":${verifiedFood ? 1.0 : 0.8},"is_verified":${!isHallucinated}}

LANGUAGE MANDATE: Auto-detect the user's language from location (${geoInfo.country_name}). If the region speaks Arabic, Urdu, Hindi, or Indonesian, respond fluently in that language.`

      responseFormat = {
        type: 'json_schema',
        json_schema: {
          name: 'food_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' }, description: { type: 'string' },
              vitamins_and_nutrition: { type: 'string' }, recommended_pairings: { type: 'string' },
              recommendation: { type: 'string' }, verdict: { type: 'string', enum: ['GOOD', 'MODERATE', 'POOR'] },
              user_alignment_boolean: { type: 'boolean' }, calories: { type: 'number' },
              protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' },
              sugar: { type: 'number' }, fiber: { type: 'number' }, is_compliant: { type: 'boolean' },
            },
            required: ['name', 'description', 'vitamins_and_nutrition', 'recommended_pairings', 'recommendation', 'verdict', 'user_alignment_boolean', 'calories', 'protein', 'carbs', 'fat', 'sugar', 'fiber', 'is_compliant'],
            additionalProperties: false,
          },
        },
      }
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: [
          { type: 'text', text: aiPrompt },
          { type: 'image_url', image_url: { url: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : imageUrl, detail: 'high' } },
        ]}],
        response_format: responseFormat,
      }),
    })

    if (!aiResponse.ok) throw new Error(`OpenAI error: ${await aiResponse.text()}`)
    const aiResult = await aiResponse.json()
    const parsed = JSON.parse(aiResult.choices[0].message.content)

    // Post-AI enforcement
    if (isProductScan && political.invest_israel && !parsed.political_warning) {
      parsed.political_warning = politicalWarningText
      parsed.is_compliant = false
    }
    if (isProductScan && !parsed.political_warning) {
      parsed.political_warning = politicalWarningText
      parsed.is_compliant = isCompliantBool
    }

    if (verifiedFood && identifiedType !== 'medication') {
      parsed.calories = verifiedFood.calories
      parsed.protein = verifiedFood.protein
      parsed.carbs = verifiedFood.carbs
      parsed.fat = verifiedFood.fat
      parsed.sugar = verifiedFood.sugar ?? parsed.sugar
      parsed.fiber = verifiedFood.fiber ?? parsed.fiber
    }

    return NextResponse.json({
      ...parsed,
      type: identifiedType === 'medication' ? 'medication' : 'food',
      healthStatus: parsed.verdict || parsed.healthStatus,
      confidence_interval: verifiedFood ? 1.0 : 0.8,
      is_verified: !isHallucinated,
    })
  } catch (error: any) {
    console.error('analyze-food-image error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
