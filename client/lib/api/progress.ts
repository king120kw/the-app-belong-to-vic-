import { supabase } from '../supabase'

// ============================================================================
// PROGRESS MEASUREMENTS
// ============================================================================

export const addMeasurement = async (weight: number, height?: number, notes?: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('progress_measurements')
        .upsert({
            user_id: user.data.user.id,
            weight,
            height,
            notes,
            measurement_date: today,
        }, {
            onConflict: 'user_id,measurement_date'
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export const getMeasurements = async (limit = 30) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('progress_measurements')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('measurement_date', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data
}

// ============================================================================
// DAILY PROGRESS
// ============================================================================

export const getDailyProgress = async (date: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', user.data.user.id)
        .eq('progress_date', date)
        .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
}

export const getProgressByDateRange = async (startDate: string, endDate: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', user.data.user.id)
        .gte('progress_date', startDate)
        .lte('progress_date', endDate)
        .order('progress_date', { ascending: true })

    if (error) throw error
    return data
}

// ============================================================================
// MONTHLY ANALYSIS
// ============================================================================

export const getMonthlyAnalysis = async (year: number, month: number) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Call Edge Function for monthly analysis
    const { data, error } = await supabase.functions.invoke('monthly-analysis', {
        body: { userId: user.data.user.id, year, month }
    })

    if (error) throw error
    return data
}

// ============================================================================
// CALENDAR HELPERS
// ============================================================================

export const getCalendarData = async (year: number, month: number) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', user.data.user.id)
        .gte('progress_date', startDate)
        .lte('progress_date', endDate)

    if (error) throw error
    return data
}
