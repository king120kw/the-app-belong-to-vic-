import { supabase } from '../supabase'

// ============================================================================
// BUDGET MANAGEMENT
// ============================================================================

export const createBudget = async (
    totalBudget: number,
    periodStart: string,
    periodEnd: string,
    currency = 'USD'
) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Deactivate any existing budgets for this period
    await supabase
        .from('user_budgets')
        .update({ is_active: false })
        .eq('user_id', user.data.user.id)
        .eq('is_active', true)

    const { data, error } = await supabase
        .from('user_budgets')
        .insert({
            user_id: user.data.user.id,
            total_budget: totalBudget,
            remaining_budget: totalBudget,
            currency,
            period_start: periodStart,
            period_end: periodEnd,
            is_active: true,
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export const getActiveBudget = async () => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('user_budgets')
        .select('*')
        .eq('user_id', user.data.user.id)
        .eq('is_active', true)
        .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
}

export const getBudgetTransactions = async (budgetId: string) => {
    const { data, error } = await supabase
        .from('budget_transactions')
        .select(`
      *,
      food_analysis_history (
        *,
        food_items (*)
      )
    `)
        .eq('budget_id', budgetId)
        .order('transaction_date', { ascending: false })

    if (error) throw error
    return data
}

export const getBudgetHistory = async () => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('user_budgets')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}
