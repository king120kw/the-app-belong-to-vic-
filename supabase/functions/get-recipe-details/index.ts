
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { id } = await req.json()
        if (!id) throw new Error("ID is required")

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse ID safely
        let parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            // If ID is completely non-numeric (unlikely for MealDB), we can't key it by spoonacular_id logic.
            // Just treat it as 0 or handle separately?
            // MealDB IDs are usually 5 digits.
            console.warn(`ID ${id} is not numeric, skipping cache check.`);
            parsedId = 0;
        }

        // Cache Check
        if (parsedId > 0) {
            const { data: existing } = await supabase.from('recipes').select('*').eq('spoonacular_id', parsedId).single();
            if (existing) {
                return new Response(JSON.stringify(existing), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        // Fetch from TheMealDB
        const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;
        console.log(`Fetching detail from TheMealDB: ${url}`);
        const res = await fetch(url);
        const data = await res.json();

        if (!data.meals || data.meals.length === 0) {
            // Return 404 behavior but with JSON
            return new Response(JSON.stringify({ error: "Recipe not found" }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const meal = data.meals[0];

        // Normalize
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            const item = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];
            if (item && item.trim()) {
                ingredients.push({
                    item: item.trim(),
                    amount: 0,
                    unit: measure ? measure.trim() : '',
                    notes: ''
                });
            }
        }

        const instructions = meal.strInstructions
            ? meal.strInstructions.split(/\r\n|\n|\r/).filter((s: string) => s.trim().length > 0)
            : [];

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
            difficulty: 'Medium', // Constraint?
            dietary_tags: [meal.strCategory || 'Main'],
            ingredients: ingredients,
            instructions: instructions,
            spoonacular_id: parsedId > 0 ? parsedId : null
        };

        // Try to save to DB, but don't fail request if DB fails
        if (parsedId > 0) {
            const { error: upsertError } = await supabase
                .from('recipes')
                .upsert(newRecipe, { onConflict: 'spoonacular_id' });

            if (upsertError) {
                console.error("Upsert failed, but returning data anyway:", upsertError);
                // We return the constructed object so the UI still works
            }
        }

        // Always return the data
        return new Response(JSON.stringify({ ...newRecipe, id: id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error) {
        console.error("Error in get-recipe-details:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
