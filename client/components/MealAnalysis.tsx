import { useState } from "react";
import { useTranslation } from "@/lib/api/translation";

interface FoodItem {
    name: string;
    calories: number;
    image: string;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    portion_size_estimate?: string;
    portion_assumptions?: string;
    clinical_evaluation?: {
        macronutrient_distribution: string;
        glycemic_load: string;
        lipid_density: string;
        sodium_concerns: string;
        protein_quality: string;
        fiber_adequacy: string;
    };
    metabolic_impact?: string;
    clinical_synopsis?: string;
    health_impact_score?: number;
    healthRating?: number;
    confidence_level?: number;
    healthStatus?: 'GOOD' | 'MODERATE' | 'POOR';
    personalizedAdvice?: string;
}

interface MealAnalysisProps {
    mealImage: string;
    heroImage?: string;
    totalCalories: number;
    dailyCalorieGoal?: number;
    foodItems: FoodItem[];
    onClose: () => void;
    onLog: () => void;
}

export function MealAnalysis({ mealImage, heroImage, totalCalories, dailyCalorieGoal = 2000, foodItems, onClose, onLog }: MealAnalysisProps) {
    const { t } = useTranslation();

    // Color logic for calories based on daily goal
    const getCalorieColor = (cals: number) => {
        const percentage = (cals / dailyCalorieGoal) * 100;
        if (percentage < 30) return "text-[#2ECC71]"; // Green: < 30% of daily goal
        if (percentage < 50) return "text-[#F1C40F]"; // Yellow: 30-50% of daily goal
        return "text-[#E74C3C]"; // Red: > 50% of daily goal
    };

    const getStatusBg = (status?: string) => {
        if (status === 'GOOD') return "bg-[#EAF9EE] border-[#2ECC71]/20";
        if (status === 'POOR') return "bg-[#FDF2F2] border-[#E74C3C]/20";
        return "bg-[#FFF9EA] border-[#F1C40F]/20";
    };

    const getStatusBadge = (status?: string) => {
        if (status === 'GOOD') return "bg-[#2ECC71] text-white";
        if (status === 'POOR') return "bg-[#E74C3C] text-white";
        return "bg-[#F1C40F] text-white";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[375px] h-[812px] bg-[#2C3D5D] rounded-[18px] shadow-2xl overflow-hidden flex flex-col">

                {/* Status Bar Space */}
                <div className="h-[48px]"></div>

                {/* Header */}
                <header className="h-[56px] flex items-center justify-between px-4">
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-white text-lg font-semibold">{t('meal_analysis')}</h1>
                    <div className="w-6"></div>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col px-4 pb-6 overflow-y-auto custom-scrollbar">

                    {/* Main Food Image (The actual photo) */}
                    <div className="flex justify-center mb-4 px-2">
                        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black/20 relative shadow-xl border border-white/10">
                            <img
                                src={mealImage}
                                alt="Captured Meal"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex justify-between items-end">
                                <span className="text-white text-[10px] font-bold uppercase tracking-widest opacity-80">Device Capture</span>
                                {totalCalories > 0 && (
                                    <div className="flex flex-col items-end">
                                        <span className="text-white/60 text-[8px] font-bold uppercase tracking-widest">Goal Progress</span>
                                        <span className="text-white text-xs font-black">{Math.round((totalCalories / dailyCalorieGoal) * 100)}%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Stats Row (Image 2 Style) */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-[#EAF9EE] rounded-[32px] p-6 flex flex-col items-center justify-center shadow-sm border border-[#2ECC71]/10">
                            <span className="text-[#0D1B1E]/40 text-[10px] font-black uppercase tracking-widest mb-2">Calories</span>
                            <div className="text-[36px] font-black text-[#0D1B1E] leading-none">
                                {totalCalories || 0}
                            </div>
                        </div>
                        <div className="bg-[#FFF9EA] rounded-[32px] p-6 flex flex-col items-center justify-center shadow-sm border border-[#F1C40F]/10">
                            <span className="text-[#E67E22]/60 text-[10px] font-black uppercase tracking-widest mb-2 text-center leading-tight">Health Impact</span>
                            <div className="text-[36px] font-black text-[#E67E22] leading-none">
                                {foodItems[0]?.healthRating || 5}/10
                            </div>
                        </div>
                    </div>

                    {/* Quick Macro Row */}
                    <div className="bg-white/5 rounded-[24px] p-4 flex justify-around mb-6 border border-white/5">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-white/40 uppercase mb-1">Carbs</span>
                            <span className="text-sm font-bold text-white">{foodItems[0]?.carbs || 0}g</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-white/40 uppercase mb-1">Fat</span>
                            <span className="text-sm font-bold text-white">{foodItems[0]?.fat || 0}g</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-white/40 uppercase mb-1">Fiber</span>
                            <span className="text-sm font-bold text-white">{foodItems[0]?.fiber || 0}g</span>
                        </div>
                    </div>

                    {/* Clinical Synopsis (The "Meat" of the analysis) */}
                    <div className="bg-white rounded-[32px] p-6 mb-6 shadow-xl border border-white flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[#8696A0] uppercase tracking-widest">Clinical Synopsis</span>
                        </div>
                        <p className="text-[#0D1B1E] text-[15px] leading-[1.6] font-medium">
                            {foodItems[0]?.personalizedAdvice || "Analyzing nutritional components and metabolic pathways..."}
                        </p>
                    </div>

                    {/* Advanced Clinical Details Grid */}
                    {foodItems[0]?.clinical_evaluation && (
                        <div className="bg-white/5 rounded-3xl p-5 border border-white/5 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-[16px] text-blue-400">clinical_notes</span>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Deep Analysis Breakdown</span>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <span className="text-[10px] font-bold text-white/30 uppercase">Glycemic Load</span>
                                    <span className="text-xs text-white/80 font-medium">{foodItems[0].clinical_evaluation.glycemic_load}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <span className="text-[10px] font-bold text-white/30 uppercase">Macronutrient</span>
                                    <span className="text-xs text-white/80 font-medium text-right max-w-[180px]">{foodItems[0].clinical_evaluation.macronutrient_distribution}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                    <span className="text-[10px] font-bold text-white/30 uppercase">Lipid Density</span>
                                    <span className="text-xs text-white/80 font-medium">{foodItems[0].clinical_evaluation.lipid_density}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-white/30 uppercase">Protein Quality</span>
                                    <span className="text-xs text-white/80 font-medium">{foodItems[0].clinical_evaluation.protein_quality}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* Action Button */}
                <div className="px-4 py-4 mb-2 bg-[#2C3D5D]/80 backdrop-blur-xl border-t border-white/5">
                    <button
                        onClick={onLog}
                        className="w-full h-14 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-[20px] font-black text-lg shadow-[0_8px_20px_rgba(46,204,113,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">add_task</span>
                        {t('log_this_meal')}
                    </button>
                </div>

                {/* Bottom Home Indicator */}
                <footer className="h-[34px] flex items-center justify-center">
                    <div className="w-32 h-[5px] bg-white/20 rounded-full"></div>
                </footer>

            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
