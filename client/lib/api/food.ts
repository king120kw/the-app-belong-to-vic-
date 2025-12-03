import { supabase } from '../supabase'

// ============================================================================
// FOOD SCANNING & ANALYSIS
// ============================================================================

export interface FoodAnalysisResult {
    name: string
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
    sugar?: number
    healthRating: number
    price?: number
    image_url: string
}

export const analyzeFoodImage = async (imageFile: File): Promise<FoodAnalysisResult> => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Upload image to storage
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${user.data.user.id}-${Date.now()}.${fileExt}`
    const filePath = `food-scans/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filePath, imageFile)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(filePath)

    // Call Edge Function for AI analysis
    const { data, error } = await supabase.functions.invoke('food-analysis', {
        body: { imageUrl: publicUrl }
    })

    if (error) throw error

    return {
        ...data,
        image_url: publicUrl
    }
}

export const scanProduct = async (barcode: string): Promise<FoodAnalysisResult> => {
    // Call Edge Function for product lookup
    const { data, error } = await supabase.functions.invoke('product-scanner', {
        body: { barcode }
    })

    if (error) throw error
    return data
}

export const saveFoodAnalysis = async (
    analysisData: FoodAnalysisResult,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // First, save or get the food item
    const { data: foodItem, error: foodError } = await supabase
        .from('food_items')
        .upsert({
            name: analysisData.name,
            calories: analysisData.calories,
            protein: analysisData.protein,
            carbs: analysisData.carbs,
            fat: analysisData.fat,
            fiber: analysisData.fiber,
            sugar: analysisData.sugar,
            health_rating: analysisData.healthRating,
            image_url: analysisData.image_url,
            price: analysisData.price,
        }, {
            onConflict: 'name',
            ignoreDuplicates: false
        })
        .select()
        .single()

    if (foodError) throw foodError

    // Save analysis history
    const { data: analysis, error: analysisError } = await supabase
        .from('food_analysis_history')
        .insert({
            user_id: user.data.user.id,
            food_item_id: foodItem.id,
            analysis_type: 'scan',
            image_url: analysisData.image_url,
            calories_consumed: analysisData.calories,
            price_paid: analysisData.price || 0,
            meal_type: mealType,
        })
        .select()
        .single()

    if (analysisError) throw analysisError

    // Update daily progress
    await updateDailyProgress(analysisData.calories, analysisData.price || 0)

    // Deduct from budget if price exists
    if (analysisData.price && analysisData.price > 0) {
        await deductFromBudget(analysisData.price, analysis.id)
    }

    return analysis
}

// ============================================================================
// FOOD HISTORY
// ============================================================================

export const getFoodHistory = async (limit = 20) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('food_analysis_history')
        .select(`
      *,
      food_items (*)
    `)
        .eq('user_id', user.data.user.id)
        .order('analyzed_at', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data
}

export const getFoodHistoryByDate = async (date: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
        .from('food_analysis_history')
        .select(`
      *,
      food_items (*)
    `)
        .eq('user_id', user.data.user.id)
        .gte('analyzed_at', startOfDay.toISOString())
        .lte('analyzed_at', endOfDay.toISOString())
        .order('analyzed_at', { ascending: false })

    if (error) throw error
    return data
}

// ============================================================================
// DAILY PROGRESS UPDATE
// ============================================================================

const updateDailyProgress = async (calories: number, budgetSpent: number) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const today = new Date().toISOString().split('T')[0]

    // Get or create today's progress
    const { data: existingProgress } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', user.data.user.id)
        .eq('progress_date', today)
        .single()

    if (existingProgress) {
        // Update existing
        await supabase
            .from('daily_progress')
            .update({
                calories_consumed: (existingProgress.calories_consumed || 0) + calories,
                meals_logged: (existingProgress.meals_logged || 0) + 1,
                budget_spent: (existingProgress.budget_spent || 0) + budgetSpent,
            })
            .eq('id', existingProgress.id)
    } else {
        // Get calorie goal from onboarding
        const { data: onboarding } = await supabase
            .from('onboarding_responses')
            .select('daily_calorie_goal')
            .eq('user_id', user.data.user.id)
            .single()

        // Create new
        await supabase
            .from('daily_progress')
            .insert({
                user_id: user.data.user.id,
                progress_date: today,
                calories_consumed: calories,
                calories_goal: onboarding?.daily_calorie_goal || 2000,
                meals_logged: 1,
                budget_spent: budgetSpent,
            })
    }
}

// ============================================================================
// BUDGET DEDUCTION
// ============================================================================

const deductFromBudget = async (amount: number, foodAnalysisId: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Get active budget
    const { data: budget } = await supabase
        .from('user_budgets')
        .select('*')
        .eq('user_id', user.data.user.id)
        .eq('is_active', true)
        .single()

    if (!budget) {
        console.warn('No active budget found')
        return
    }

    // Create transaction
    await supabase
        .from('budget_transactions')
        .insert({
            budget_id: budget.id,
            food_analysis_id: foodAnalysisId,
            amount: amount,
            description: 'Product purchase',
        })

    // Update remaining budget
    await supabase
        .from('user_budgets')
        .update({
            remaining_budget: budget.remaining_budget - amount,
        })
        .eq('id', budget.id)
}
