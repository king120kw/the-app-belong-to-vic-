"use client"
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    AlertCircle, ArrowLeft, Volume2, Mic, Play, Pause, 
    ChevronRight, ChevronLeft, Timer, Flame, Droplets, 
    Wheat, Beef, Share2, Heart 
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getRecipeDetails, toggleFavoriteRecipe } from "@/lib/api/recipes";
import { useTranslation } from "@/lib/api/translation";
import { toast } from "sonner";
import { FavoriteButton } from "@/components/FavoriteButton";

export default function RecipeDetails() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { lang } = useTranslation();

    // Voice State
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Timer State
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch recipe details
    const { data: recipe, isLoading } = useQuery<any>({
        queryKey: ['recipe', id],
        queryFn: () => getRecipeDetails(id!),
        enabled: !!id,
        retry: 1
    });

    useEffect(() => {
        if (recipe) {
            setTimeLeft((recipe.prep_time_minutes || 10) * 60);
        }
    }, [recipe]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const toggleTimer = () => {
        if (isTimerRunning) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
        } else {
            setIsTimerRunning(true);
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        setIsTimerRunning(false);
                        toast.success("Timer finished!");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    };

    // Voice Interaction
    const speak = (text: string) => {
        if (!text) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'id' ? 'id-ID' : 'en-US';
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    const startVoiceGuidance = () => {
        setIsVoiceMode(true);
        const welcome = lang === 'id' 
            ? `Halo! Saya asisten masak Anda. Mari kita buat ${recipe.title}. Langkah pertama: ${recipe.instructions[0]}`
            : `Hello! I'm your personal chef. Let's make ${recipe.title}. Step one: ${recipe.instructions[0]}`;
        speak(welcome);
        setCurrentStepIdx(0);
    };

    const nextStep = () => {
        if (currentStepIdx < (recipe.instructions?.length || 0) - 1) {
            const nextIdx = currentStepIdx + 1;
            setCurrentStepIdx(nextIdx);
            speak(recipe.instructions[nextIdx]);
        } else {
            speak(lang === 'id' ? "Selesai! Selamat menikmati makanan Anda." : "All done! Enjoy your meal.");
            setIsVoiceMode(false);
        }
    };

    const prevStep = () => {
        if (currentStepIdx > 0) {
            const nextIdx = currentStepIdx - 1;
            setCurrentStepIdx(nextIdx);
            speak(recipe.instructions[nextIdx]);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0d1418]">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="size-20 bg-vic-green/20 rounded-full mb-4" />
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-white dark:bg-[#0d1418]">
                <AlertCircle className="text-vic-pink mb-4" size={48} />
                <h2 className="text-xl font-bold mb-2">Recipe Missing</h2>
                <button onClick={() => router.back()} className="text-vic-green font-bold">Go Back</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen max-w-2xl mx-auto w-full bg-white dark:bg-[#0d1418] overflow-hidden">
            {/* Immersive Header */}
            <div className="relative h-80 shrink-0">
                <img 
                    src={recipe.image_url} 
                    alt={recipe.title} 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
                    <button onClick={() => router.back()} className="size-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex gap-2">
                        <button className="size-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                            <Share2 size={18} />
                        </button>
                        <FavoriteButton recipeId={id} className="relative !bg-white/20 !backdrop-blur-md" />
                    </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex gap-2 mb-2">
                        {recipe.dietary_tags?.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="text-[10px] font-bold uppercase tracking-widest bg-vic-green text-slate-900 px-2 py-1 rounded">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">
                        {recipe.title}
                    </h1>
                </div>
            </div>

            {/* Content Dashboard */}
            <main className="flex-1 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-[#0d1418] rounded-t-[40px] -mt-10 relative z-10 p-6">
                
                {/* Nutritional Dashboard */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-[#1f2c34] p-3 rounded-2xl shadow-sm text-center">
                        <Flame className="mx-auto text-vic-orange mb-1" size={20} />
                        <div className="text-lg font-black dark:text-white leading-none">{recipe.total_calories || 0}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kcal</div>
                    </div>
                    <div className="bg-white dark:bg-[#1f2c34] p-3 rounded-2xl shadow-sm text-center">
                        <Beef className="mx-auto text-vic-red mb-1" size={20} />
                        <div className="text-lg font-black dark:text-white leading-none">{recipe.protein_g || 0}g</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Prot</div>
                    </div>
                    <div className="bg-white dark:bg-[#1f2c34] p-3 rounded-2xl shadow-sm text-center">
                        <Wheat className="mx-auto text-vic-green mb-1" size={20} />
                        <div className="text-lg font-black dark:text-white leading-none">{recipe.carbs_g || 0}g</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Carb</div>
                    </div>
                    <div className="bg-white dark:bg-[#1f2c34] p-3 rounded-2xl shadow-sm text-center">
                        <Droplets className="mx-auto text-vic-blue mb-1" size={20} />
                        <div className="text-lg font-black dark:text-white leading-none">{recipe.fat_g || 0}g</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fat</div>
                    </div>
                </div>

                <div className="flex gap-4 mb-8">
                    <div className="flex-1 bg-white dark:bg-[#1f2c34] p-4 rounded-3xl shadow-sm flex items-center gap-4">
                        <div className="size-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-500">
                            <Timer size={24} />
                        </div>
                        <div>
                            <div className="text-sm font-black dark:text-white leading-none">
                                {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} MIN
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total Time</div>
                        </div>
                    </div>
                    <div className="flex-1 bg-white dark:bg-[#1f2c34] p-4 rounded-3xl shadow-sm flex items-center gap-4">
                        <div className="size-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-500">
                            <Timer size={24} />
                        </div>
                        <div>
                            <div className="text-sm font-black dark:text-white leading-none">
                                {recipe.servings || 2} PERS
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Servings</div>
                        </div>
                    </div>
                </div>

                {/* Voice Guidance Toggle */}
                <button 
                    onClick={startVoiceGuidance}
                    className="w-full bg-vic-green text-slate-900 py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 mb-8 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Mic size={20} />
                    Start Voice Guidance
                </button>

                {/* Ingredients */}
                <h3 className="text-xl font-black dark:text-white mb-4 uppercase tracking-tight">Ingredients</h3>
                <div className="bg-white dark:bg-[#1f2c34] rounded-3xl p-6 shadow-sm mb-8">
                    <div className="space-y-4">
                        {recipe.ingredients?.map((ing: any, i: number) => (
                            <div key={i} className="flex justify-between items-center border-b border-slate-50 dark:border-white/5 pb-3 last:border-none">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">{ing.item}</span>
                                <span className="text-sm font-black dark:text-white">{ing.amount} {ing.unit}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Instructions */}
                <h3 className="text-xl font-black dark:text-white mb-4 uppercase tracking-tight">Instructions</h3>
                <div className="space-y-6 mb-20">
                    {recipe.instructions?.map((step: string, i: number) => (
                        <div key={i} className="flex gap-4">
                            <div className="size-8 rounded-xl bg-vic-green/10 text-vic-green flex items-center justify-center font-black shrink-0">
                                {i + 1}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                                {step}
                            </p>
                        </div>
                    ))}
                </div>
            </main>

            {/* Voice Guidance Mode Overlay */}
            {isVoiceMode && (
                <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col p-8 text-white">
                    <div className="flex justify-between items-center mb-12">
                        <div className="flex flex-col">
                            <h2 className="text-vic-green font-black uppercase tracking-widest text-xs">Cooking Mode</h2>
                            <p className="text-2xl font-black uppercase tracking-tighter">{recipe.title}</p>
                        </div>
                        <button onClick={() => setIsVoiceMode(false)} className="size-10 bg-white/10 rounded-full flex items-center justify-center">
                            <AlertCircle size={20} />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="size-32 bg-vic-green/20 rounded-full flex items-center justify-center mb-12 animate-pulse">
                            <Mic className="text-vic-green" size={48} />
                        </div>
                        
                        <div className="mb-4 text-vic-green font-black uppercase tracking-widest text-sm">
                            Step {currentStepIdx + 1} of {recipe.instructions.length}
                        </div>
                        
                        <p className="text-3xl font-black leading-tight uppercase tracking-tighter mb-8">
                            {recipe.instructions[currentStepIdx]}
                        </p>

                        <div className="flex items-center gap-8">
                            <button onClick={prevStep} disabled={currentStepIdx === 0} className="size-16 bg-white/10 rounded-full flex items-center justify-center disabled:opacity-20">
                                <ChevronLeft size={32} />
                            </button>
                            <button onClick={() => speak(recipe.instructions[currentStepIdx])} className="size-24 bg-vic-green text-slate-900 rounded-full flex items-center justify-center">
                                {isSpeaking ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" />}
                            </button>
                            <button onClick={nextStep} className="size-16 bg-white/10 rounded-full flex items-center justify-center">
                                <ChevronRight size={32} />
                            </button>
                        </div>
                    </div>

                    {/* Timer in Voice Mode */}
                    <div className="mt-auto flex flex-col items-center bg-white/5 p-6 rounded-3xl">
                        <div className="text-4xl font-black font-mono mb-2">{formatTime(timeLeft)}</div>
                        <button onClick={toggleTimer} className="text-xs font-black uppercase tracking-widest text-vic-green">
                            {isTimerRunning ? "Pause Timer" : "Start 20:00 Timer"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
