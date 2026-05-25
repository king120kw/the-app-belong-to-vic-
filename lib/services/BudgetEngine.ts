export interface BudgetData {
    id: string;
    total_budget: number;
    remaining_budget: number;
    period_start: string;
    period_end: string;
}

export const getDynamicDailyBudget = (budget: BudgetData | null) => {
    if (!budget) return 0;

    const today = new Date();
    const end = new Date(budget.period_end);
    
    // Ensure we don't calculate for past dates
    if (today > end) return 0;

    const diffTime = Math.abs(end.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return budget.remaining_budget;

    // Dynamic daily spending target based on remaining budget and remaining days
    const dailyAllocation = budget.remaining_budget / diffDays;
    
    return Math.max(0, Number(dailyAllocation.toFixed(2)));
};
