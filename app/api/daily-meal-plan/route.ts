import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    // TheMealDB fallback API for daily plan
    const fetchCategory = async (category: string, num: number, isCocktail = false) => {
      try {
        const url = isCocktail 
          ? 'https://www.thecocktaildb.com/api/json/v1/1/filter.php?a=Non_Alcoholic'
          : `https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`;
          
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        const items = (isCocktail ? data.drinks : data.meals) || [];
        // Shuffle array
        const shuffled = items.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, num).map((m: any) => ({
            id: isCocktail ? m.idDrink : m.idMeal,
            title: isCocktail ? m.strDrink : m.strMeal,
            image: isCocktail ? m.strDrinkThumb : m.strMealThumb,
            calories: isCocktail ? Math.floor(Math.random() * (200 - 50 + 1)) + 50 : Math.floor(Math.random() * (600 - 300 + 1)) + 300,
            readyInMinutes: isCocktail ? 5 : 30
        }));
      } catch (err) {
        console.error(`Error fetching category ${category}:`, err);
        return [];
      }
    };

    const [breakfast, lunch, dinner, snacks, drinks, desserts] = await Promise.all([
      fetchCategory('Breakfast', 12),
      fetchCategory('Chicken', 12), // Lunch
      fetchCategory('Beef', 12), // Dinner
      fetchCategory('Starter', 6), // Snacks
      fetchCategory('Drink', 6, true), // Drinks from CocktailDB
      fetchCategory('Dessert', 6) // Desserts
    ]);

    return NextResponse.json({
      breakfast,
      lunch,
      dinner,
      snacks,
      drinks,
      desserts
    });

  } catch (error: any) {
    console.error('daily-meal-plan API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
