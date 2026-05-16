import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) throw new Error('ID is required')

    const supabase = createServerSupabaseClient()

    // 1. Check local DB cache first
    const { data: existing } = await supabase
      .from('recipes')
      .select('*')
      .or(`id.eq.${id},spoonacular_id.eq.${id}`)
      .maybeSingle()

    if (existing && existing.ingredients?.length > 0 && existing.instructions?.length > 0) {
      return NextResponse.json(existing)
    }

    // 2. If it's an AI ID or missing details, use OpenAI to generate full details
    const isAiGen = String(id).startsWith('ai_gen_')
    const titleHint = existing?.title || id

    const prompt = `
Generate full recipe details for: "${titleHint}".
Provide ingredients with exact quantities, step-by-step instructions, nutritional information, prep time, cook time, and servings.

Output ONLY valid JSON in this format:
{
  "title": "Exact Dish Name",
  "description": "Short appetizing description",
  "prep_time_minutes": 15,
  "cook_time_minutes": 20,
  "total_calories": 450,
  "protein_g": 25,
  "carbs_g": 55,
  "fat_g": 12,
  "servings": 2,
  "ingredients": [
    { "item": "Ingredient Name", "amount": "1", "unit": "cup", "notes": "finely chopped" }
  ],
  "instructions": [
    "Step 1 details",
    "Step 2 details"
  ],
  "cuisine_type": "Indonesian/International",
  "difficulty": "Easy/Medium/Hard",
  "dietary_tags": ["Healthy", "Protein-rich"]
}
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "You are a professional personal cook and nutritionist." }, { role: "user", content: prompt }],
      response_format: { type: "json_object" }
    })

    const details = JSON.parse(response.choices[0].message.content || '{}')
    
    // 3. Upsert to DB for caching
    const recipeToCache = {
      ...details,
      spoonacular_id: isAiGen ? null : id,
      image_url: existing?.image_url || details.image_url || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80`
    }

    const { data: saved, error: saveError } = await supabase
      .from('recipes')
      .upsert(recipeToCache, { onConflict: isAiGen ? undefined : 'spoonacular_id' })
      .select()
      .single()

    if (saveError) console.error("Error caching recipe:", saveError)

    return NextResponse.json(saved || recipeToCache)

  } catch (error: any) {
    console.error('recipe-details error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
