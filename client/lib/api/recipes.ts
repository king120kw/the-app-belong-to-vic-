import { supabase } from '../supabase'
// Removed gemini import

// ============================================================================
// RECIPES
// ============================================================================

export const getRecipes = async (filters?: {
    cuisineType?: string
    difficulty?: 'easy' | 'medium' | 'hard'
    maxCalories?: number
    tags?: string[]
}) => {
    // Check if we should use the Search Edge Function or local DB
    // For now, let's proxy through search-recipes if filters exist that mimic search
    if (filters) {
        const { data, error } = await supabase.functions.invoke('search-recipes', {
            body: {
                type: 'main course',
                dict: filters.cuisineType,
                // ... map other filters
                number: 20
            }
        })
        if (!error && data?.results) return data.results;
    }

    // Fallback to local DB
    let query = supabase
        .from('recipes')
        .select('*')

    if (filters) {
        if (filters.cuisineType) {
            query = query.eq('cuisine_type', filters.cuisineType)
        }
        if (filters.difficulty) {
            query = query.eq('difficulty', filters.difficulty)
        }
        if (filters.maxCalories) {
            query = query.lte('total_calories', filters.maxCalories)
        }
        if (filters.tags && filters.tags.length > 0) {
            query = query.contains('tags', filters.tags)
        }
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export const getRecipeDetails = async (recipeId: string | number) => {
    try {
        console.log(`Fetching details for ${recipeId}...`);
        const { data, error } = await supabase.functions.invoke('get-recipe-details', {
            body: { id: recipeId?.toString() }
        });

        if (error || !data || data.error) throw error || new Error(data?.error || "Failed to fetch details");
        return data;
    } catch (e) {
        console.warn("Edge Function failed.", e);

        // Fallback: Try fetching from meals table (legacy) ONLY if ID is non-numeric (UUID)
        // TheMealDB IDs are numeric (e.g. 52772), while legacy meals use UUIDs.
        if (isNaN(parseInt(String(recipeId)))) {
            const { data: meal, error: mealError } = await supabase
                .from('meals')
                .select('*')
                .eq('id', String(recipeId))
                .maybeSingle()

            if (mealError) throw mealError;

            if (meal) {
                // Cast meal to any to avoid strict type checks for missing optional fields that we know might exist in legacy data or we are polyfilling
                const m = meal as any;
                return {
                    ...m,
                    title: m.name,
                    total_calories: m.calories,
                    image_url: m.image,
                    ingredients: m.ingredients || [],
                    instructions: m.instructions || []
                };
            }
        }

        // If numeric ID failed Edge Function, it's a hard error.
        throw e;
    }
}

export const searchRecipes = async (searchTerm: string) => {
    try {
        const { data, error } = await supabase.functions.invoke('search-recipes', {
            body: { query: searchTerm, number: 12 }
        })
        if (error) throw error;
        return data.results || [];
    } catch (error) {
        console.warn("Search Edge Function failed, using local fallback");
        const { data, error: dbError } = await supabase
            .from('recipes')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)

        if (dbError) throw dbError;
        return data;
    }
}

// ============================================================================
// RECIPE INTERACTIONS
// ============================================================================

export const toggleFavoriteRecipe = async (userId: string, recipeId: string) => {
    const { data: existing } = await supabase
        .from('user_recipe_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('recipe_id', recipeId)
        .eq('interaction_type', 'favorited')
        .single()

    if (existing) {
        await supabase
            .from('user_recipe_interactions')
            .delete()
            .eq('id', existing.id)
        return { favorited: false }
    } else {
        await supabase
            .from('user_recipe_interactions')
            .insert({
                user_id: userId,
                recipe_id: recipeId,
                interaction_type: 'favorited',
            })
        return { favorited: true }
    }
}

export const markRecipeAsCooked = async (userId: string, recipeId: string, notes?: string) => {
    const { data, error } = await supabase
        .from('user_recipe_interactions')
        .insert({
            user_id: userId,
            recipe_id: recipeId,
            interaction_type: 'cooked',
            notes,
        })
        .select()
        .single()

    if (error) throw error

    // Update daily progress
    await updateDailyRecipeCount(userId)

    return data
}

export const rateRecipe = async (userId: string, recipeId: string, rating: number, notes?: string) => {
    const { data, error } = await supabase
        .from('user_recipe_interactions')
        .insert({
            user_id: userId,
            recipe_id: recipeId,
            interaction_type: 'rated',
            rating,
            notes,
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export const getFavoriteRecipes = async (userId: string) => {
    const { data, error } = await supabase
        .from('user_recipe_interactions')
        .select(`
      *,
      recipes (*)
    `)
        .eq('user_id', userId)
        .eq('interaction_type', 'favorited')
        .order('interacted_at', { ascending: false })

    if (error) throw error
    return data
}

export const getCookedRecipes = async (userId: string) => {
    const { data, error } = await supabase
        .from('user_recipe_interactions')
        .select(`
      *,
      recipes (*)
    `)
        .eq('user_id', userId)
        .eq('interaction_type', 'cooked')
        .order('interacted_at', { ascending: false })

    if (error) throw error
    return data
}

// ============================================================================
// PERSONALIZED RECOMMENDATIONS
// ============================================================================

export const getPersonalizedSuggestions = async (userId: string) => {
    // Get user profile and onboarding responses for context
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

    const { data: onboarding } = await (supabase
        .from('onboarding_responses')
        .select('*')
        .eq('user_id', userId)
        .single() as any);

    // Call recommendations Edge Function
    try {
        console.log("Fetching personalized suggestions from backend...");
        const { data, error: edgeError } = await supabase.functions.invoke('personalized-recommendations', {
            body: {
                userId: userId,
                apiKey: import.meta.env.VITE_OPENAI_API_KEY
            }
        })

        if (edgeError) throw edgeError
        return data
    } catch (error) {
        console.error("Recommendations failed:", error);
        throw error;
    }
}

export const getDailyMealSuggestions = async (userId: string) => {
    const { data: onboarding } = await supabase
        .from('onboarding_responses')
        .select('preferred_cuisines, daily_calorie_goal, restrictions, dietary_lifestyle')
        .eq('user_id', userId)
        .maybeSingle() as any

    // Determine current session for UI highlighting
    const localHour = new Date().getHours();
    let currentSession: 'breakfast' | 'lunch' | 'dinner' = 'breakfast';
    if (localHour >= 11 && localHour < 16) currentSession = 'lunch';
    else if (localHour >= 16 || localHour < 4) currentSession = 'dinner';

    const fetchFromApi = async (type: string, queryTerm: string) => {
        try {
            const isValidImage = (url: string) => {
                if (!url) return false;
                if (url.includes('placeholder')) return false;
                if (url.startsWith('https://spoonacular.com/recipeImages/') && url.endsWith('-312x231.unknown')) return false;
                return true;
            };

            // Mapping for Indonesian terms and Spoonacular compatibility
            const mapDiet = (diet: string | undefined) => {
                if (!diet) return undefined;
                if (diet === 'Halal') return undefined; // Spoonacular doesn't have Halal diet, handle via query if needed
                return diet;
            };

            const mapRestrictions = (restrictions: string[] | undefined) => {
                if (!restrictions) return { intolerances: undefined, excludeIngredients: undefined };

                const validIntolerances = ['dairy', 'egg', 'gluten', 'grain', 'peanut', 'seafood', 'sesame', 'shellfish', 'soy', 'sulfite', 'tree nut', 'wheat'];
                const mapping: Record<string, string> = {
                    'Babi': 'pork',
                    'Kacang-kacangan': 'peanut,tree nut',
                    'Makanan Laut': 'seafood,shellfish',
                    'Susu': 'dairy',
                    'Telur': 'egg',
                    'Gandum': 'wheat,gluten',
                    'Kedelai': 'soy'
                };

                const mapped = restrictions.flatMap(r => (mapping[r] || r).toLowerCase().split(','));
                const intolerances = mapped.filter(r => validIntolerances.includes(r)).join(',');
                const excludeIngredients = mapped.filter(r => !validIntolerances.includes(r)).join(',');

                return {
                    intolerances: intolerances || undefined,
                    excludeIngredients: excludeIngredients || undefined
                };
            };

            const dietParam = (onboarding?.dietary_lifestyle && onboarding.dietary_lifestyle.length > 0) ? onboarding.dietary_lifestyle[0] : undefined;
            const restrictions = mapRestrictions(onboarding?.restrictions);

            const requestBody = {
                type: type || 'main course',
                diet: mapDiet(dietParam),
                number: 10
            };

            console.log("Invoking search-recipes with sanitized body:", requestBody);

            const { data: { session } } = await supabase.auth.getSession();
            const { data, error } = await supabase.functions.invoke('search-recipes', {
                body: requestBody,
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });

            if (error) {
                console.error(`Edge Function search-recipes error for ${type}:`, error);
                // Log full error object to console for deep inspection
                console.dir(error);
                if (error.message) {
                    console.error(`Error details: ${error.message}`);
                }
                throw error;
            }

            if (!data) {
                console.error(`No data returned from search-recipes for ${type}`);
                return [];
            }

            const uniqueIds = new Set();
            return (data?.results || [])
                .filter((m: any) => {
                    if (!m.image || !isValidImage(m.image)) return false;
                    if (uniqueIds.has(m.id)) return false;
                    uniqueIds.add(m.id);
                    return true;
                })
                .slice(0, 5)
                .map((m: any) => ({
                    ...m,
                    name: m.title,
                    calories: m.calories,
                    subtitle: `${m.calories} cal`,
                    image: m.image
                }));
        } catch (e) {
            console.error(`API fetch failed for ${type}`, e);
            return [];
        }
    };

    // Parallel fetch from backend
    const [rawBreakfast, rawLunch, rawDinner] = await Promise.all([
        fetchFromApi('breakfast', 'healthy breakfast'),
        fetchFromApi('main course', 'healthy lunch'),
        fetchFromApi('main course', 'light dinner')
    ]);

    // Strict Deduplication Logic
    const seenIds = new Set<string>();

    // 1. Process Breakfast
    const breakfast = rawBreakfast.filter((m: any) => {
        if (seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        return true;
    });

    // 2. Process Lunch (ensure no repeats from Breakfast)
    const lunch = rawLunch.filter((m: any) => {
        if (seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        return true;
    });

    // 3. Process Dinner (ensure no repeats from Breakfast or Lunch)
    const dinner = rawDinner.filter((m: any) => {
        if (seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        return true;
    });

    // Fallback to local 'meals' table if API returns empty (e.g., no key)
    if (breakfast.length === 0 && lunch.length === 0) {
        console.warn("Using local fallback for suggestions");
        // Reuse old logic here slightly modified
        const fetchLocal = async (type: string) => {
            const { data } = await supabase.from('meals').select('*').eq('meal_type', type).limit(15); // Increased limit for dedup
            return (data || [])
                .filter((m: any) => m.image && !m.image.includes('placeholder'))
                .map((m: any) => ({ ...m, subtitle: `${m.calories} cal`, image: m.image }));
        };
        const [fb, fl, fd] = await Promise.all([fetchLocal('breakfast'), fetchLocal('lunch'), fetchLocal('dinner')]);

        // Apply same deduplication to fallback
        const seenLocal = new Set<string>();
        const cleanFb = fb.filter((m: any) => { if (seenLocal.has(m.id)) return false; seenLocal.add(m.id); return true; }).slice(0, 6);
        const cleanFl = fl.filter((m: any) => { if (seenLocal.has(m.id)) return false; seenLocal.add(m.id); return true; }).slice(0, 6);
        const cleanFd = fd.filter((m: any) => { if (seenLocal.has(m.id)) return false; seenLocal.add(m.id); return true; }).slice(0, 6);

        return { breakfast: cleanFb, lunch: cleanFl, dinner: cleanFd, currentSession };
    }

    return { breakfast, lunch, dinner, currentSession }
}

// ============================================================================
// HELPERS
// ============================================================================

const updateDailyRecipeCount = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0]

    const { data: existingProgress } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('progress_date', today)
        .single()

    if (existingProgress) {
        await supabase
            .from('daily_progress')
            .update({
                recipes_cooked: (existingProgress.recipes_cooked || 0) + 1,
            })
            .eq('id', existingProgress.id)
    }
}
