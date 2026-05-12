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

    const results = data.meals.slice(0, number).map((m: any) => {
      const title = m.strMeal.toLowerCase();
      let baseCalories = 350;
      
      if (title.includes('chicken') || title.includes('beef') || title.includes('lamb') || title.includes('steak')) baseCalories += 250;
      if (title.includes('salad') || title.includes('vegetable') || title.includes('soup')) baseCalories -= 150;
      if (title.includes('cake') || title.includes('pie') || title.includes('pudding') || title.includes('sweet')) baseCalories += 300;
      if (title.includes('pasta') || title.includes('rice') || title.includes('bread') || title.includes('burger')) baseCalories += 200;
      if (title.includes('fish') || title.includes('seafood') || title.includes('shrimp')) baseCalories += 100;
      
      const calories = baseCalories + (Math.floor(Math.random() * 100) - 50);

      return {
        id: m.idMeal,
        title: m.strMeal,
        image: m.strMealThumb,
        readyInMinutes: 20 + Math.floor(Math.random() * 40),
        calories: Math.max(100, calories),
      };
    })

    return NextResponse.json({ results, totalResults: results.length })
  } catch (error: any) {
    console.error('search-recipes error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
