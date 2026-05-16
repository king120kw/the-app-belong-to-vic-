import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { type, diet, number = 10, query, userId } = await req.json()
    const supabase = createServerSupabaseClient()

    let userContext = ""
    if (userId) {
      const [profileRes, onboardingRes, settingsRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('onboarding_responses').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      ])
      
      const profile = onboardingRes.data
      const settings = settingsRes.data
      const userProfile = profileRes.data

      if (profile) {
        userContext = `
User Profile:
- Goal: ${profile.goal}
- Diet: ${JSON.stringify(profile.dietary_lifestyle)}
- Preferred Cuisines: ${JSON.stringify(profile.preferred_cuisines)}
- Restrictions: ${JSON.stringify(profile.restrictions)}
- Health Conditions: ${profile.health_conditions}
- Daily Calorie Goal: ${profile.daily_calorie_goal}
`
      }

      if (settings) {
        userContext += `\nUser Location/Preferences:
- Country Code: ${settings.country_code || 'Unknown'}
- Language: ${settings.language || 'Unknown'}
- Currency: ${settings.currency || 'Unknown'}`
      }
    }

    const prompt = `
Generate ${number} highly personalized recipe suggestions for a user of the Vicalary health app.
The suggestions are for the category: "${type || 'main course'}".
${query ? `The user specifically searched for: "${query}"` : ""}
${userContext}

Rules:
1. MUST be appropriate for the category (${type}). (e.g., No heavy meals for "snacks" or "desserts").
2. CRITICAL: The meals MUST be strictly accurate and NOT hallucinated.
3. Ensure recipes are culturally appropriate based on the user's Location/Preferences (especially country code/language) and prioritizing their background.
4. Ensure variety and healthy options aligned with goals.
5. Output ONLY valid JSON in this format:
{
  "results": [
    {
      "id": "ai_gen_[unique_string]",
      "title": "Recipe Name",
      "image": "https://images.unsplash.com/photo-[relevant-id]?auto=format&fit=crop&w=800&q=80",
      "readyInMinutes": 30,
      "calories": 450,
      "protein": 25,
      "carbs": 50,
      "fat": 15
    }
  ]
}

Use high-quality Unsplash image URLs related to the dish.
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "You are a professional nutritionist and personal cook." }, { role: "user", content: prompt }],
      response_format: { type: "json_object" }
    })

    const content = response.choices[0].message.content
    const results = JSON.parse(content || '{"results": []}')

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('search-recipes error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
