import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function checkPoliticalAffiliation(supabase: any, brand: string) {
  if (!brand) return { invest_israel: false, invest_uae: false, warning: null }

  const { data: companyRow } = await supabase
    .from('companies')
    .select('name, invest_israel, invest_uae, political_reason')
    .ilike('name', `%${brand.split(',')[0].trim()}%`)
    .maybeSingle()

  if (companyRow && (companyRow.invest_israel || companyRow.invest_uae)) {
    return {
      invest_israel: companyRow.invest_israel,
      invest_uae: companyRow.invest_uae,
      warning: `🔴 ETHICAL ALERT: ${brand} — ${companyRow.political_reason || 'Known political affiliation detected'}`,
    }
  }

  return { invest_israel: false, invest_uae: false, warning: null }
}

function parseNutriments(nutriments: any) {
  if (!nutriments) return null
  const cal = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || nutriments['energy_100g'] / 4.184 || 0
  const protein = nutriments['proteins_100g'] || nutriments['proteins'] || 0
  const carbs = nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0
  const fat = nutriments['fat_100g'] || nutriments['fat'] || 0
  const sugar = nutriments['sugars_100g'] || nutriments['sugars'] || 0
  const fiber = nutriments['fiber_100g'] || nutriments['fiber'] || 0
  if (cal === 0 && protein === 0) return null
  return {
    calories: Math.round(cal),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    sugar: Math.round(sugar * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
  }
}

async function getGeoInfo(supabase: any, clientIp: string) {
  const { data: cached } = await supabase
    .from('ip_location_cache')
    .select('*')
    .eq('ip_address', clientIp)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (cached) return cached

  try {
    const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`)
    if (geoRes.ok) {
      const g = await geoRes.json()
      if (!g.error) {
        const geoInfo = {
          ip_address: clientIp,
          country_code: g.country_code || 'US',
          country_name: g.country_name || 'United States',
          city: g.city || 'Unknown',
          timezone: g.timezone || 'UTC',
          currency_code: g.currency || 'USD',
          currency_symbol: g.currency_symbol || '$',
          expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        }
        supabase.from('ip_location_cache').upsert(geoInfo, { onConflict: 'ip_address' }).then()
        return geoInfo
      }
    }
  } catch (e) {
    console.error('Geo lookup failed:', e)
  }

  return { country_code: 'US', country_name: 'United States', city: 'Unknown', currency_code: 'USD', currency_symbol: '$', timezone: 'UTC' }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { barcode, userId, locationContext } = body

    if (!barcode) throw new Error('Barcode is required')

    const supabase = createServerSupabaseClient()
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY

    let geoInfo: any
    if (locationContext?.country) {
      geoInfo = {
        country_code: locationContext.country,
        country_name: locationContext.country_name || locationContext.country,
        city: locationContext.city || 'Unknown',
        currency_code: locationContext.currency_code || 'USD',
        currency_symbol: locationContext.currency_symbol || '$',
        timezone: locationContext.timezone || 'UTC',
      }
    } else {
      const clientIp =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('cf-connecting-ip') ||
        '8.8.8.8'
      geoInfo = await getGeoInfo(supabase, clientIp)
    }

    const currencySymbol = geoInfo.currency_symbol || '$'

    let productData: any = null
    let medicationData: any = null
    let verifiedNutrition: any = null
    let isFromCache = false

    const isPotentialNDC = /^\d{10,11}$/.test(barcode.replace(/-/g, ''))
    if (isPotentialNDC) {
      const { data: cachedMed } = await supabase.from('medications').select('*').eq('ndc_code', barcode).maybeSingle()
      if (cachedMed) {
        medicationData = cachedMed
        isFromCache = true
      } else {
        try {
          const fdaRes = await fetch(`https://api.fda.gov/drug/ndc.json?search=product_ndc:"${barcode}"`)
          if (fdaRes.ok) {
            const fdaData = await fdaRes.json()
            if (fdaData.results?.length > 0) {
              const drug = fdaData.results[0]
              medicationData = {
                ndc_code: barcode,
                proprietary_name: drug.brand_name,
                generic_name: drug.generic_name,
                active_ingredients: drug.active_ingredients,
                dosage_form: drug.dosage_form,
                route: (drug.route || []).join(', '),
                manufacturer: drug.labeler_name,
                marketing_status: drug.marketing_status,
                is_verified: true,
              }
              supabase.from('medications').insert(medicationData).then()
            }
          }
        } catch (e) { console.error('OpenFDA error:', e) }
      }
    }

    if (medicationData) {
      productData = { type: 'medication', name: medicationData.proprietary_name || medicationData.generic_name, brand: medicationData.manufacturer }
    } else {
      const { data: cachedProd } = await supabase.from('products').select('*, companies(*)').eq('barcode', barcode).maybeSingle()
      if (cachedProd) {
        isFromCache = true
        productData = { type: 'food', name: cachedProd.name, brand: cachedProd.companies?.name || cachedProd.manufacturer, nutritional_data: cachedProd.nutritional_data, country_of_origin: cachedProd.country_of_origin }
        verifiedNutrition = parseNutriments(cachedProd.nutritional_data)
      } else {
        const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
        if (offRes.ok) {
          const offData = await offRes.json()
          if (offData.status === 1 && offData.product) {
            const p = offData.product
            productData = { type: 'food', name: p.product_name || p.product_name_en || 'Unknown Product', brand: p.brands, manufacturer: p.manufacturer, nutritional_data: p.nutriments, image_url: p.image_url, country_of_origin: p.countries_en || p.countries }
            verifiedNutrition = parseNutriments(p.nutriments)
            const { data: brandRow } = await supabase.from('companies').select('id').ilike('name', `%${p.brands?.split(',')[0].trim()}%`).maybeSingle()
            supabase.from('products').upsert({ barcode, name: productData.name, brand_id: brandRow?.id, manufacturer: p.brands, nutritional_data: p.nutriments, country_of_origin: productData.country_of_origin }, { onConflict: 'barcode' }).then()
          }
        }
      }
    }

    if (!productData && !isPotentialNDC) {
      return NextResponse.json({ found: false, error: 'Product not found. Please enter details manually.' }, { status: 404 })
    }

    if (!productData && isPotentialNDC) {
      productData = { type: 'medication', isFallback: true }
    }

    const brandForCheck = productData?.brand || ''
    const political = await checkPoliticalAffiliation(supabase, brandForCheck)

    let prompt: string

    if (productData?.type === 'medication') {
      prompt = `You are a clinical pharmacist AI. Analyze this medication barcode or NDC: ${barcode}.
${medicationData ? `\nFDA DATA: ${JSON.stringify(medicationData)}\n` : '\nNOTE: FDA database lookup failed. Identify this medication based on the NDC/Barcode if possible.\n'}
USER PROFILE: Location ${geoInfo.country_name} (${currencySymbol})

Provide a JSON response. All fields required:
{"name":"${medicationData?.proprietary_name || medicationData?.generic_name || 'Exact Medication Name'}","brand":"${medicationData?.manufacturer || 'Manufacturer'}","generic_name":"${medicationData?.generic_name || 'Generic Name'}","description":"2-3 paragraph clinical overview","purpose":"mechanism of action","side_effects":"common and serious side effects","interactions":"key drug or food interactions","warnings":"FDA black box warnings","storage":"storage requirements","healthStatus":"SAFE","is_compliant":true}`
    } else {
      const hasVerifiedNutrition = verifiedNutrition !== null
      prompt = `You are a Consumer Health AI. Provide a "Factory Analysis" for this food product for a user in ${geoInfo.city || 'Unknown'}, ${geoInfo.country_name || 'Unknown'}.

PRODUCT DETAILS: ${JSON.stringify(productData || { barcode })}
POLITICAL STATUS: invest_israel=${political.invest_israel}, invest_uae=${political.invest_uae}
USER LOCATION: ${geoInfo.city}, ${geoInfo.country_name} | CURRENCY: ${currencySymbol}

RULES:
1. ${hasVerifiedNutrition ? 'USE THE VERIFIED NUTRITION NUMBERS EXACTLY.' : 'Provide your best scientific estimate for macros.'}
2. ${political.invest_israel || political.invest_uae
  ? `SET is_compliant=false. SET political_warning="WARNING: ${political.warning || 'Company is involved in controversial investments.'}"`
  : `SET is_compliant=true. SET political_warning="Company is not involved in these two countries (Israel/UAE)."`}
3. Provide a realistic estimated_price in ${currencySymbol} for the ${geoInfo.country_name} market.
4. Provide 2-3 cheaper_alternatives specific to ${geoInfo.country_name} market.

Respond with ONLY JSON:
{"name":"exact product name","brand":"brand name","description":"...","usage_instructions":"...","factory_ingredients":"...","suitability_analysis":"...","country_origin_details":"...","vitamins_and_nutrition":"...","recommendation":"...","recommended_pairings":"...","estimated_price":"${currencySymbol}X.XX","cheaper_alternatives":[{"name":"...","price":"...","reason":"..."}],"is_compliant":${!political.invest_israel},"political_warning":"${political.invest_israel ? political.warning : 'Company is not involved in these two countries (Israel/UAE).'}","calories":${hasVerifiedNutrition ? verifiedNutrition.calories : 0},"protein":${hasVerifiedNutrition ? verifiedNutrition.protein : 0},"carbs":${hasVerifiedNutrition ? verifiedNutrition.carbs : 0},"fat":${hasVerifiedNutrition ? verifiedNutrition.fat : 0},"sugar":${hasVerifiedNutrition ? verifiedNutrition.sugar : 0},"fiber":${hasVerifiedNutrition ? verifiedNutrition.fiber : 0},"healthStatus":"GOOD|MODERATE|POOR","user_alignment_boolean":true}

LANGUAGE MANDATE: Auto-detect language. If in Arabic/Urdu region, respond in that language.`
    }

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiRes.ok) throw new Error(`OpenAI error: ${await aiRes.text()}`)
    const aiData = await aiRes.json()
    const result = JSON.parse(aiData.choices[0].message.content)

    if (political.invest_israel && !result.political_warning) {
      result.political_warning = political.warning
      result.is_compliant = false
    }

    if (verifiedNutrition) {
      result.calories = verifiedNutrition.calories
      result.protein = verifiedNutrition.protein
      result.carbs = verifiedNutrition.carbs
      result.fat = verifiedNutrition.fat
      result.sugar = verifiedNutrition.sugar
      result.fiber = verifiedNutrition.fiber
    }

    return NextResponse.json({
      found: !!productData,
      barcode,
      type: productData?.type || 'unknown',
      is_verified: !!(medicationData?.is_verified || verifiedNutrition),
      is_from_cache: isFromCache,
      image_url: productData?.image_url,
      country_of_origin: productData?.country_of_origin,
      ...result,
    })
  } catch (error: any) {
    console.error('analyze-product-barcode error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
