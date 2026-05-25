import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
    try {
        const { userId, sessionType } = await req.json();
        
        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();
        
        // 1. Fetch User Profile for filtering
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('dietary_lifestyle, goal')
            .eq('id', userId)
            .maybeSingle();
            
        const diet = Array.isArray(userProfile?.dietary_lifestyle) ? userProfile.dietary_lifestyle : [];
        const isVegan = diet.includes('Vegan');
        const isVegetarian = diet.includes('Vegetarian');
        const isHalal = diet.includes('Halal');
        
        // 2. Fetch Interaction Memory from daily_meal_served (to prevent duplication)
        // Find recipes shown in the last 48 hours
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { data: recentInteractions } = await supabase
            .from('daily_meal_served')
            .select('meal_id')
            .eq('user_id', userId)
            .gte('shown_date', fortyEightHoursAgo);
            
        const recentlyShownIds = (recentInteractions || []).map(i => i.meal_id);
        
        // 3. Query Internal Cached Recipes
        let query = supabase.from('cached_recipes').select('*');
        
        // Dynamic Filtering based on session and preferences
        const st = (sessionType || '').toLowerCase();
        if (st === 'breakfast') {
            query = query.eq('meal_type', 'Breakfast');
        } else if (st === 'desserts' || st === 'dessert') {
            query = query.eq('meal_type', 'Dessert');
        } else {
            // Lunch/Dinner/Snacks: avoid breakfast and dessert
            query = query.neq('meal_type', 'Breakfast').neq('meal_type', 'Dessert');
        }
        
        if (isVegan) query = query.eq('health_goal', 'Weight Loss'); 
        
        const { data: pool, error: poolError } = await query;
        
        if (poolError) {
            console.error("Pool fetch error:", poolError);
            throw new Error("Failed to fetch from internal pool");
        }
        
        let availableRecipes = pool || [];
        
        // 4. Behavioral Rotation Filter
        if (recentlyShownIds.length > 0) {
            // Remove recently shown to ensure zero duplication
            const filtered = availableRecipes.filter(r => !recentlyShownIds.includes(String(r.id)));
            // Only apply strict filter if we still have enough recipes (fallback to full pool if empty)
            if (filtered.length >= 12) {
                availableRecipes = filtered;
            }
        }
        
        // 5. Intelligent Localization & Goal Sorting
        const { data: userSettings } = await supabase.from('user_settings').select('timezone').eq('user_id', userId).maybeSingle();
        const userTz = userSettings?.timezone || '';
        const isAsianTimezone = userTz.includes('Asia/');
        const isIndonesian = userTz.includes('Jakarta') || userTz.includes('Makassar') || userTz.includes('Jayapura');
        
        availableRecipes = availableRecipes.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            
            // Localization Boost
            const asianCuisines = ['Indonesian', 'Malaysian', 'Thai', 'Asian', 'Chinese', 'Japanese', 'Korean'];
            if (isIndonesian && a.cuisine_region === 'Indonesian') scoreA += 15;
            if (isIndonesian && b.cuisine_region === 'Indonesian') scoreB += 15;
            if (isAsianTimezone && asianCuisines.includes(a.cuisine_region)) scoreA += 10;
            if (isAsianTimezone && asianCuisines.includes(b.cuisine_region)) scoreB += 10;

            // Goal Alignment Boost
            if (userProfile?.goal === 'Weight Loss') {
                if ((a.nutrition?.calories || 999) < 500) scoreA += 5;
                if ((b.nutrition?.calories || 999) < 500) scoreB += 5;
            } else if (userProfile?.goal === 'Muscle Gain') {
                if ((a.nutrition?.protein || 0) > 30) scoreA += 5;
                if ((b.nutrition?.protein || 0) > 30) scoreB += 5;
            }
            
            // Controlled Randomness (Jitter) to prevent stale recommendations
            scoreA += Math.random() * 4;
            scoreB += Math.random() * 4;
            
            return scoreB - scoreA;
        });
        
        const selected = availableRecipes.slice(0, 12);
        
        // Normalize to the frontend unified schema expected by BankConnectionWidget/Recipes
        const unifiedRecipes = selected.map(r => ({
            external_id: r.id,
            provider: r.provider,
            title: r.title,
            image_url: r.image_url,
            cuisine_type: r.cuisine_region,
            difficulty: 'Medium',
            dietary_tags: diet,
            ingredients: typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : (r.ingredients || []),
            instructions: typeof r.instructions_steps === 'string' ? JSON.parse(r.instructions_steps) : (r.instructions_steps || []),
            prep_time_minutes: r.preparation_time,
            cook_time_minutes: 0,
            total_calories: r.nutrition?.calories || 0,
            protein_g: r.nutrition?.protein || 0,
            carbs_g: r.nutrition?.carbs || 0,
            fat_g: r.nutrition?.fat || 0,
            estimated_cost: 0.00,
            id: String(r.id)
        }));
        
        // 6. Record Interactions async to prevent blocking
        if (unifiedRecipes.length > 0) {
            const adminSupabase = createServerSupabaseClient();
            
            const interactions = unifiedRecipes.map(r => ({
                user_id: userId,
                meal_id: r.id
            }));
            
            if (interactions.length > 0) {
                // Upsert to handle unique constraint (user_id, meal_id)
                adminSupabase.from('daily_meal_served').upsert(interactions, { onConflict: 'user_id, meal_id' }).then(({error}) => {
                    if(error) console.error("Rotation save error:", error);
                });
            }
        }
        
        return NextResponse.json({ recipes: unifiedRecipes });
        
    } catch (error) {
        console.error('Error generating recommendations:', error);
        return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
    }
}
