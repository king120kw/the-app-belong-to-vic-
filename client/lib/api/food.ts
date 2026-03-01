import { supabase } from '../supabase'
// Removed gemini import as it is now strictly backend-driven via Edge Functions

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

export const analyzeFoodImage = async (userId: string, file: File) => {
    try {
        console.log("Analyzing image with backend Edge Function...");

        // 1. Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('food-images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('food-images')
            .getPublicUrl(filePath);

        // 2. Invoke Edge Function (Send Key explicitly to bypass server secret issues)
        const { data, error } = await supabase.functions.invoke('food-analysis', {
            body: {
                imageUrl: publicUrl,
                apiKey: import.meta.env.VITE_OPENAI_API_KEY
            }
        });

        if (error) throw error;

        // Handle structured error responses from Edge Function
        if (data && data.error) {
            console.warn('Edge Function returned structured error:', data.error);
            // Return the structured error response (has fallback values)
            return { ...data, image_url: publicUrl };
        }

        if (data && data.name) {
            return { ...data, image_url: publicUrl };
        }

        throw new Error("Invalid response from AI analysis");
    } catch (error) {
        console.error("AI analysis failed:", error);
        throw error;
    }
}

export const scanProduct = async (userId: string, barcode: string) => {
    const { data, error: edgeError } = await supabase.functions.invoke('product-scanner', {
        body: {
            barcode,
            userId: userId,
            apiKey: import.meta.env.VITE_OPENAI_API_KEY
        }
    })

    if (edgeError) throw edgeError
    return data
}

export const saveFoodAnalysis = async (userId: string, analysis: any) => {
    // 1. Save food item
    const { data: foodItemRows, error: foodError } = await (supabase
        .from('food_items') as any)
        .insert({
            name: analysis.name,
            calories: analysis.calories,
            protein: analysis.protein,
            carbs: analysis.carbs,
            fat: analysis.fat,
            fiber: analysis.fiber,
            sugar: analysis.sugar,
            health_rating: analysis.healthRating,
            serving_size: analysis.serving_size || '1 serving',
            image_url: analysis.image_url || analysis.mealImage,
        })
        .select()
        .limit(1)

    if (foodError) throw foodError
    const foodItem = foodItemRows && foodItemRows.length > 0 ? foodItemRows[0] : null;

    // 2. Save to history
    const { data: historyRows, error: historyError } = await supabase
        .from('food_analysis_history')
        .insert({
            user_id: userId,
            food_item_id: foodItem.id,
            meal_type: analysis.meal_type || 'snack',
            calories_consumed: analysis.calories,
            image_url: analysis.image_url || analysis.mealImage,
            notes: analysis.analysis || analysis.advice
        })
        .select()
        .limit(1)

    if (historyError) throw historyError
    const history = historyRows && historyRows.length > 0 ? historyRows[0] : null;

    // 3. Update daily progress
    await updateDailyProgress(userId, analysis.calories)

    return history
}

// ============================================================================
// HISTORY & RECENT
// ============================================================================

export const getFoodHistory = async (userId: string, limit = 50) => {
    const { data, error } = await supabase
        .from('food_analysis_history')
        .select(`
      *,
      food_items (*)
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data
}

export const getRecentMeals = async (userId: string, limit = 10) => {
    const { data, error } = await supabase
        .from('food_analysis_history')
        .select(`
            *,
            food_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

// ============================================================================
// DAILY PROGRESS UPDATE
// ============================================================================

const updateDailyProgress = async (userId: string, calories: number) => {
    const today = new Date().toISOString().split('T')[0]

    const { data: existingProgress } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('progress_date', today)
        .maybeSingle()

    if (existingProgress) {
        await supabase
            .from('daily_progress')
            .update({
                calories_consumed: (existingProgress.calories_consumed || 0) + calories,
                meals_logged: (existingProgress.meals_logged || 0) + 1,
            })
            .eq('id', existingProgress.id)
    } else {
        // Get user calorie goal
        const { data: onboarding } = await supabase
            .from('onboarding_responses')
            .select('daily_calorie_goal')
            .eq('user_id', userId)
            .maybeSingle()

        await supabase
            .from('daily_progress')
            .insert({
                user_id: userId,
                progress_date: today,
                calories_consumed: calories,
                calories_goal: onboarding?.daily_calorie_goal || 2000,
                meals_logged: 1,
            })
    }
}
