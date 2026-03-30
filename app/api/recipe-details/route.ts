import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) throw new Error('ID is required')

    const supabase = createServerSupabaseClient()

    let parsedId = parseInt(id)
    if (isNaN(parsedId)) {
      console.warn(`ID ${id} is not numeric, skipping cache check.`)
      parsedId = 0
    }

    if (parsedId > 0) {
      const { data: existing } = await supabase.from('recipes').select('*').eq('spoonacular_id', parsedId).single()
      if (existing) return NextResponse.json(existing)
    }

    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
    const data = await res.json()

    if (!data.meals || data.meals.length === 0) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const meal = data.meals[0]

    const ingredients = []
    for (let i = 1; i <= 20; i++) {
      const item = meal[`strIngredient${i}`]
      const measure = meal[`strMeasure${i}`]
      if (item && item.trim()) {
        ingredients.push({ item: item.trim(), amount: 0, unit: measure ? measure.trim() : '', notes: '' })
      }
    }

    const instructions = meal.strInstructions
      ? meal.strInstructions.split(/\r\n|\n|\r/).filter((s: string) => s.trim().length > 0)
      : []

    const newRecipe = {
      title: meal.strMeal,
      description: `A delicious ${meal.strArea} ${meal.strCategory} dish.`,
      prep_time_minutes: 30,
      cook_time_minutes: 30,
      total_calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      image_url: meal.strMealThumb,
      cuisine_type: meal.strArea || 'International',
      difficulty: 'Medium',
      dietary_tags: [meal.strCategory || 'Main'],
      ingredients,
      instructions,
      spoonacular_id: parsedId > 0 ? parsedId : null,
    }

    if (parsedId > 0) {
      supabase.from('recipes').upsert(newRecipe, { onConflict: 'spoonacular_id' }).then()
    }

    return NextResponse.json({ ...newRecipe, id })
  } catch (error: any) {
    console.error('recipe-details error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
