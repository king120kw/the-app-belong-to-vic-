import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://www.themealdb.com/api/json/v1/1'

function resolveCategory(type: string, diet: string): string {
  switch (diet) {
    case 'Vegetarian': return 'Vegetarian'
    case 'Vegan': return 'Vegan'
  }

  switch (type) {
    case 'breakfast': return 'Breakfast'
    case 'dessert':
    case 'desserts': return 'Dessert'
    case 'starter':
    case 'side dish': return 'Starter'
    case 'snacks': return 'Side'
    default: {
      const mains = ['Chicken', 'Beef', 'Seafood', 'Pasta', 'Lamb']
      return mains[Math.floor(Math.random() * mains.length)]
    }
  }
}

function buildUrl(type: string, diet: string, query: string): string {
  if (query?.trim().length > 0) {
    return `${BASE}/search.php?s=${encodeURIComponent(query)}`
  }
  if (type === 'drinks') {
    return `${BASE}/search.php?s=smoothie`
  }
  return `${BASE}/filter.php?c=${resolveCategory(type, diet)}`
}

export async function POST(req: NextRequest) {
  try {
    const { type, diet, number = 10, query } = await req.json()

    const url = buildUrl(type, diet, query)
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
