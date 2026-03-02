import { useState } from "react";
import { useTranslation } from "@/lib/api/translation";

interface ProductDetailsProps {
    productImage: string;
    productName: string;
    servingSize: string;
    healthStatus: "GOOD" | "MODERATE" | "POOR";
    country?: string;
    expiry?: string;
    calories: number;
    ai_insight?: string;
    ingredient_quality?: string;
    macro_balance_evaluation?: string;
    health_impact_rationale?: string;
    financialImpact?: "LOW" | "MODERATE" | "HIGH";
    currentBalance?: number;
    alternatives?: string[]; // Better UI for suggestions
    onClose: () => void;
    onAddToDiary: () => void;
}

export function ProductDetails({
    productImage,
    productName,
    servingSize,
    healthStatus,
    country = "N/A",
    expiry = "N/A",
    calories,
    ai_insight,
    ingredient_quality,
    macro_balance_evaluation,
    health_impact_rationale,
    financialImpact,
    currentBalance,
    alternatives = [],
    onClose,
    onAddToDiary,
}: ProductDetailsProps) {
    const { t } = useTranslation();
    const healthColors = {
        GOOD: { bg: "#E5F5E4", text: "#4CAF50" },
        MODERATE: { bg: "#FFF3E0", text: "#FF9800" },
        POOR: { bg: "#FFEBEE", text: "#F44336" },
    };

    const getImpactColor = (impact?: string) => {
        if (impact === 'LOW') return "text-emerald-400";
        if (impact === 'HIGH') return "text-rose-400";
        return "text-amber-400";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative mx-auto flex w-full max-w-md h-[90vh] flex-col overflow-hidden bg-gradient-to-b from-[#3A4B6B] to-[#2C3D5D] rounded-3xl shadow-2xl">
                <div className="relative z-10 flex h-full w-full flex-col p-6 pb-8 pt-8 text-white overflow-y-auto custom-scrollbar">
                    {/* Header */}
                    <header className="flex items-center justify-between mb-4">
                        <button
                            onClick={onClose}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">
                                arrow_back_ios_new
                            </span>
                        </button>
                        <h1 className="text-lg font-semibold">{t('product_details')}</h1>
                        <div className="w-10"></div>
                    </header>

                    {/* Main Content */}
                    <main className="flex flex-col gap-6">
                        {/* Product Image */}
                        <div className="relative aspect-video w-full rounded-2xl bg-white shadow-xl overflow-hidden">
                            <img
                                alt={productName}
                                className="h-full w-full object-cover"
                                src={productImage}
                            />
                            {/* Health Status Badge */}
                            <div
                                className="absolute top-4 left-4 flex h-8 items-center justify-center rounded-full px-4 shadow-sm backdrop-blur-md"
                                style={{ backgroundColor: `${healthColors[healthStatus].bg}CC` }}
                            >
                                <span
                                    className="font-bold text-xs uppercase"
                                    style={{ color: healthColors[healthStatus].text }}
                                >
                                    {healthStatus} CHOICE
                                </span>
                            </div>
                        </div>

                        {/* Product Info Card */}
                        <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex justify-between items-center">
                            <div className="flex-1 border-r border-white/10 p-2 text-center">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('calories')}</p>
                                <p className="text-lg font-bold">{calories}</p>
                            </div>
                            <div className="flex-1 border-r border-white/10 p-2 text-center">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('balance')}</p>
                                <p className="text-lg font-bold">${currentBalance?.toFixed(2)}</p>
                            </div>
                            <div className="flex-1 p-2 text-center">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Impact</p>
                                <p className={`text-lg font-bold ${getImpactColor(financialImpact)}`}>{financialImpact}</p>
                            </div>
                        </div>

                        {/* Title & Insight */}
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-bold">{productName}</h2>
                            <span className="text-white/60 text-sm font-medium">{servingSize}</span>

                            {ai_insight && (
                                <div className="mt-2 bg-[#2ECC71]/10 border border-[#2ECC71]/20 rounded-xl p-4 flex gap-3">
                                    <span className="material-symbols-outlined text-[#2ECC71]">verified_user</span>
                                    <p className="text-sm italic text-white/90 leading-relaxed font-medium">
                                        "{ai_insight}"
                                    </p>
                                </div>
                            )}

                            {/* Clinical Evaluation Layer */}
                            {(ingredient_quality || macro_balance_evaluation || health_impact_rationale) && (
                                <div className="mt-4 space-y-3 bg-black/20 rounded-2xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="material-symbols-outlined text-[16px] text-blue-400">clinical_notes</span>
                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Clinical Analysis</span>
                                    </div>

                                    {ingredient_quality && (
                                        <div>
                                            <span className="block text-[8px] font-bold text-white/30 uppercase mb-0.5">Ingredient Quality</span>
                                            <p className="text-xs text-white/80 leading-snug">{ingredient_quality}</p>
                                        </div>
                                    )}

                                    {macro_balance_evaluation && (
                                        <div>
                                            <span className="block text-[8px] font-bold text-white/30 uppercase mb-0.5">Macro Balance</span>
                                            <p className="text-xs text-white/80 leading-snug">{macro_balance_evaluation}</p>
                                        </div>
                                    )}

                                    {health_impact_rationale && (
                                        <div className="pt-2 border-t border-white/5">
                                            <p className="text-[10px] italic text-white/60 leading-tight">{health_impact_rationale}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* AI Alternatives */}
                        {alternatives && alternatives.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">{t('healthier_alternatives')}</h3>
                                <div className="flex flex-col gap-2">
                                    {alternatives.map((alt, idx) => (
                                        <div key={idx} className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-vic-green/20 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-vic-green text-sm">restaurant</span>
                                            </div>
                                            <span className="text-sm text-white/90">{alt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* Footer */}
                    <footer className="mt-8 pb-4">
                        <button
                            onClick={onAddToDiary}
                            className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#2ECC71] shadow-[0_8px_20px_rgba(46,204,113,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <span className="text-lg font-black text-white">
                                {t('log_product')}
                            </span>
                        </button>
                    </footer>
                </div>
            </div>
        </div>
    );
}
