import { useNavigate } from "react-router-dom";
import { AlertCircle, ShoppingCart, Scale, MessageSquare, Check, Globe, Pill, TriangleAlert, Dna, HeartPulse } from "lucide-react";
import { useCurrency } from "../lib/CurrencyContext";

interface ProductDetailsProps {
    productImage: string;
    productName: string;
    servingSize?: string;
    description?: string;
    vitamins_and_nutrition?: string;
    recommendation?: string;
    recommended_pairings?: string;
    healthStatus?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sugar?: number;
    fiber?: number;
    origin_country?: string;
    brand?: string;
    manufacturer?: string;
    estimated_price?: string | number;
    is_compliant?: boolean;
    user_alignment_boolean?: boolean;
    political_warning?: string;
    cheaper_alternatives?: Array<{ name: string; price: string | number; reason: string }>;
    // Medication-specific fields
    type?: string;
    generic_name?: string;
    purpose?: string;
    side_effects?: string;
    warnings?: string;
    interactions?: string;
    onClose: () => void;
    onAddToDiary: () => void;
}

const ChevronLeft = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
    </svg>
);

export function ProductDetails({
    productImage,
    productName,
    servingSize,
    description,
    vitamins_and_nutrition,
    recommendation,
    recommended_pairings,
    healthStatus,
    calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0,
    sugar,
    fiber,
    origin_country,
    brand,
    manufacturer,
    estimated_price,
    is_compliant,
    user_alignment_boolean,
    political_warning,
    cheaper_alternatives,
    type,
    generic_name,
    purpose,
    side_effects,
    warnings,
    interactions,
    onClose,
    onAddToDiary,
}: ProductDetailsProps) {
    const navigate = useNavigate();
    const { formatCurrency } = useCurrency();
    const isEthical = !political_warning;
    const isMedication = type === 'medication';

    const handleConsultCoach = () => {
        navigate('/chat', {
            state: {
                initialMessage: isMedication
                    ? `I just scanned ${productName} (${generic_name}). Can you tell me more and whether it's safe given my health profile?`
                    : `I just scanned ${productName}. Tell me more about this product and whether it fits my health goals.`
            }
        });
    };

    const renderParagraphs = (text: string | undefined) => {
        if (!text) return null;
        return text.split('\n\n').filter(p => p.trim()).map((para, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                {para}
            </p>
        ));
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xl p-0 sm:p-4">
            <div className="w-full max-w-md sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col bg-white dark:bg-[#0a0f14] max-h-screen sm:max-h-[92vh] rounded-t-[2.5rem]">

                {/* POLITICAL ALERT — Red Banner (Highest Priority) */}
                {political_warning && (
                    <div className="bg-rose-600 py-4 px-6 flex items-start gap-3 shrink-0">
                        <AlertCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />
                        <div>
                            <p className="text-white text-[12px] font-black uppercase tracking-wider mb-1">
                                ⚠️ Ethical Responsibility Alert
                            </p>
                            <p className="text-white/90 text-[12px] leading-relaxed">
                                {political_warning}
                            </p>
                        </div>
                    </div>
                )}

                {/* ETHICAL CLEAR Banner */}
                {isEthical && user_alignment_boolean && (
                    <div className="bg-[#0a2e52] py-3 px-6 flex items-center justify-center gap-2 shrink-0">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        <span className="text-white text-[11px] font-black uppercase tracking-[0.2em]">
                            Ethically Clear · Personalized Match
                        </span>
                    </div>
                )}

                {/* Header Image */}
                <div className="relative h-52 shrink-0">
                    <img src={productImage} className="w-full h-full object-cover" alt={productName} />
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0a0f14] via-black/20 to-transparent" />
                    <button
                        onClick={onClose}
                        className="absolute top-5 left-5 p-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/60 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>

                    {/* Country & Brand Badges */}
                    <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                        {origin_country && (
                            <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full border border-white/10 flex items-center gap-1">
                                <Globe className="w-3 h-3" /> {origin_country}
                            </span>
                        )}
                        {brand && (
                            <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full border border-white/10">
                                {brand}
                            </span>
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto px-7 pb-4 space-y-8 -mt-8 relative z-10 custom-scrollbar">

                    {/* 1. Product Name & Manufacturer */}
                    <div>
                        <h2 className="text-[26px] font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                            {productName}
                        </h2>
                        {manufacturer && (
                            <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5">
                                <ShoppingCart className="w-3.5 h-3.5" />
                                {manufacturer}
                            </p>
                        )}
                    </div>

                    {/* 2. Description Paragraphs */}
                    {description && (
                        <div className="space-y-4">
                            {renderParagraphs(description)}
                        </div>
                    )}

                    {/* 3. Vitamins and Nutrition */}
                    {vitamins_and_nutrition && (
                        <div className="space-y-4">
                            <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight border-b border-slate-100 dark:border-white/8 pb-2">
                                Vitamins and Nutrition
                            </h3>
                            <div className="space-y-4">
                                {renderParagraphs(vitamins_and_nutrition)}
                            </div>
                        </div>
                    )}

                    {/* 4. Recommended Enhancements */}
                    {recommended_pairings && (
                        <div className="space-y-4">
                            <h3 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight border-b border-slate-100 dark:border-white/8 pb-2">
                                Recommended
                            </h3>
                            <div className="space-y-4">
                                {renderParagraphs(recommended_pairings)}
                            </div>
                        </div>
                    )}

                    {/* MEDICATION ANALYSIS SECTION */}
                    {isMedication ? (
                        <div className="space-y-5">
                            {generic_name && (
                                <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                                    <Pill className="w-5 h-5 text-purple-400 shrink-0" />
                                    <p className="text-sm text-slate-300">Generic Name: <span className="font-bold text-white">{generic_name}</span></p>
                                </div>
                            )}
                            {purpose && (
                                <div className="space-y-2">
                                    <h3 className="text-[14px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-2"><Dna className="w-4 h-4" /> Purpose</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">{purpose}</p>
                                </div>
                            )}
                            {warnings && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                                    <h3 className="text-[13px] font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-2"><TriangleAlert className="w-4 h-4" /> Warnings</h3>
                                    <p className="text-sm text-amber-200/80 leading-relaxed">{warnings}</p>
                                </div>
                            )}
                            {side_effects && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                                    <h3 className="text-[13px] font-bold text-rose-300 uppercase tracking-wider mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Side Effects</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">{side_effects}</p>
                                </div>
                            )}
                            {interactions && (
                                <div className="p-4 bg-slate-800/60 border border-white/10 rounded-2xl">
                                    <h3 className="text-[13px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-2"><HeartPulse className="w-4 h-4" /> Drug Interactions</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">{interactions}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                    /* 5. Calorie & Macro Summary — Food Products */
                    <div className="bg-slate-900 dark:bg-white/5 rounded-3xl p-6 text-center border border-slate-800 dark:border-white/10">
                        <div className="text-4xl font-black text-white mb-1">~{calories} kcal</div>
                        <div className="text-sm font-bold text-slate-400 tracking-wider mb-4">
                            P: {protein}g &nbsp;•&nbsp; F: {fat}g &nbsp;•&nbsp; C: {carbs}g
                        </div>
                        <div className="flex justify-center flex-wrap gap-2">
                            {sugar != null && (
                                <span className="px-3 py-1 bg-rose-500/10 text-rose-400 text-xs font-bold rounded-full">Sugar {sugar}g</span>
                            )}
                            {fiber != null && (
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full">Fiber {fiber}g</span>
                            )}
                            {estimated_price && (
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full flex items-center gap-1">
                                    <ShoppingCart className="w-3 h-3" />
                                    {formatCurrency(estimated_price)} (market est.)
                                </span>
                            )}
                        </div>
                    </div>
                    )}

                    {/* Personalized Recommendation */}
                    {recommendation && (
                        <div className="p-5 bg-[#0a2e52]/10 dark:bg-[#0a2e52]/20 border border-[#0a2e52]/20 rounded-2xl">
                            <p className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-300 italic">
                                {recommendation}
                            </p>
                        </div>
                    )}

                    {/* Smart Alternatives (when political warning) */}
                    {cheaper_alternatives && cheaper_alternatives.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-[13px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                {political_warning ? '🔄 Ethical Alternatives' : 'Smart Alternatives'}
                            </h3>
                            <div className="space-y-2">
                                {cheaper_alternatives.map((alt, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                        <div>
                                            <p className="text-[14px] font-black text-slate-900 dark:text-white">{alt.name}</p>
                                            <p className="text-[11px] text-slate-500">{alt.reason}</p>
                                        </div>
                                        <span className="text-[13px] font-black text-emerald-500">{formatCurrency(alt.price)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>

                    {/* Footer Actions */}
                <div className="px-7 py-6 shrink-0 bg-white dark:bg-[#0a0f14] border-t border-slate-100 dark:border-white/5 space-y-3">
                    <div className="flex gap-3">
                        {!political_warning && !isMedication && (
                            <button
                                onClick={onAddToDiary}
                                className="flex-1 py-4 bg-[#0a2e52] text-white rounded-[1.5rem] font-black text-[15px] active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2"
                            >
                                <Scale className="w-5 h-5" />
                                Log Product
                            </button>
                        )}
                        {political_warning && !isMedication && (
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <AlertCircle className="w-5 h-5" />
                                Avoid Product
                            </button>
                        )}
                        <button
                            onClick={handleConsultCoach}
                            className={`flex-1 py-4 rounded-[1.5rem] font-black text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isMedication ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white'}`}
                        >
                            <MessageSquare className="w-5 h-5" />
                            {isMedication ? 'Ask Health Coach' : 'Ask Coach'}
                        </button>
                    </div>
                </div>

                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    .dark\\:border-white\\/8 { border-color: rgba(255,255,255,0.08); }
                `}</style>
            </div>
        </div>
    );
}
