
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { type, diet, number = 10, query } = await req.json()

        let url;

        if (query && query.trim().length > 0) {
            // Text search takes precedence
            console.log(`Searching TheMealDB by text: ${query}`);
            url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;
        } else {
            // Category filter logic
            url = 'https://www.themealdb.com/api/json/v1/1/filter.php?';
            let category = 'Chicken'; // Default

            if (type === 'breakfast') {
                category = 'Breakfast';
            } else if (diet === 'Vegetarian') {
                category = 'Vegetarian';
            } else if (diet === 'Vegan') {
                category = 'Vegan';
            } else if (type === 'dessert') {
                category = 'Dessert';
            } else if (type === 'starter' || type === 'side dish') {
                category = 'Starter';
            } else {
                // Main course rotation
                const mains = ['Chicken', 'Beef', 'Seafood', 'Pasta', 'Lamb'];
                // Deterministic pick based on day of year to ensure consistency across re-renders?
                // Or just random. Random is fine for now as long as it returns valid data.
                category = mains[Math.floor(Math.random() * mains.length)];
            }
            url += `c=${category}`;
        }

        console.log(`Fetching from TheMealDB: ${url}`);
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.meals) {
            console.warn("TheMealDB returned no results.");
            return new Response(JSON.stringify({ results: [], totalResults: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const results = data.meals.slice(0, number).map((m: any) => ({
            id: m.idMeal,
            title: m.strMeal,
            image: m.strMealThumb,
            readyInMinutes: 30, // Placeholder
            calories: 0, // Placeholder
        }));

        return new Response(
            JSON.stringify({ results: results, totalResults: results.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("Error in search-recipes:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
