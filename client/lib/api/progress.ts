import { supabase } from '../supabase'
// Removed gemini import

// ============================================================================
// PROGRESS MEASUREMENTS
// ============================================================================

export const addMeasurement = async (userId: string, weight: number, height?: number, notes?: string) => {
    const today = new Date().toISOString().split('T')[0]

    const { data: dataRows, error } = await supabase
        .from('progress_measurements')
        .upsert({
            user_id: userId,
            weight: weight,
            height: height,
            notes,
            measurement_date: today,
        }, {
            onConflict: 'user_id,measurement_date'
        })
        .select()
        .limit(1)

    if (error) throw error
    return dataRows && dataRows.length > 0 ? dataRows[0] : null
}

export const getMeasurements = async (userId: string, limit = 30) => {
    const { data, error } = await supabase
        .from('progress_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('measurement_date', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data
}

// ============================================================================
// DAILY PROGRESS
// ============================================================================

export const getDailyProgress = async (userId: string, date: string) => {
    const { data, error } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('progress_date', date)
        .limit(1)

    if (error) throw error
    return data && data.length > 0 ? data[0] : null
}

export const getProgressByDateRange = async (userId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .gte('progress_date', startDate)
        .lte('progress_date', endDate)
        .order('progress_date', { ascending: true })

    if (error) throw error
    return data
}

// ============================================================================
// DAILY SUMMARY (AI)
// ============================================================================

export const getDailySummary = async (userId: string) => {
    try {
        const { data, error } = await supabase.functions.invoke('daily-summary', {
            body: { userId }
        });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Failed to fetch daily summary:", error);
        return null;
    }
}

// ============================================================================
// MONTHLY ANALYSIS
// ============================================================================

export const getMonthlyAnalysis = async (userId: string, year: number, month: number) => {
    // Fetch measurements for the month
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data: measurements } = await supabase
        .from('progress_measurements')
        .select('*')
        .eq('user_id', userId)
        .gte('measurement_date', startDate)
        .lte('measurement_date', endDate)
        .order('measurement_date', { ascending: true })

    // Fetch milestones for the month
    const { data: milestones } = await (supabase
        .from('user_milestones' as any) as any)
        .select('*')
        .eq('user_id', userId)
        .gte('milestone_date', startDate)
        .lte('milestone_date', endDate);

    // Call Edge Function for monthly analysis
    try {
        console.log("Fetching monthly analysis from backend...");
        const { data, error: edgeError } = await supabase.functions.invoke('monthly-analysis', {
            body: {
                userId: userId,
                year,
                month,
                measurements,
                milestones,
                apiKey: import.meta.env.VITE_OPENAI_API_KEY
            }
        })

        if (edgeError) throw edgeError
        return data
    } catch (error) {
        console.error("Monthly analysis failed:", error);
        throw error;
    }
}

// ============================================================================
// CALENDAR HELPERS
// ============================================================================

export const getCalendarData = async (userId: string, year: number, month: number) => {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .gte('progress_date', startDate)
        .lte('progress_date', endDate)

    if (error) throw error
    return data
}

// ============================================================================
// FOOD LOGGING
// ============================================================================

export const logMeal = async (userId: string, mealData: any) => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Log to food analysis history
    const { data: analysisRows, error: analysisError } = await supabase
        .from('food_analysis_history')
        .insert({
            user_id: userId,
            image_url: mealData.mealImage,
            calories_consumed: mealData.totalCalories,
            notes: typeof mealData.analysis === 'string' ? mealData.analysis : JSON.stringify(mealData.analysis || mealData)
        })
        .select()
        .limit(1);

    if (analysisError) throw analysisError;

    const analysis = analysisRows && analysisRows.length > 0 ? analysisRows[0] : null;

    // 2. Add detailed food items
    if (mealData.foodItems && mealData.foodItems.length > 0) {
        const itemsToInsert = mealData.foodItems.map((item: any) => ({
            name: item.name,
            calories: item.calories,
            image_url: item.image
        }));

        const { error: itemsError } = await supabase
            .from('food_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;
    }

    // 3. Update daily progress
    const { data: progressRows } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('progress_date', today)
        .limit(1);

    const currentProgress = progressRows && progressRows.length > 0 ? progressRows[0] : null;

    if (currentProgress) {
        await supabase
            .from('daily_progress')
            .update({
                calories_consumed: (currentProgress.calories_consumed || 0) + mealData.totalCalories,
            })
            .eq('id', currentProgress.id);
    } else {
        // Get goal from profile
        const { data: profileRows } = await supabase
            .from('user_profiles')
            .select('goal_calories')
            .eq('id', userId)
            .limit(1);

        const profile = profileRows && profileRows.length > 0 ? profileRows[0] : null;

        await supabase
            .from('daily_progress')
            .insert({
                user_id: userId,
                progress_date: today,
                calories_consumed: mealData.totalCalories,
                calories_goal: profile?.goal_calories || 2000
            });
    }

    return analysis;
};

// ============================================================================
// MILESTONES (Calendar)
// ============================================================================

export const upsertMilestone = async (userId: string, date: Date, data: any) => {
    const dateString = date.toISOString().split('T')[0];

    const { data: milestoneRows, error } = await (supabase
        .from('user_milestones' as any) as any)
        .upsert({
            user_id: userId,
            milestone_date: dateString,
            ...data,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id,milestone_date'
        })
        .select()
        .limit(1);

    if (error) throw error;
    return milestoneRows && milestoneRows.length > 0 ? milestoneRows[0] : null;
};

export const getMilestone = async (userId: string, date: Date) => {
    const dateString = date.toISOString().split('T')[0];

    const { data, error } = await (supabase
        .from('user_milestones' as any) as any)
        .select('*')
        .eq('user_id', userId)
        .eq('milestone_date', dateString)
        .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
};
