import { useState } from "react";

interface FoodItem {
    name: string;
    calories: number;
    image: string;
}

interface MealAnalysisProps {
    mealImage: string;
    totalCalories: number;
    foodItems: FoodItem[];
    onClose: () => void;
}

export function MealAnalysis({ mealImage, totalCalories, foodItems, onClose }: MealAnalysisProps) {
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
                    <h1 className="text-white text-lg font-semibold">Meal Analysis</h1>
                    <div className="w-6"></div>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col px-4 pb-6 overflow-y-auto">

                    {/* Main Food Image */}
                    <div className="flex justify-center mb-4">
                        <div className="w-[256px] h-[256px] rounded-full ring-4 ring-white ring-inset shadow-[0_6px_18px_rgba(0,0,0,0.22)] overflow-hidden">
                            <img
                                src={mealImage}
                                alt="Meal"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Total Calories */}
                    <p className="text-center text-[#EDEFF1] text-xs font-medium mb-8">
                        Total Calories: {totalCalories}
                    </p>

                    {/* Food Items */}
                    <div className="flex flex-col gap-3 flex-1">
                        {foodItems.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center h-16 bg-[#EAF9EE] rounded-[14px] p-3 border-2 border-[#2ECC71]/20 shadow-[0_2px_6px_rgba(46,204,113,0.06)]"
                            >
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0"
                                />
                                <div className="flex-1">
                                    <p className="text-[#2C3D5D] text-base font-semibold leading-tight">
                                        {item.name}
                                    </p>
                                    <p className="text-[#588053] text-xs leading-tight">
                                        {item.calories} Cal
                                    </p>
                                </div>
                                <div className="w-10 h-10 flex-shrink-0"></div>
                            </div>
                        ))}
                    </div>
                </main>

                {/* Bottom Home Indicator */}
                <footer className="h-[34px] flex items-center justify-center">
                    <div className="w-32 h-[5px] bg-white/20 rounded-full"></div>
                </footer>

            </div>
        </div>
    );
}
