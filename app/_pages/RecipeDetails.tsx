"use client"
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { AlertCircle, ArrowLeft, Volume2, Mic } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getRecipeDetails, toggleFavoriteRecipe } from "@/lib/api/recipes";
import { useTranslation } from "@/lib/api/translation";
import { toast } from "sonner";

export default function RecipeDetails() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { lang } = useTranslation();

    const pathname = usePathname();
    const initialData = undefined;

    // Fetch recipe details
    const { data: recipe, isLoading } = useQuery<any>({
        queryKey: ['recipe', id],
        queryFn: () => getRecipeDetails(id!),
        enabled: !!id,
        initialData: initialData,
        retry: false
    });

    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(20 * 60); // Default 20 mins
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize timer when recipe loads
    useEffect(() => {
        if (recipe) {
            const totalMinutes = (recipe.prep_time_minutes || 10) + (recipe.cook_time_minutes || 10);
            setTimeLeft(totalMinutes * 60);
        }
    }, [recipe]);

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

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Speak helper
    const speak = (text: string) => {
        if (!text) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'id' ? 'id-ID' : 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    // Toggle favorite mutation
    const favoriteMutation = useMutation({
        mutationFn: () => toggleFavoriteRecipe(user!.id, id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipe', id] });
            toast.success("Favorites updated");
        }
    });

    // Safety timeout: If loading takes too long, force show error or fallback
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isLoading && !recipe) {
            timeout = setTimeout(() => {
                if (isLoading) {
                    toast.error("Loading taking longer than expected...");
                }
            }, 8000);
        }
        return () => clearTimeout(timeout);
    }, [isLoading, recipe]);

    if (isLoading && !recipe) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#FDFBF7] dark:bg-[#0d1418]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8B4513]"></div>
            </div>
        );
    }

    if (!recipe && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#FDFBF7] dark:bg-[#0d1418] p-8 text-center">
                <div className="size-24 bg-vic-pink/10 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="text-vic-pink" size={44} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Recipe not found</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xs">
                    We couldn't load this recipe. It might have been removed or there was a connection error.
                </p>
                <div className="flex flex-col w-full max-w-xs gap-3">
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['recipe', id] })}
                        className="py-4 bg-vic-green text-slate-900 font-bold rounded-2xl shadow-lg"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="py-4 text-slate-500 font-bold"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col h-screen max-w-2xl mx-auto w-full bg-[#FDFBF7] dark:bg-[#0d1418] overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10">
                <button
                    onClick={() => router.back()}
                    className="size-10 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-full text-white"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-sm font-bold tracking-widest uppercase text-[#8B4513] bg-[#FDFBF7]/90 px-4 py-1 rounded-full shadow-sm">
                    {recipe.title}
                </h1>
                <div className="size-10"></div>
            </header>

            {/* Main Content Scrollable */}
            <main className="flex-1 overflow-y-auto no-scrollbar">

                {/* Image Section (Plate) */}
                <section className="relative h-[45vh] bg-[#E8E8E8] dark:bg-[#1a1a1a] flex items-center justify-center">
                    {/* Background Blur Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl"
                        style={{ backgroundImage: `url(${recipe.image_url})` }}
                    />

                    {/* Main Circular Plate Image */}
                    <div className="relative size-64 rounded-full border-8 border-white dark:border-[#2a2a2a] shadow-2xl overflow-hidden z-0">
                        <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </section>

                {/* Brown Details Card */}
                <section className="relative bg-[#8B4513] text-[#FDFBF7] min-h-[55vh] rounded-t-[40px] -mt-8 p-8 pb-32 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">

                    {/* Timer Circle Floating/Absolute */}
                    <button
                        onClick={toggleTimer}
                        className="absolute right-8 -top-12 size-24 bg-[#5D2E0C] border-4 border-[#FDFBF7] rounded-full flex flex-col items-center justify-center shadow-xl hover:scale-105 transition-transform active:scale-95"
                    >
                        <span className="text-xl font-bold font-mono">{formatTime(timeLeft)}</span>
                        <span className="text-[9px] uppercase tracking-wide opacity-80">
                            {isTimerRunning ? 'Pause' : 'Start Timer'}
                        </span>
                    </button>

                    {/* Ingredients Header */}
                    <h2 className="text-2xl font-serif font-bold mb-6">Ingredients</h2>

                    {/* Ingredients List */}
                    <div className="space-y-4 mb-10">
                        {recipe.ingredients?.map((ing: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-4">
                                <div className="size-10 bg-[#A05C2B] rounded-full flex items-center justify-center shrink-0">
                                    {/* Simple icon logic based on name */}
                                    <span className="text-xl opacity-80">
                                        {ing.item?.toLowerCase().includes('salt') ? '🧂' :
                                            ing.item?.toLowerCase().includes('toast') || ing.item?.toLowerCase().includes('bread') ? '🍞' :
                                                ing.item?.toLowerCase().includes('avocado') ? '🥑' :
                                                    '🍽️'}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-medium leading-none">{ing.amount} {ing.unit} {ing.item}</p>
                                    <p className="text-sm opacity-60 mt-1">{ing.notes || ""}</p>
                                </div>
                            </div>
                        ))}
                        {(!recipe.ingredients || recipe.ingredients.length === 0) && (
                            <p className="opacity-60 italic">No ingredients listed.</p>
                        )}
                    </div>

                    {/* Steps Header */}
                    <h2 className="text-2xl font-serif font-bold mb-6">Steps</h2>

                    {/* Steps List */}
                    <div className="space-y-8 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-[#A05C2B]/50" />

                        {recipe.instructions?.map((step: string, idx: number) => (
                            <div key={idx} className="relative flex gap-6 group">
                                <div className="size-10 rounded-full bg-[#D4A373] text-[#5D2E0C] font-bold text-lg flex items-center justify-center shrink-0 z-10 border-4 border-[#8B4513]">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 pt-1">
                                    <p className="text-lg leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity">
                                        {step}
                                    </p>
                                    <button
                                        onClick={() => speak(step)}
                                        className="mt-2 text-[#D4A373] text-sm flex items-center gap-1 hover:text-white"
                                    >
                                        <Volume2 size={16} />
                                        Listen
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!recipe.instructions || recipe.instructions.length === 0) && (
                            <p className="opacity-60 italic">No instructions available.</p>
                        )}
                    </div>

                </section>
            </main>

            {/* Voice Command Footer (Optional/Floating) */}
            <div className="absolute bottom-8 right-8 z-20">
                <div className="flex flex-col items-center gap-1">
                    <Mic className="text-white drop-shadow-md animate-bounce" size={36} />
                    <span className="text-[10px] text-white font-bold opacity-80 uppercase tracking-wider drop-shadow-md">Voice Commands</span>
                </div>
            </div>
        </div>
    );
}
