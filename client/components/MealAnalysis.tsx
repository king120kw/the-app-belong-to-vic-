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
    packaging_details?: string;
    portion_size_estimate?: string;
    country_of_origin?: string;
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

                    {/* Stats & Health Status */}
                    <div className="flex flex-col items-center mb-6">
                        <div className={`px-4 py-8 rounded-2xl bg-white/5 border border-white/10 w-full flex flex-col items-center shadow-inner relative overflow-hidden`}>
                            {/* Small Gauge for Visual Polish */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
                                <div
                                    className="h-full bg-[#2ECC71] transition-all duration-1000"
                                    style={{ width: `${Math.min((totalCalories / dailyCalorieGoal) * 100, 100)}%`, backgroundColor: getCalorieColor(totalCalories).replace('text-', '') === '[#2ECC71]' ? '#2ECC71' : getCalorieColor(totalCalories).includes('F1C40F') ? '#F1C40F' : '#E74C3C' }}
                                ></div>
                            </div>

                            <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Estimated Energy</span>
                            <p className={`text-4xl font-bold ${getCalorieColor(totalCalories)}`}>
                                {totalCalories} <span className="text-sm font-medium opacity-70">kcal</span>
                            </p>
                        </div>
                    </div>

                    {/* Food Items & Breakdown */}
                    <div className="flex flex-col gap-4 flex-1">
                        {foodItems.map((item, index) => (
                            <div key={index} className="flex flex-col gap-2">
                                {/* Item Card */}
                                <div className={`flex items-center h-20 rounded-2xl p-4 shadow-lg border-2 ${getStatusBg(item.healthStatus)} transition-all`}>
                                    <div className="relative">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-12 h-12 rounded-xl object-cover mr-4 ring-2 ring-white/50 shadow-md"
                                        />
                                        {item.healthStatus && (
                                            <div className={`absolute -top-1 -right-1 size-4 rounded-full border-2 border-white flex items-center justify-center ${getStatusBadge(item.healthStatus)} shadow-sm`}>
                                                <span className="material-symbols-outlined text-[10px] font-bold">
                                                    {item.healthStatus === 'GOOD' ? 'check' : item.healthStatus === 'POOR' ? 'close' : 'warning'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-[#2C3D5D] text-lg font-bold leading-tight line-clamp-1">
                                                {item.name}
                                            </p>
                                        </div>
                                        <div className="flex gap-3 mt-1">
                                            <span className="text-[#588053] text-[10px] font-bold px-2 py-0.5 bg-black/5 rounded-full uppercase">
                                                {item.calories} {t('cal_unit')}
                                            </span>
                                            {item.healthStatus && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${item.healthStatus === 'GOOD' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                                                    {item.healthStatus} CHOICE
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Advanced Details (Portion & Packaging) */}
                                {(item.portion_size_estimate || item.packaging_details || item.country_of_origin) && (
                                    <div className="flex gap-2 px-1">
                                        {item.portion_size_estimate && (
                                            <div className="flex-1 bg-white/5 rounded-lg p-2 border border-white/5 flex flex-col">
                                                <span className="text-[8px] font-bold text-white/40 uppercase mb-0.5">Portion</span>
                                                <span className="text-[10px] text-white font-medium line-clamp-1">{item.portion_size_estimate}</span>
                                            </div>
                                        )}
                                        {item.packaging_details && (
                                            <div className="flex-1 bg-white/5 rounded-lg p-2 border border-white/5 flex flex-col">
                                                <span className="text-[8px] font-bold text-white/40 uppercase mb-0.5">Package</span>
                                                <span className="text-[10px] text-white font-medium line-clamp-1">{item.packaging_details}</span>
                                            </div>
                                        )}
                                        {item.country_of_origin && (
                                            <div className="flex-1 bg-white/5 rounded-lg p-2 border border-white/5 flex flex-col">
                                                <span className="text-[8px] font-bold text-white/40 uppercase mb-0.5">Origin</span>
                                                <span className="text-[10px] text-white font-medium line-clamp-1">{item.country_of_origin}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Personalized Insight */}
                                {item.personalizedAdvice && (
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/5 shadow-sm mx-1">
                                        <div className="flex gap-2 items-start">
                                            <span className="material-symbols-outlined text-vic-green text-sm pt-0.5">verified_user</span>
                                            <p className="text-white/90 text-xs italic leading-snug">
                                                "{item.personalizedAdvice}"
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Macro Breakdown */}
                                <div className="grid grid-cols-4 gap-2 px-1">
                                    {[
                                        { label: 'Prot', val: item.protein, color: 'bg-blue-400' },
                                        { label: 'Carb', val: item.carbs, color: 'bg-amber-400' },
                                        { label: 'Fat', val: item.fat, color: 'bg-rose-400' },
                                        { label: 'Fib', val: item.fiber, color: 'bg-emerald-400' }
                                    ].map((macro, i) => (
                                        <div key={i} className="flex flex-col items-center bg-white/5 rounded-lg py-1.5 border border-white/5">
                                            <span className="text-[8px] font-black text-white/40 uppercase mb-0.5">{macro.label}</span>
                                            <span className="text-xs font-bold text-white">{macro.val ?? 0}g</span>
                                            <div className={`w-6 h-0.5 ${macro.color} rounded-full mt-1 opacity-60`}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
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
