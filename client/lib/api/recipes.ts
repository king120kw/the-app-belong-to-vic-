import { supabase } from '../supabase'

// ============================================================================
// RECIPES
// ============================================================================

export const getRecipes = async (filters?: {
    cuisineType?: string
    difficulty?: 'easy' | 'medium' | 'hard'
    maxCalories?: number
    tags?: string[]
}) => {
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

export const getRecipeById = async (recipeId: string) => {
    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single()

    if (error) throw error
    return data
}

export const searchRecipes = async (searchTerm: string) => {
    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)

    if (error) throw error
    return data
}

// ============================================================================
// RECIPE INTERACTIONS
// ============================================================================

export const favoriteRecipe = async (recipeId: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('user_recipe_interactions')
        .insert({
            user_id: user.data.user.id,
            recipe_id: recipeId,
            interaction_type: 'favorited',
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export const markRecipeAsCooked = async (recipeId: string, notes?: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('user_recipe_interactions')
        .insert({
            user_id: user.data.user.id,
            recipe_id: recipeId,
            interaction_type: 'cooked',
            notes,
        })
        .select()
        .single()

    if (error) throw error

    // Update daily progress
    await updateDailyRecipeCount()

    return data
}

export const rateRecipe = async (recipeId: string, rating: number, notes?: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('user_recipe_interactions')
        .insert({
            user_id: user.data.user.id,
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

export const getFavoriteRecipes = async () => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('user_recipe_interactions')
        .select(`
      *,
      recipes (*)
    `)
        .eq('user_id', user.data.user.id)
        .eq('interaction_type', 'favorited')
        .order('interacted_at', { ascending: false })

    if (error) throw error
    return data
}

export const getCookedRecipes = async () => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('user_recipe_interactions')
        .select(`
      *,
      recipes (*)
    `)
        .eq('user_id', user.data.user.id)
        .eq('interaction_type', 'cooked')
        .order('interacted_at', { ascending: false })

    if (error) throw error
    return data
}

// ============================================================================
// PERSONALIZED RECOMMENDATIONS
// ============================================================================

export const getPersonalizedSuggestions = async () => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Call Edge Function for personalized recommendations
    const { data, error } = await supabase.functions.invoke('personalized-recommendations', {
        body: { userId: user.data.user.id }
    })

    if (error) throw error
    return data
}

export const getTimeBbasedSuggestions = async () => {
    const hour = new Date().getHours()
    let mealType: string

    if (hour >= 5 && hour < 11) {
        mealType = 'breakfast'
    } else if (hour >= 11 && hour < 17) {
        mealType = 'lunch'
    } else {
        mealType = 'dinner'
    }

    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Get onboarding preferences
    const { data: onboarding } = await supabase
        .from('onboarding_responses')
        .select('preferred_cuisines, daily_calorie_goal')
        .eq('user_id', user.data.user.id)
        .single()

    // Get recipes matching preferences and time
    let query = supabase
        .from('recipes')
        .select('*')
        .contains('tags', [mealType])

    if (onboarding?.preferred_cuisines && onboarding.preferred_cuisines.length > 0) {
        query = query.in('cuisine_type', onboarding.preferred_cuisines)
    }

    if (onboarding?.daily_calorie_goal) {
        const maxMealCalories = Math.floor(onboarding.daily_calorie_goal / 3)
        query = query.lte('total_calories', maxMealCalories)
    }

    const { data, error } = await query.limit(10)

    if (error) throw error
    return { mealType, recipes: data }
}

// ============================================================================
// HELPERS
// ============================================================================

const updateDailyRecipeCount = async () => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const today = new Date().toISOString().split('T')[0]

    const { data: existingProgress } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', user.data.user.id)
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
