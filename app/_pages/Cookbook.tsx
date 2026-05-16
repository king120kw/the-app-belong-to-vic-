"use client"
import { useState, useEffect } from "react";
import Link from "next/link"
import { ArrowLeft, Search, Coffee, Utensils, ChefHat, Cookie, GlassWater, Candy, Heart, Star, Flame, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { searchRecipes, getDailyMealSuggestions, getCookbookSuggestions } from "@/lib/api/recipes";
import { useTranslation } from "@/lib/api/translation";
import FoodCarousel from "@/components/FoodCarousel";
import { FavoriteButton } from "@/components/FavoriteButton";
import { getFavoriteRecipes } from "@/lib/api/recipes";

const CATEGORIES = [
    { id: 'breakfast', label: 'Breakfast', icon: Coffee },
    { id: 'lunch', label: 'Lunch', icon: Utensils },
    { id: 'dinner', label: 'Dinner', icon: ChefHat },
    { id: 'snacks', label: 'Snacks', icon: Cookie },
    { id: 'drinks', label: 'Drinks', icon: GlassWater },
    { id: 'desserts', label: 'Desserts', icon: Candy },
] as const;

export default function Cookbook() {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "for you" | "favorites">("for you");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [currentSession, setCurrentSession] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
    const { t } = useTranslation();

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11) setCurrentSession('breakfast');
        else if (hour >= 11 && hour < 16) setCurrentSession('lunch');
        else setCurrentSession('dinner');
    }, []);

    const { data: cookbookData } = useQuery({
        queryKey: ['cookbook-suggestions', user?.id],
        queryFn: () => getCookbookSuggestions(user!.id),
        enabled: !!user?.id
    });

    const { data: suggestions } = useQuery({
        queryKey: ['suggestions', user?.id],
        queryFn: () => getDailyMealSuggestions(user!.id),
        enabled: !!user?.id
    });

    const { data: favorites } = useQuery({
        queryKey: ['favorite-recipes', user?.id],
        queryFn: () => getFavoriteRecipes(user!.id),
        enabled: !!user?.id && activeTab === 'favorites'
    });

    const { data: searchResults } = useQuery({
        queryKey: ['recipes-search', searchQuery],
        queryFn: () => searchRecipes(searchQuery),
        enabled: searchQuery.length > 2
    });

    return (
        <div className="flex flex-col h-screen max-w-2xl mx-auto w-full bg-slate-50 dark:bg-[#0d1418]">
            <header className="p-6 bg-white dark:bg-[#0d1418] sticky top-0 z-20">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/dashboard" className="text-slate-900 dark:text-white">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Cookbook</h1>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search recipes, ingredients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-[#1f2c34] rounded-2xl border-none focus:ring-2 focus:ring-vic-green text-slate-900 dark:text-white font-medium placeholder:text-slate-400"
                    />
                </div>

                {!searchQuery && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Categories</h2>
                            <span className="text-[10px] font-black text-vic-green uppercase tracking-widest">Swipe for more</span>
                        </div>
                        <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 -mx-6 px-6">
                            {CATEGORIES.map(cat => {
                                const isMainMeal = ['breakfast', 'lunch', 'dinner'].includes(cat.id);
                                // For main meals, we might want to highlight the current session but show all?
                                // User said "ensure daily tailored meal suggestions load correctly... for Breakfast, Lunch, Dinner, Snacks, Drinks, and Desserts"
                                
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`flex flex-col items-center justify-center min-w-[100px] aspect-square p-4 rounded-[24px] border-2 transition-all shrink-0 ${selectedCategory === cat.id ? 'border-vic-green bg-vic-green/10 shadow-lg shadow-vic-green/10' : 'border-transparent bg-white dark:bg-[#1f2c34] shadow-sm hover:scale-105'}`}
                                    >
                                        <div className={`p-3 rounded-2xl ${selectedCategory === cat.id ? 'bg-vic-green text-white' : 'bg-slate-100 dark:bg-black/20 text-vic-green'}`}>
                                            <cat.icon size={24} />
                                        </div>
                                        <span className={`text-[11px] mt-3 font-bold uppercase tracking-wide ${selectedCategory === cat.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex gap-6 border-b border-slate-200 dark:border-white/10">
                    {(['all', 'for you', 'favorites'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setSelectedCategory(null); }}
                            className={`pb-3 text-sm font-bold capitalize transition-all relative ${activeTab === tab && !selectedCategory
                                ? 'text-vic-green' 
                                : 'text-slate-400'}`}
                        >
                            {tab === 'all' ? 'All Recipes' : tab}
                            {activeTab === tab && !selectedCategory && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-vic-green rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="space-y-6">
                    {searchQuery ? (
                        <div className="grid grid-cols-1 gap-6">
                            {searchResults?.map((recipe: any) => (
                                <CookbookCard key={recipe.id} item={recipe} />
                            ))}
                        </div>
                    ) : selectedCategory ? (
                        <div className="grid grid-cols-1 gap-4">
                            {((cookbookData as any)?.[selectedCategory] || []).map((meal: any, index: number) => (
                                <CookbookCard key={`${meal.id}-${index}`} item={meal} />
                            ))}
                        </div>
                    ) : activeTab === "favorites" ? (
                        <div className="grid grid-cols-1 gap-4">
                            {favorites && favorites.length > 0 ? (
                                favorites.map((fav: any) => (
                                    <CookbookCard key={fav.id} item={fav.recipes} />
                                ))
                            ) : (
                                <div className="text-center py-24 text-slate-400 italic">
                                    <Heart className="mx-auto mb-4 opacity-20" size={48} />
                                    <p>Your saved recipes will appear here.</p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === "for you" ? (
                        <div className="space-y-8 -mx-6">
                            <FoodCarousel 
                                breakfastMeals={suggestions?.breakfast}
                                lunchMeals={suggestions?.lunch}
                                dinnerMeals={suggestions?.dinner}
                                initialMealType={currentSession}
                            />
                            
                            <div className="px-6">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Snacks & More</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {[...(suggestions?.snacks || []), ...(suggestions?.drinks || []), ...(suggestions?.desserts || [])].map((meal: any, index: number) => (
                                        <CookbookCard key={`${meal.id}-${index}`} item={meal} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {/* In "All" tab, show everything or prompt search */}
                            {[...(suggestions?.breakfast || []), ...(suggestions?.lunch || []), ...(suggestions?.dinner || [])].map((meal: any, index: number) => (
                                <CookbookCard key={`${meal.id}-${index}`} item={meal} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="h-20" />
            </main>
        </div>
    );
}

function CookbookCard({ item }: { item: any }) {
    if (!item) return null;
    const id = item.internal_id || item.id;
    const title = item.title || item.name || "Untitled Recipe";
    const image = item.image_url || item.image;
    const calories = item.total_calories || item.calories;
    const time = item.prep_time_minutes || item.prep_time || "20";

    return (
        <div className="relative group w-full h-64 rounded-[32px] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500">
            <Link href={`/recipe/${id}`} className="block w-full h-full">
                <img 
                    src={image} 
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300'; }}
                    alt={title} 
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                
                {/* Calories Pill */}
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white tracking-wide">
                    {calories} Cal
                </div>

                {/* Bottom Content */}
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div className="flex-1 pr-4">
                        <h3 className="text-xl font-black text-white leading-tight mb-1 line-clamp-2">{title}</h3>
                        <p className="text-sm text-white/90 font-medium">{time} Minutes</p>
                    </div>
                    <div className="bg-[#a5e076] text-[#1c2e22] px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shadow-sm hover:bg-[#92cc63] transition-colors">
                        View Recipe
                    </div>
                </div>
            </Link>
            <FavoriteButton recipeId={id} className="absolute top-4 left-4" />
        </div>
    );
}
