import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { type, diet, number = 10, query } = await req.json()

    let url: string

    if (query && query.trim().length > 0) {
      url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
    } else {
      let category = 'Chicken'
      if (type === 'breakfast') category = 'Breakfast'
      else if (diet === 'Vegetarian') category = 'Vegetarian'
      else if (diet === 'Vegan') category = 'Vegan'
      else if (type === 'dessert') category = 'Dessert'
      else if (type === 'starter' || type === 'side dish') category = 'Starter'
      else {
        const mains = ['Chicken', 'Beef', 'Seafood', 'Pasta', 'Lamb']
        category = mains[Math.floor(Math.random() * mains.length)]
      }
      url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`
    }

    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok || !data.meals) {
      return NextResponse.json({ results: [], totalResults: 0 })
    }

    const results = data.meals.slice(0, number).map((m: any) => ({
      id: m.idMeal,
      title: m.strMeal,
      image: m.strMealThumb,
      readyInMinutes: 30,
      calories: 0,
    }))

    return NextResponse.json({ results, totalResults: results.length })
  } catch (error: any) {
    console.error('search-recipes error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
